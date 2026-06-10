import { Router } from 'express';
import { purchasePremium, getPremiumStatus } from '../controllers/premium.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate); // All premium routes require authentication

router.get('/status', getPremiumStatus);
router.post('/purchase', purchasePremium);

export default router;
