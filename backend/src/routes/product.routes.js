import express from 'express';
const router = express.Router();
import authenticate from '../middlewares/authenticate.js';
import authorize from '../middlewares/authorize.js';
import * as productController from '../controllers/product.controller.js';
import { upload } from '../utils/upload.js';

// ──────────────────────────────────────────────────────────────
// Product Routes — /api/v1/products
// ──────────────────────────────────────────────────────────────

// Public routes
router.get('/', productController.listProducts);
router.get('/:id', productController.getProduct);

// Protected routes — Create / Update / Delete
router.post(
    '/',
    authenticate,
    authorize('VENDOR', 'ADMIN'),
    productController.createProduct
);

// VULNERABLE: Missing ownership check in authorize — any vendor can update/delete any product
// Maps to: OWASP A01:2021 – Broken Access Control
router.put(
    '/:id',
    authenticate,
    authorize('VENDOR', 'ADMIN'),
    productController.updateProduct
);

router.delete(
    '/:id',
    authenticate,
    authorize('VENDOR', 'ADMIN'),
    productController.deleteProduct
);

// File upload routes
// VULNERABLE: Unrestricted file upload — no MIME type or extension check
// Maps to: PortSwigger – File Upload Vulnerabilities
router.post(
    '/:id/images',
    authenticate,
    authorize('VENDOR', 'ADMIN'),
    upload.array('images', 10), // up to 10 files
    productController.uploadProductImages
);

// SSRF-vulnerable endpoint — fetch image from URL
router.post(
    '/:id/images/url',
    authenticate,
    authorize('VENDOR', 'ADMIN'),
    productController.fetchProductImageFromUrl
);

export default router;
