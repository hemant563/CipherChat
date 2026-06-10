import { Router } from 'express';
import { askAssistant, getSmartReplies } from '../controllers/ai.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

// All AI routes require authentication
router.use(authenticate);

router.post('/ask', askAssistant);
router.post('/smart-replies', getSmartReplies);

export default router;
