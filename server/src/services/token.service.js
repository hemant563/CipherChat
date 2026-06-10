import jwt from 'jsonwebtoken';
import env from '../config/env.js';

/**
 * Service to handle JWT generation and verification.
 */
class TokenService {
  /**
   * Generates an access token.
   * @param {string} userId
   * @returns {string} JWT Access Token
   */
  static generateAccessToken(userId) {
    return jwt.sign({ id: userId }, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRY,
    });
  }

  /**
   * Generates a refresh token.
   * @param {string} userId
   * @returns {string} JWT Refresh Token
   */
  static generateRefreshToken(userId) {
    return jwt.sign({ id: userId }, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRY,
    });
  }

  /**
   * Generates both access and refresh tokens.
   * @param {string} userId
   * @returns {Object} { accessToken, refreshToken }
   */
  static generateAuthTokens(userId) {
    const accessToken = this.generateAccessToken(userId);
    const refreshToken = this.generateRefreshToken(userId);
    return { accessToken, refreshToken };
  }

  /**
   * Verifies a refresh token.
   * @param {string} token
   * @returns {Object} Decoded payload
   */
  static verifyRefreshToken(token) {
    return jwt.verify(token, env.JWT_REFRESH_SECRET);
  }
}

export default TokenService;
