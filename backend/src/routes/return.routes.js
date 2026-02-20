import { Router } from 'express';
import authenticate from '../middlewares/authenticate.js';
import * as returnController from '../controllers/return.controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// User routes
router.get('/', returnController.listReturnRequests);
router.post('/', returnController.createReturnRequest);
router.get('/:id', returnController.getReturnRequest);

// Admin/Vendor routes
router.put('/:id/approve', returnController.approveReturnRequest);
router.put('/:id/reject', returnController.rejectReturnRequest);
router.put('/:id/complete', returnController.completeReturnRequest);

export default router;

