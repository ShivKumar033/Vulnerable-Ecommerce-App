import { Router } from 'express';
import authenticate from '../middlewares/authenticate.js';
import authorize from '../middlewares/authorize.js';
import * as accountDeletionController from '../controllers/accountDeletion.controller.js';

const router = Router();

// User routes - own account deletion
router.post('/delete-account', authenticate, accountDeletionController.requestAccountDeletion);
router.get('/deletion-status', authenticate, accountDeletionController.getDeletionStatus);

// Admin routes - manage deletion requests
router.get('/admin/deletion-requests', authenticate, authorize('ADMIN'), accountDeletionController.listDeletionRequests);
router.put('/admin/deletion-requests/:id/approve', authenticate, authorize('ADMIN'), accountDeletionController.approveDeletionRequest);
router.put('/admin/deletion-requests/:id/reject', authenticate, authorize('ADMIN'), accountDeletionController.rejectDeletionRequest);

export default router;

