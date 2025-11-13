/**
 * AWS OTP API Routes
 * Amazon SNS, SES, Cognito, and DynamoDB integration
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const router = express.Router();

const awsOtpService = require('../services/awsOtpService');
const logger = require('../utils/logger');
const { validatePhoneNumber, validateEmail, validateOTP } = require('../utils/validation');

// AWS-specific rate limiting (more generous due to lower costs)
const awsOtpRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 OTP requests per 15 minutes
  message: {
    error: 'Too many AWS OTP requests from this IP',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @swagger
 * components:
 *   schemas:
 *     AWSOTPRequest:
 *       type: object
 *       required:
 *         - phoneNumber
 *       properties:
 *         phoneNumber:
 *           type: string
 *           description: Indian mobile number (10 digits)
 *           example: "9876543210"
 *         email:
 *           type: string
 *           description: Email address for additional verification
 *           example: "user@example.com"
 *         enableSMS:
 *           type: boolean
 *           description: Enable SMS via Amazon SNS
 *           default: true
 *         enableEmail:
 *           type: boolean
 *           description: Enable email via Amazon SES
 *           default: false
 *         useCognito:
 *           type: boolean
 *           description: Use Amazon Cognito for OTP flow
 *           default: false
 *         smsOptions:
 *           type: object
 *           properties:
 *             message:
 *               type: string
 *               description: Custom SMS message template
 *             senderName:
 *               type: string
 *               description: SMS sender name/ID
 *         emailOptions:
 *           type: object
 *           properties:
 *             subject:
 *               type: string
 *               description: Email subject line
 *             template:
 *               type: string
 *               description: Email template type
 */

/**
 * @swagger
 * /api/aws-otp/send:
 *   post:
 *     summary: Send OTP via AWS services (SNS SMS, SES Email, Cognito)
 *     tags: [AWS OTP]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AWSOTPRequest'
 *     responses:
 *       200:
 *         description: OTP sent successfully via AWS services
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
 *                     properties:
 *                       channel:
 *                         type: string
 *                         enum: [sms, email, cognito]
 *                       provider:
 *                         type: string
 *                       messageId:
 *                         type: string
 *                       cost:
 *                         type: string
 *                 expiresIn:
 *                   type: number
 *                 costEstimate:
 *                   type: object
 *       400:
 *         description: Invalid request data
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: AWS service error
 */
router.post('/send',
  awsOtpRateLimit,
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
    body('email')
      .optional()
      .isEmail()
      .withMessage('Invalid email format'),
    body('enableSMS')
      .optional()
      .isBoolean()
      .withMessage('enableSMS must be boolean'),
    body('enableEmail')
      .optional()
      .isBoolean()
      .withMessage('enableEmail must be boolean'),
    body('useCognito')
      .optional()
      .isBoolean()
      .withMessage('useCognito must be boolean')
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

      const {
        phoneNumber,
        email,
        enableSMS = true,
        enableEmail = false,
        useCognito = false,
        smsOptions = {},
        emailOptions = {},
        cognitoOptions = {}
      } = req.body;

      const ipAddress = req.ip;

      logger.info(`AWS OTP send request from ${ipAddress} for ${phoneNumber}`);

      // Validate email if email OTP is enabled
      if (enableEmail && !email) {
        return res.status(400).json({
          success: false,
          error: 'Email address required when enableEmail is true'
        });
      }

      // Send OTP via AWS services
      const result = await awsOtpService.sendOTP(phoneNumber, {
        enableSMS,
        enableEmail,
        email,
        useCognito,
        smsOptions,
        emailOptions,
        cognitoOptions
      });

      // Log the attempt with cost information
      logger.info(`AWS OTP request completed`, {
        phoneNumber,
        ipAddress,
        success: result.success,
        channels: result.channels?.map(c => c.channel),
        estimatedCost: result.channels?.reduce((total, c) => {
          if (c.channel === 'sms') return total + 0.00645; // SNS SMS cost
          if (c.channel === 'email') return total + 0.0001; // SES email cost
          return total;
        }, 0)
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      // Add cost estimation to response
      const costEstimate = awsOtpService.getCostEstimation(1);
      result.costEstimate = {
        thisSMS: result.channels?.some(c => c.channel === 'sms') ? '$0.0065' : '$0',
        thisEmail: result.channels?.some(c => c.channel === 'email') ? '$0.0001' : '$0',
        monthlyFor50K: `$${costEstimate.total().toFixed(2)}`
      };

      res.json(result);

    } catch (error) {
      logger.error('AWS OTP send error:', error);
      res.status(500).json({
        success: false,
        error: 'AWS service error',
        awsError: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @swagger
 * /api/aws-otp/verify:
 *   post:
 *     summary: Verify OTP stored in AWS DynamoDB
 *     tags: [AWS OTP]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *               - otp
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 example: "9876543210"
 *               otp:
 *                 type: string
 *                 example: "123456"
 *               cognitoSession:
 *                 type: string
 *                 description: Cognito session for Cognito-based OTP
 *     responses:
 *       200:
 *         description: OTP verification result
 *       400:
 *         description: Invalid OTP or validation error
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
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { phoneNumber, otp, cognitoSession } = req.body;
      const ipAddress = req.ip;

      logger.info(`AWS OTP verify request from ${ipAddress} for ${phoneNumber}`);

      // Verify OTP from DynamoDB
      const result = await awsOtpService.verifyOTP(phoneNumber, otp);

      // Log verification attempt
      logger.info(`AWS OTP verification completed`, {
        phoneNumber,
        ipAddress,
        success: result.success,
        remainingAttempts: result.remainingAttempts
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);

    } catch (error) {
      logger.error('AWS OTP verify error:', error);
      res.status(500).json({
        success: false,
        error: 'AWS service error',
        awsError: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @swagger
 * /api/aws-otp/health:
 *   get:
 *     summary: Check AWS OTP services health
 *     tags: [AWS OTP]
 *     responses:
 *       200:
 *         description: AWS services health status
 */
router.get('/health', async (req, res) => {
  try {
    const health = await awsOtpService.checkHealth();
    
    // Determine overall status
    const services = Object.values(health);
    const allHealthy = services.every(service => service.status === 'accessible');
    const hasErrors = services.some(service => service.status === 'error');

    res.json({
      status: allHealthy ? 'healthy' : hasErrors ? 'unhealthy' : 'degraded',
      services: health,
      region: process.env.AWS_REGION || 'ap-south-1',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('AWS health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/aws-otp/cost-estimate:
 *   get:
 *     summary: Get AWS services cost estimation
 *     tags: [AWS OTP]
 *     parameters:
 *       - in: query
 *         name: monthlyOTPs
 *         schema:
 *           type: integer
 *           default: 10000
 *         description: Estimated monthly OTP volume
 *     responses:
 *       200:
 *         description: Cost breakdown and estimation
 */
router.get('/cost-estimate', (req, res) => {
  try {
    const monthlyOTPs = parseInt(req.query.monthlyOTPs) || 10000;
    
    const costs = awsOtpService.getCostEstimation(monthlyOTPs);
    
    // Add comparison with traditional providers
    const comparison = {
      aws: {
        sms: costs.sns.sms,
        email: costs.ses.email,
        storage: costs.dynamodb.storage + costs.dynamodb.requests,
        total: costs.total()
      },
      traditional: {
        msg91: monthlyOTPs * 0.003, // ~$0.003 per SMS for MSG91
        gupshup: monthlyOTPs * 0.003, // ~$0.003 per WhatsApp
        redis: 5, // ~$5/month for Redis
        total: (monthlyOTPs * 0.006) + 5
      }
    };

    comparison.savings = {
      amount: comparison.traditional.total - comparison.aws.total,
      percentage: ((comparison.traditional.total - comparison.aws.total) / comparison.traditional.total * 100).toFixed(1)
    };

    res.json({
      monthlyVolume: monthlyOTPs,
      costs,
      comparison,
      recommendations: {
        breakEven: 'AWS becomes cost-effective at ~3000+ OTPs/month',
        optimal: monthlyOTPs > 3000 ? 'AWS SNS recommended' : 'Consider traditional providers',
        hybrid: 'Use AWS SNS primary with MSG91 fallback for best reliability'
      }
    });

  } catch (error) {
    logger.error('Cost estimation error:', error);
    res.status(500).json({
      error: 'Failed to calculate cost estimation',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/aws-otp/regions:
 *   get:
 *     summary: Get AWS regions and their SMS/Email support
 *     tags: [AWS OTP]
 *     responses:
 *       200:
 *         description: AWS regions with OTP service support
 */
router.get('/regions', (req, res) => {
  const regions = {
    recommended: {
      'ap-south-1': {
        name: 'Asia Pacific (Mumbai)',
        sms: { supported: true, cost: '$0.00645/SMS' },
        ses: { supported: true, cost: '$0.0001/email' },
        latency: '< 50ms for India',
        compliance: 'India data residency'
      },
      'us-east-1': {
        name: 'US East (N. Virginia)',
        sms: { supported: true, cost: '$0.0075/SMS' },
        ses: { supported: true, cost: '$0.0001/email' },
        latency: '~ 200ms for India',
        compliance: 'Global standard'
      }
    },
    alternatives: {
      'ap-southeast-1': 'Singapore (Good for APAC)',
      'eu-west-1': 'Ireland (EU compliance)',
      'us-west-2': 'Oregon (US West Coast)'
    },
    limitations: {
      sms: 'Not all regions support SMS delivery to India',
      ses: 'Email deliverability may vary by region',
      compliance: 'Consider data residency requirements'
    }
  };

  res.json(regions);
});

/**
 * @swagger
 * /api/aws-otp/test:
 *   post:
 *     summary: Test AWS service connectivity (development only)
 *     tags: [AWS OTP]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               service:
 *                 type: string
 *                 enum: [sns, ses, dynamodb, cognito]
 *               testPhone:
 *                 type: string
 *               testEmail:
 *                 type: string
 *     responses:
 *       200:
 *         description: Test results
 *       403:
 *         description: Only available in development
 */
router.post('/test', async (req, res) => {
  // Only allow in development environment
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({
      error: 'Test endpoint only available in development environment'
    });
  }

  try {
    const { service, testPhone, testEmail } = req.body;

    let result;

    switch (service) {
      case 'sns':
        if (!testPhone) {
          return res.status(400).json({ error: 'testPhone required for SNS test' });
        }
        result = await awsOtpService.sendSMSViaSNS(testPhone, '123456', { 
          message: 'PocketShield AWS SNS Test Message' 
        });
        break;

      case 'ses':
        if (!testEmail) {
          return res.status(400).json({ error: 'testEmail required for SES test' });
        }
        result = await awsOtpService.sendEmailViaSES(testEmail, '123456', {
          subject: 'PocketShield AWS SES Test'
        });
        break;

      case 'dynamodb':
        result = await awsOtpService.storeOTPInDynamoDB(testPhone || '1234567890', '123456', {
          test: true
        });
        break;

      case 'cognito':
        if (!testPhone) {
          return res.status(400).json({ error: 'testPhone required for Cognito test' });
        }
        result = await awsOtpService.sendOTPViaCognito(testPhone);
        break;

      default:
        return res.status(400).json({ 
          error: 'Invalid service. Use: sns, ses, dynamodb, or cognito' 
        });
    }

    res.json({
      service,
      test: 'completed',
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('AWS test error:', error);
    res.status(500).json({
      service: req.body.service,
      test: 'failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
