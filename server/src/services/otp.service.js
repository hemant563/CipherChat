import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import env from '../config/env.js';
import logger from '../utils/logger.js';

class OtpService {
  static generateOtp() {
    const length = env.OTP_LENGTH;
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, digits.length);
      otp += digits[randomIndex];
    }
    return otp;
  }

  static async hashOtp(otp) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(otp, salt);
  }

  static async verifyOtp(otp, hashedOtp) {
    return bcrypt.compare(otp, hashedOtp);
  }

  static async sendEmailOtp(email, otp) {
    if (!env.SMTP_USER || !env.SMTP_PASS) {
      logger.warn(`[MOCK EMAIL] SMTP credentials missing. OTP ${otp} for ${email}`);
      return true;
    }

    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });

      const mailOptions = {
        from: `"CipherChat Security" <${env.SMTP_USER}>`,
        to: email,
        subject: 'Your CipherChat Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #4f46e5;">CipherChat</h2>
            <p style="font-size: 16px; color: #475569;">Hello,</p>
            <p style="font-size: 16px; color: #475569;">Your verification code is:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #1e293b; padding: 20px; background-color: #f1f5f9; border-radius: 8px; margin: 20px 0;">
              ${otp}
            </div>
            <p style="font-size: 14px; color: #64748b;">This code will expire in ${env.OTP_EXPIRY_MINUTES} minutes.</p>
            <p style="font-size: 12px; color: #94a3b8; margin-top: 40px;">If you didn't request this code, please ignore this email.</p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      logger.info(`OTP email sent successfully to ${email}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send OTP email to ${email}: ${error.message}`);
      throw new Error('Failed to send verification email. Please try again.');
    }
  }
}

export default OtpService;
