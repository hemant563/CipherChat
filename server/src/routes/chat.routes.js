import { Router } from 'express';
import * as chatController from '../controllers/chat.controller.js';
import * as chatValidator from '../validators/chat.validator.js';
import validate from '../middlewares/validate.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

// All chat routes require authentication
router.use(authenticate);

// List conversations
router.get('/', chatController.getConversations);

// Messages within a conversation
router.route('/:conversationId/messages')
  .get(validate(chatValidator.getMessages), chatController.getMessages)
  .post(validate(chatValidator.sendMessage), chatController.sendMessage)
  .delete(chatController.clearConversation);

// Specific message actions
router.route('/messages/:messageId')
  .patch(validate(chatValidator.editMessage), chatController.editMessage);

router.post('/messages/:messageId/react', validate(chatValidator.reactToMessage), chatController.reactToMessage);

// Chat Lock
router.post('/:conversationId/toggle-lock', chatController.toggleChatLock);

export default router;
