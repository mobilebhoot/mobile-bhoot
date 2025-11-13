/**
 * Breach Detection API Routes
 * Have I Been Pwned integration for email and password security
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, query, validationResult } = require('express-validator');
const router = express.Router();

const breachDetectionService = require('../services/breachDetectionService');
const logger = require('../utils/logger');
const { validateEmail } = require('../utils/validation');

// Rate limiting for breach detection (HIBP has strict rate limits)
const breachRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 10, // Max 10 requests per minute
  message: {
    error: 'Too many breach detection requests. Please wait before trying again.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @swagger
 * components:
 *   schemas:
 *     EmailBreachCheck:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: Email address to check for breaches
 *           example: "user@example.com"
 *     
 *     PasswordCheck:
 *       type: object
 *       required:
 *         - password
 *       properties:
 *         password:
 *           type: string
 *           description: Password to check (sent securely via HTTPS)
 *           example: "mypassword123"
 *     
 *     ComprehensiveCheck:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "user@example.com"
 *         password:
 *           type: string
 *           description: Optional password to check
 *           example: "mypassword123"
 */

/**
 * @swagger
 * /api/breach/check-email:
 *   post:
 *     summary: Check if email address has been in data breaches
 *     tags: [Breach Detection]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmailBreachCheck'
 *     responses:
 *       200:
 *         description: Email breach check results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                     breached:
 *                       type: boolean
 *                     breachCount:
 *                       type: number
 *                     breaches:
 *                       type: array
 *                     riskLevel:
 *                       type: string
 *                       enum: [low, medium, high, critical]
 *                     message:
 *                       type: string
 *       400:
 *         description: Invalid email format
 *       429:
 *         description: Rate limit exceeded
 */
router.post('/check-email',
  breachRateLimit,
  [
    body('email')
      .isEmail()
      .withMessage('Invalid email format')
      .normalizeEmail()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { email } = req.body;
      const ipAddress = req.ip;

      logger.info(`Breach check request for email from ${ipAddress}`);

      // Check email breaches
      const result = await breachDetectionService.checkEmailBreaches(email);

      // Log security event
      logger.security.breachCheck(email, ipAddress, result.breached, result.breachCount);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Email breach check error:', error);
      
      if (error.message.includes('Rate limit')) {
        return res.status(429).json({
          success: false,
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to check email breaches',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @swagger
 * /api/breach/check-password:
 *   post:
 *     summary: Check if password has been compromised (k-anonymity)
 *     tags: [Breach Detection]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PasswordCheck'
 *     responses:
 *       200:
 *         description: Password compromise check results
 *       400:
 *         description: Password too short or invalid
 */
router.post('/check-password',
  breachRateLimit,
  [
    body('password')
      .isLength({ min: 4 })
      .withMessage('Password must be at least 4 characters long')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { password } = req.body;
      const ipAddress = req.ip;

      logger.info(`Password compromise check from ${ipAddress}`);

      // Check password compromise
      const result = await breachDetectionService.checkPasswordCompromised(password);

      // Log security event (don't log the actual password)
      logger.security.passwordCheck(ipAddress, result.compromised, result.occurrences);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Password check error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to check password security',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @swagger
 * /api/breach/comprehensive-check:
 *   post:
 *     summary: Comprehensive security check for email and optional password
 *     tags: [Breach Detection]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ComprehensiveCheck'
 *     responses:
 *       200:
 *         description: Comprehensive security analysis
 */
router.post('/comprehensive-check',
  breachRateLimit,
  [
    body('email')
      .isEmail()
      .withMessage('Invalid email format')
      .normalizeEmail(),
    body('password')
      .optional()
      .isLength({ min: 4 })
      .withMessage('Password must be at least 4 characters long if provided')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { email, password } = req.body;
      const ipAddress = req.ip;

      logger.info(`Comprehensive security check from ${ipAddress}`);

      // Comprehensive security check
      const result = await breachDetectionService.comprehensiveSecurityCheck(email, password);

      // Log comprehensive security event
      logger.security.comprehensiveCheck(
        email,
        ipAddress,
        result.securityScore,
        result.overallRisk
      );

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Comprehensive security check error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to perform comprehensive security check',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @swagger
 * /api/breach/check-pastes:
 *   post:
 *     summary: Check for paste records (requires API key)
 *     tags: [Breach Detection]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmailBreachCheck'
 *     responses:
 *       200:
 *         description: Paste records check results
 *       403:
 *         description: API key required
 */
router.post('/check-pastes',
  breachRateLimit,
  [
    body('email')
      .isEmail()
      .withMessage('Invalid email format')
      .normalizeEmail()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { email } = req.body;
      const ipAddress = req.ip;

      logger.info(`Paste check request for email from ${ipAddress}`);

      // Check pastes
      const result = await breachDetectionService.checkPastes(email);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Paste check error:', error);
      
      if (error.message.includes('API key required')) {
        return res.status(403).json({
          success: false,
          error: 'API key required for paste checking feature'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to check paste records',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @swagger
 * /api/breach/service-stats:
 *   get:
 *     summary: Get breach detection service statistics
 *     tags: [Breach Detection]
 *     responses:
 *       200:
 *         description: Service statistics and capabilities
 */
router.get('/service-stats', (req, res) => {
  try {
    const stats = breachDetectionService.getServiceStats();
    
    res.json({
      success: true,
      data: {
        ...stats,
        hibpWebsite: 'https://haveibeenpwned.com/',
        description: 'Have I Been Pwned integration for PocketShield',
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Service stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get service statistics'
    });
  }
});

/**
 * @swagger
 * /api/breach/health:
 *   get:
 *     summary: Check breach detection service health
 *     tags: [Breach Detection]
 *     responses:
 *       200:
 *         description: Service health status
 */
router.get('/health', async (req, res) => {
  try {
    // Test with a known safe email (no breaches expected)
    const testResult = await breachDetectionService.checkEmailBreaches('test@example.com');
    
    res.json({
      status: 'healthy',
      service: 'Have I Been Pwned Integration',
      lastCheck: new Date().toISOString(),
      apiAccessible: true,
      rateLimit: 'Active',
      features: {
        emailBreachCheck: true,
        passwordCheck: true,
        comprehensiveCheck: true,
        pasteCheck: !!process.env.HIBP_API_KEY
      }
    });

  } catch (error) {
    logger.error('Breach service health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      service: 'Have I Been Pwned Integration',
      error: error.message,
      lastCheck: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/breach/clear-cache:
 *   post:
 *     summary: Clear breach detection cache (admin only)
 *     tags: [Breach Detection]
 *     responses:
 *       200:
 *         description: Cache cleared successfully
 *       403:
 *         description: Admin access required
 */
router.post('/clear-cache', (req, res) => {
  // Basic admin check (you should implement proper admin authentication)
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_API_KEY) {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }

  try {
    breachDetectionService.clearCache();
    
    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });

  } catch (error) {
    logger.error('Cache clear error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache'
    });
  }
});

// Add security logging methods to logger
logger.security = {
  ...logger.security,
  
  breachCheck: (email, ip, breached, breachCount) => {
    logger.info('Breach Check', {
      email: email.replace(/(.{2}).*@/, '$1***@'), // Partially mask email
      ip,
      breached,
      breachCount,
      timestamp: new Date().toISOString()
    });
  },
  
  passwordCheck: (ip, compromised, occurrences) => {
    logger.info('Password Check', {
      ip,
      compromised,
      occurrences,
      timestamp: new Date().toISOString()
    });
  },
  
  comprehensiveCheck: (email, ip, securityScore, riskLevel) => {
    logger.info('Comprehensive Security Check', {
      email: email.replace(/(.{2}).*@/, '$1***@'),
      ip,
      securityScore,
      riskLevel,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = router;
