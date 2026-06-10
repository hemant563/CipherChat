import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import * as authValidator from '../validators/auth.validator.js';
import validate from '../middlewares/validate.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authLimiter, otpLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

router.post('/send-otp', otpLimiter, validate(authValidator.sendOtp), authController.sendOtp);
router.post('/verify-otp', otpLimiter, validate(authValidator.verifyOtp), authController.verifyOtp);
router.post('/register', authLimiter, validate(authValidator.register), authController.register);
router.post('/login', authLimiter, validate(authValidator.login), authController.login);
router.post('/reset-password', authLimiter, validate(authValidator.resetPassword), authController.resetPassword);
router.post('/refresh-token', validate(authValidator.refreshToken), authController.refreshTokens);
router.post('/logout', authenticate, authController.logout);
router.get('/check-username', validate(authValidator.checkUsername), authController.checkUsernameAvailability);

export default router;
