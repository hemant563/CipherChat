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
    if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REFRESH_TOKEN) {
      try {
        // 1. Get a fresh Access Token using the Refresh Token
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: env.GOOGLE_CLIENT_ID,
            client_secret: env.GOOGLE_CLIENT_SECRET,
            refresh_token: env.GOOGLE_REFRESH_TOKEN,
            grant_type: 'refresh_token',
          }),
        });

        if (!tokenResponse.ok) {
          const errData = await tokenResponse.json();
          logger.error(`Google Token Error: ${JSON.stringify(errData)}`);
          throw new Error('Failed to refresh Google Access Token');
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        // 2. Construct the raw email MIME string
        const emailContent = [
          'Content-Type: text/html; charset="UTF-8"',
          'MIME-Version: 1.0',
          `To: ${email}`,
          'From: "CipherChat Security" <cipherchat09@gmail.com>',
          'Subject: Your CipherChat Verification Code',
          '',
          `
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
          `
        ].join('\\r\\n');

        // 3. Base64url encode the string
        const encodedEmail = Buffer.from(emailContent)
          .toString('base64')
          .replace(/\\+/g, '-')
          .replace(/\\//g, '_')
          .replace(/=+$/, '');

        // 4. Send the email via Gmail API
        const sendResponse = await fetch('https://gmail.googleapis.com/upload/gmail/v1/users/me/messages/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ raw: encodedEmail }),
        });

        if (!sendResponse.ok) {
          const errData = await sendResponse.json();
          logger.error(`Gmail API Send Error: ${JSON.stringify(errData)}`);
          throw new Error('Gmail API request failed');
        }

        logger.info(`OTP email sent successfully to ${email} via Gmail API`);
        return true;
      } catch (error) {
        logger.error(`Failed to send OTP email via Gmail API to ${email}: ${error.message}`);
        throw new Error('Failed to send verification email. Please try again.');
      }
    }

    // Fallback to Nodemailer if Google Credentials are not provided (works locally but not on Render Free Tier)
    if (!env.SMTP_USER || !env.SMTP_PASS) {
      logger.warn(`[MOCK EMAIL] SMTP credentials missing. OTP ${otp} for ${email}`);
      return true;
    }

    try {
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
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
