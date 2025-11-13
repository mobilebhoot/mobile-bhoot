/**
 * OTP API Routes
 * Real SMS & WhatsApp OTP endpoints
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const router = express.Router();

const otpService = require('../services/productionOtpService');
const logger = require('../utils/logger');
const { validatePhoneNumber, validateOTP } = require('../utils/validation');

// Strict rate limiting for OTP endpoints
const otpRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each IP to 3 OTP requests per windowMs
  message: {
    error: 'Too many OTP requests from this IP',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by IP + phone number combination
    return `${req.ip}_${req.body.phoneNumber || 'unknown'}`;
  }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     OTPRequest:
 *       type: object
 *       required:
 *         - phoneNumber
 *       properties:
 *         phoneNumber:
 *           type: string
 *           description: Indian mobile number (10 digits)
 *           example: "9876543210"
 *         enableSMS:
 *           type: boolean
 *           description: Enable SMS delivery
 *           default: true
 *         enableWhatsApp:
 *           type: boolean
 *           description: Enable WhatsApp delivery
 *           default: true
 *         templateId:
 *           type: string
 *           description: SMS template ID (for MSG91)
 *     
 *     OTPVerification:
 *       type: object
 *       required:
 *         - phoneNumber
 *         - otp
 *       properties:
 *         phoneNumber:
 *           type: string
 *           description: Indian mobile number (10 digits)
 *           example: "9876543210"
 *         otp:
 *           type: string
 *           description: 6-digit OTP code
 *           example: "123456"
 */

/**
 * @swagger
 * /api/otp/send:
 *   post:
 *     summary: Send OTP via SMS and WhatsApp
 *     tags: [OTP]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OTPRequest'
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 channels:
 *                   type: array
 *                   items:
 *                     type: object
 *                 expiresIn:
 *                   type: number
 *       400:
 *         description: Invalid request data
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
router.post('/send', 
  otpRateLimit,
  [
    body('phoneNumber')
      .notEmpty()
      .withMessage('Phone number is required')
      .custom((value) => {
        if (!validatePhoneNumber(value)) {
          throw new Error('Invalid Indian mobile number format');
        }
        return true;
      }),
    body('enableSMS')
      .optional()
      .isBoolean()
      .withMessage('enableSMS must be boolean'),
    body('enableWhatsApp')
      .optional()
      .isBoolean()
      .withMessage('enableWhatsApp must be boolean'),
    body('templateId')
      .optional()
      .isString()
      .withMessage('templateId must be string')
  ],
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { phoneNumber, enableSMS = true, enableWhatsApp = true, templateId } = req.body;
      const ipAddress = req.ip;

      logger.info(`OTP send request from ${ipAddress} for ${phoneNumber}`);

      // Send OTP
      const result = await otpService.sendOTP(phoneNumber, ipAddress, {
        enableSMS,
        enableWhatsApp,
        templateId
      });

      // Log the attempt
      logger.security.otpRequest(
        phoneNumber, 
        ipAddress, 
        result.channels?.map(c => c.channel) || [], 
        result.success
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);

    } catch (error) {
      logger.error('Send OTP error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * @swagger
 * /api/otp/verify:
 *   post:
 *     summary: Verify OTP code
 *     tags: [OTP]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OTPVerification'
 *     responses:
 *       200:
 *         description: OTP verification result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 phoneNumber:
 *                   type: string
 *       400:
 *         description: Invalid OTP or validation error
 *       500:
 *         description: Internal server error
 */
router.post('/verify',
  [
    body('phoneNumber')
      .notEmpty()
      .withMessage('Phone number is required')
      .custom((value) => {
        if (!validatePhoneNumber(value)) {
          throw new Error('Invalid Indian mobile number format');
        }
        return true;
      }),
    body('otp')
      .notEmpty()
      .withMessage('OTP is required')
      .custom((value) => {
        if (!validateOTP(value)) {
          throw new Error('Invalid OTP format (must be 6 digits)');
        }
        return true;
      })
  ],
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { phoneNumber, otp } = req.body;
      const ipAddress = req.ip;

      logger.info(`OTP verify request from ${ipAddress} for ${phoneNumber}`);

      // Verify OTP
      const result = await otpService.verifyOTP(phoneNumber, otp, ipAddress);

      // Log the attempt
      logger.security.otpVerification(
        phoneNumber,
        ipAddress,
        result.success,
        result.attempts || 0
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);

    } catch (error) {
      logger.error('Verify OTP error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * @swagger
 * /api/otp/resend:
 *   post:
 *     summary: Resend OTP (with cooldown check)
 *     tags: [OTP]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OTPRequest'
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *       400:
 *         description: Cooldown period active or validation error
 *       429:
 *         description: Rate limit exceeded
 */
router.post('/resend',
  otpRateLimit,
  [
    body('phoneNumber')
      .notEmpty()
      .withMessage('Phone number is required')
      .custom((value) => {
        if (!validatePhoneNumber(value)) {
          throw new Error('Invalid Indian mobile number format');
        }
        return true;
      })
  ],
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { phoneNumber, enableSMS = true, enableWhatsApp = true } = req.body;
      const ipAddress = req.ip;

      logger.info(`OTP resend request from ${ipAddress} for ${phoneNumber}`);

      // Send OTP with resend flag
      const result = await otpService.sendOTP(phoneNumber, ipAddress, {
        enableSMS,
        enableWhatsApp,
        resend: true
      });

      // Log the attempt
      logger.security.otpRequest(
        phoneNumber,
        ipAddress,
        result.channels?.map(c => c.channel) || [],
        result.success
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);

    } catch (error) {
      logger.error('Resend OTP error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * @swagger
 * /api/otp/status/{phoneNumber}:
 *   get:
 *     summary: Get OTP delivery status
 *     tags: [OTP]
 *     parameters:
 *       - in: path
 *         name: phoneNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: Indian mobile number
 *     responses:
 *       200:
 *         description: OTP status information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [active, expired, not_found, error]
 *                 timeRemaining:
 *                   type: number
 *                 attempts:
 *                   type: number
 *                 maxAttempts:
 *                   type: number
 *       400:
 *         description: Invalid phone number
 */
router.get('/status/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    if (!validatePhoneNumber(phoneNumber)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format'
      });
    }

    const status = await otpService.getDeliveryStatus(phoneNumber);
    res.json(status);

  } catch (error) {
    logger.error('Get OTP status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/otp/health:
 *   get:
 *     summary: Check OTP service health
 *     tags: [OTP]
 *     responses:
 *       200:
 *         description: Service health status
 */
router.get('/health', async (req, res) => {
  try {
    // Check Redis connectivity
    const redisHealth = await otpService.redis.ping();
    
    // Check API configurations
    const smsConfigured = !!(process.env.MSG91_AUTH_KEY || process.env.TEXTLOCAL_API_KEY);
    const whatsappConfigured = !!(process.env.GUPSHUP_API_KEY || process.env.WHATSAPP_ACCESS_TOKEN);

    res.json({
      status: 'healthy',
      redis: redisHealth === 'PONG' ? 'connected' : 'disconnected',
      sms: smsConfigured ? 'configured' : 'not_configured',
      whatsapp: whatsappConfigured ? 'configured' : 'not_configured',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('OTP service health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
