import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import * as userValidator from '../validators/user.validator.js';
import validate from '../middlewares/validate.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// Profile
router.get('/me', userController.getMe);
router.delete('/me', userController.deleteAccount);
router.patch('/me', validate(userValidator.updateProfile), userController.updateMe);
router.patch('/me/settings', validate(userValidator.updateSettings), userController.updateSettings);
router.post('/me/keys', validate(userValidator.uploadPublicKey), userController.updatePublicKey);

// Search & Get specific users
router.get('/search', validate(userValidator.searchUsers), userController.searchUsers);
router.get('/:username', validate(userValidator.getProfile), userController.getUserProfile);

// Blocking
router.post('/block/:userId', validate(userValidator.blockUser), userController.blockUser);
router.delete('/block/:userId', validate(userValidator.blockUser), userController.unblockUser);

// Chat Lock
router.post('/chat-pin/setup', userController.setupChatLockPin);
router.post('/chat-pin/verify', userController.verifyChatLockPin);

export default router;
