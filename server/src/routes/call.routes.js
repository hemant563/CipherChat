import { Router } from 'express';
import * as callController from '../controllers/call.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/history', callController.getCallHistory);
router.post('/initiate', callController.initiateCall);
router.post('/:callId/answer', callController.answerCall);
router.post('/:callId/end', callController.endCall);

export default router;
