import { Router } from 'express';
import {
  sendRequest,
  getRequests,
  acceptRequest,
  rejectRequest
} from '../controllers/contact.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.post('/request', sendRequest);
router.get('/requests', getRequests);
router.post('/accept/:id', acceptRequest);
router.post('/reject/:id', rejectRequest);

export default router;
