import crypto from 'crypto';

/**
 * Server-side Encryption Service.
 * 
 * NOTE: True End-to-End Encryption (E2EE) requires encryption and decryption 
 * to happen on the client side. The server should never see the plain text 
 * of messages or the private keys.
 * 
 * This service provides utility functions if the backend needs to perform 
 * any server-side encryption (e.g., encrypting some sensitive database fields 
 * that are not E2EE, like API keys if applicable in the future).
 * It is mostly a placeholder/utility for standard AES encryption if needed.
 */
class EncryptionService {
  /**
   * Encrypts text using AES-256-CBC.
   * @param {string} text - Plain text to encrypt
   * @param {string} secretKey - 32-byte secret key (hex or string)
   * @returns {Object} { iv, encryptedData }
   */
  static encryptSymmetric(text, secretKey) {
    const key = crypto.scryptSync(secretKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      iv: iv.toString('hex'),
      encryptedData: encrypted
    };
  }

  /**
   * Decrypts text using AES-256-CBC.
   * @param {string} encryptedData - Hex encoded cipher text
   * @param {string} iv - Hex encoded IV
   * @param {string} secretKey - 32-byte secret key used for encryption
   * @returns {string} Decrypted plain text
   */
  static decryptSymmetric(encryptedData, iv, secretKey) {
    const key = crypto.scryptSync(secretKey, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(iv, 'hex'));
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

export default EncryptionService;
