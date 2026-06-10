import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { authenticate, requireAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

// Secure admin routes
router.use(authenticate);
router.use(requireAdmin);

router.get('/stats', adminController.getStats);
router.get('/users', adminController.getUsers);
router.patch('/users/:userId/ban', adminController.toggleBanUser);
router.patch('/users/:userId/premium', adminController.togglePremiumUser);

export default router;
