import { Router } from 'express';
import { createOrder, verifyPayment, getPaymentHistory, insecureCheckout, markPaymentFailed } from '../controllers/payment.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate); // Require auth for all payment routes

router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);
router.get('/history', getPaymentHistory);
router.post('/fail', markPaymentFailed);
router.post('/insecure-checkout', insecureCheckout);

export default router;
