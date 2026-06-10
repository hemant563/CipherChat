import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import chatRoutes from './chat.routes.js';
import groupRoutes from './group.routes.js';
import callRoutes from './call.routes.js';
import notificationRoutes from './notification.routes.js';
import mediaRoutes from './media.routes.js';
import adminRoutes from './admin.routes.js';
import aiRoutes from './ai.routes.js';
import contactRoutes from './contact.routes.js';
import premiumRoutes from './premium.route.js';
import paymentRoutes from './payment.routes.js';

const router = Router();

// Health Check
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/chats', chatRoutes);
router.use('/groups', groupRoutes);
router.use('/calls', callRoutes);
router.use('/notifications', notificationRoutes);
router.use('/media', mediaRoutes);
router.use('/admin', adminRoutes);
router.use('/ai', aiRoutes);
router.use('/contacts', contactRoutes);
router.use('/premium', premiumRoutes);
router.use('/payment', paymentRoutes);

export default router;
