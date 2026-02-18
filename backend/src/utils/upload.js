import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ──────────────────────────────────────────────────────────────
// File Upload Configuration (Multer)
// ──────────────────────────────────────────────────────────────

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'public/uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024; // 10 MB

// Ensure upload directory exists
const absoluteUploadDir = path.resolve(__dirname, '../../', UPLOAD_DIR);
if (!fs.existsSync(absoluteUploadDir)) {
    fs.mkdirSync(absoluteUploadDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, absoluteUploadDir);
    },
    filename: (req, file, cb) => {
        // VULNERABLE: Unrestricted file upload — original filename is preserved.
        // An attacker can upload files with dangerous names (e.g. ../../../etc/passwd,
        // shell.php, etc.) and the filename is used as-is.
        // Maps to: OWASP A04:2021 – Insecure Design
        // PortSwigger – File Upload Vulnerabilities
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, ext);
        cb(null, `${baseName}-${uniqueSuffix}${ext}`);
    },
});

// VULNERABLE: No file type validation — accepts any MIME type.
// An attacker can upload .exe, .php, .html, .svg files.
// Maps to: OWASP A04:2021 – Insecure Design
// PortSwigger – File Upload Vulnerabilities (MIME bypass, web shell upload)
const fileFilter = (req, file, cb) => {
    // Accept all files — intentionally no validation
    cb(null, true);
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
    },
});

export { upload, UPLOAD_DIR, absoluteUploadDir };
