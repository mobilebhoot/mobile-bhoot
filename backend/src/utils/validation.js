/**
 * Validation utilities for PocketShield
 */

/**
 * Validate Indian mobile number
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} - True if valid
 */
const validatePhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return false;
  
  const cleanNumber = phoneNumber.toString().replace(/\D/g, '');
  
  // Indian mobile numbers: 10 digits starting with 6, 7, 8, or 9
  return /^[6-9]\d{9}$/.test(cleanNumber);
};

/**
 * Sanitize phone number by removing all non-digits
 * @param {string} phoneNumber - Phone number to sanitize
 * @returns {string} - Sanitized phone number
 */
const sanitizePhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return '';
  return phoneNumber.toString().replace(/\D/g, '');
};

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid
 */
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate OTP format
 * @param {string} otp - OTP to validate
 * @returns {boolean} - True if valid
 */
const validateOTP = (otp) => {
  return /^\d{6}$/.test(otp);
};

/**
 * Validate name format
 * @param {string} name - Name to validate
 * @returns {boolean} - True if valid
 */
const validateName = (name) => {
  if (!name || typeof name !== 'string') return false;
  
  const trimmedName = name.trim();
  return trimmedName.length >= 2 && trimmedName.length <= 50 && /^[a-zA-Z\s]+$/.test(trimmedName);
};

module.exports = {
  validatePhoneNumber,
  sanitizePhoneNumber,
  validateEmail,
  validateOTP,
  validateName
};
