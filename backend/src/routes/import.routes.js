import { Router } from 'express';
import authenticate from '../middlewares/authenticate.js';
import authorize from '../middlewares/authorize.js';
import * as exportController from '../controllers/export.controller.js';
import * as xmlImportController from '../controllers/xmlImport.controller.js';

const router = Router();

// ──────────────────────────────────────────────────────────────
// Import Routes
// ──────────────────────────────────────────────────────────────

// CSV Import (Admin/Vendor)
router.post('/products', authenticate, authorize('ADMIN', 'VENDOR'), exportController.importProductsCsv);

// XML Import (Admin/Vendor) - XXE Vulnerable
router.post('/products/xml', authenticate, authorize('ADMIN', 'VENDOR'), xmlImportController.importProductsXml);

// Get XML template
router.get('/products/xml/template', xmlImportController.getXmlTemplate);

export default router;
