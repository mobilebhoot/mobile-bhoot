/**
 * AWS OTP Service
 * Integration with Amazon SNS, Cognito, and other AWS services for OTP delivery
 */

const AWS = require('aws-sdk');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { validatePhoneNumber, sanitizePhoneNumber } = require('../utils/validation');

class AWSOTPService {
  constructor() {
    // Configure AWS SDK
    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'ap-south-1' // Mumbai region for India
    });

    // Initialize AWS services
    this.sns = new AWS.SNS();
    this.cognito = new AWS.CognitoIdentityServiceProvider();
    this.dynamodb = new AWS.DynamoDB.DocumentClient();
    this.ses = new AWS.SES();

    // Configuration
    this.config = {
      otp: {
        length: 6,
        expiryMinutes: 5,
        maxAttempts: 3,
        tableName: process.env.DYNAMODB_OTP_TABLE || 'pocketshield-otps'
      },
      sns: {
        senderName: process.env.SMS_SENDER_NAME || 'PocketShield',
        messageType: 'Transactional',
        maxPrice: '0.50', // Maximum price per SMS in USD
        defaultCountryCode: '+91'
      },
      cognito: {
        userPoolId: process.env.COGNITO_USER_POOL_ID,
        clientId: process.env.COGNITO_CLIENT_ID,
        region: process.env.AWS_REGION || 'ap-south-1'
      }
    };
  }

  /**
   * Generate secure OTP
   */
  generateOTP() {
    const min = Math.pow(10, this.config.otp.length - 1);
    const max = Math.pow(10, this.config.otp.length) - 1;
    return Math.floor(min + Math.random() * (max - min + 1)).toString();
  }

  /**
   * Send SMS via Amazon SNS
   */
  async sendSMSViaSNS(phoneNumber, otp, options = {}) {
    try {
      const fullPhoneNumber = phoneNumber.startsWith('+') 
        ? phoneNumber 
        : `${this.config.sns.defaultCountryCode}${phoneNumber}`;

      const message = options.message || 
        `Your PocketShield security code is ${otp}. Valid for ${this.config.otp.expiryMinutes} minutes. Do not share this code.`;

      const params = {
        PhoneNumber: fullPhoneNumber,
        Message: message,
        MessageAttributes: {
          'AWS.SNS.SMS.SenderID': {
            DataType: 'String',
            StringValue: this.config.sns.senderName
          },
          'AWS.SNS.SMS.MaxPrice': {
            DataType: 'String',
            StringValue: this.config.sns.maxPrice
          },
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: this.config.sns.messageType
          }
        }
      };

      logger.info(`Sending SMS via AWS SNS to ${fullPhoneNumber}`);

      const result = await this.sns.publish(params).promise();

      logger.info(`SMS sent successfully via SNS: ${result.MessageId}`);

      return {
        success: true,
        messageId: result.MessageId,
        provider: 'AWS SNS',
        status: 'sent',
        cost: 'Pay-per-use'
      };

    } catch (error) {
      logger.error('AWS SNS SMS failed:', error);
      throw error;
    }
  }

  /**
   * Send OTP via Amazon Cognito (Built-in OTP)
   */
  async sendOTPViaCognito(phoneNumber, options = {}) {
    try {
      const fullPhoneNumber = phoneNumber.startsWith('+') 
        ? phoneNumber 
        : `${this.config.sns.defaultCountryCode}${phoneNumber}`;

      // Check if user exists, create if not
      let userExists = false;
      try {
        await this.cognito.adminGetUser({
          UserPoolId: this.config.cognito.userPoolId,
          Username: fullPhoneNumber
        }).promise();
        userExists = true;
      } catch (error) {
        if (error.code !== 'UserNotFoundException') {
          throw error;
        }
      }

      // Create user if doesn't exist
      if (!userExists) {
        await this.cognito.adminCreateUser({
          UserPoolId: this.config.cognito.userPoolId,
          Username: fullPhoneNumber,
          MessageAction: 'SUPPRESS', // Don't send welcome message
          TemporaryPassword: crypto.randomBytes(12).toString('hex'),
          UserAttributes: [
            {
              Name: 'phone_number',
              Value: fullPhoneNumber
            },
            {
              Name: 'phone_number_verified',
              Value: 'false'
            }
          ]
        }).promise();
      }

      // Initiate authentication flow for OTP
      const authResult = await this.cognito.initiateAuth({
        AuthFlow: 'CUSTOM_AUTH',
        ClientId: this.config.cognito.clientId,
        AuthParameters: {
          USERNAME: fullPhoneNumber,
          CHALLENGE_NAME: 'SMS_MFA'
        }
      }).promise();

      logger.info(`Cognito OTP initiated for ${fullPhoneNumber}: ${authResult.Session}`);

      return {
        success: true,
        session: authResult.Session,
        challengeName: authResult.ChallengeName,
        provider: 'AWS Cognito',
        status: 'sent'
      };

    } catch (error) {
      logger.error('AWS Cognito OTP failed:', error);
      throw error;
    }
  }

  /**
   * Send Email OTP via Amazon SES
   */
  async sendEmailViaSES(email, otp, options = {}) {
    try {
      const subject = options.subject || 'PocketShield Security Code';
      const htmlBody = options.htmlBody || `
        <html>
          <body>
            <h2>🛡️ PocketShield Security Code</h2>
            <p>Your verification code is: <strong>${otp}</strong></p>
            <p>This code will expire in ${this.config.otp.expiryMinutes} minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
            <hr>
            <p><small>PocketShield Security Team</small></p>
          </body>
        </html>
      `;

      const textBody = options.textBody || 
        `Your PocketShield security code is: ${otp}\n\nThis code will expire in ${this.config.otp.expiryMinutes} minutes.\n\nPocketShield Security Team`;

      const params = {
        Source: process.env.SES_SENDER_EMAIL || 'noreply@pocketshield.com',
        Destination: {
          ToAddresses: [email]
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8'
          },
          Body: {
            Html: {
              Data: htmlBody,
              Charset: 'UTF-8'
            },
            Text: {
              Data: textBody,
              Charset: 'UTF-8'
            }
          }
        }
      };

      logger.info(`Sending email OTP via AWS SES to ${email}`);

      const result = await this.ses.sendEmail(params).promise();

      logger.info(`Email sent successfully via SES: ${result.MessageId}`);

      return {
        success: true,
        messageId: result.MessageId,
        provider: 'AWS SES',
        status: 'sent'
      };

    } catch (error) {
      logger.error('AWS SES email failed:', error);
      throw error;
    }
  }

  /**
   * Store OTP in DynamoDB
   */
  async storeOTPInDynamoDB(phoneNumber, otp, metadata = {}) {
    try {
      const expiresAt = Math.floor(Date.now() / 1000) + (this.config.otp.expiryMinutes * 60);
      
      const item = {
        phone_number: phoneNumber,
        otp_hash: crypto.createHash('sha256').update(otp).digest('hex'),
        created_at: Math.floor(Date.now() / 1000),
        expires_at: expiresAt,
        attempts: 0,
        max_attempts: this.config.otp.maxAttempts,
        ...metadata
      };

      await this.dynamodb.put({
        TableName: this.config.otp.tableName,
        Item: item,
        ConditionExpression: 'attribute_not_exists(phone_number)'
      }).promise();

      logger.info(`OTP stored in DynamoDB for ${phoneNumber}, TTL: ${expiresAt}`);

    } catch (error) {
      if (error.code === 'ConditionalCheckFailedException') {
        // Update existing record
        await this.dynamodb.update({
          TableName: this.config.otp.tableName,
          Key: { phone_number: phoneNumber },
          UpdateExpression: 'SET otp_hash = :otp, created_at = :created, expires_at = :expires, attempts = :attempts',
          ExpressionAttributeValues: {
            ':otp': crypto.createHash('sha256').update(otp).digest('hex'),
            ':created': Math.floor(Date.now() / 1000),
            ':expires': expiresAt,
            ':attempts': 0
          }
        }).promise();
      } else {
        throw error;
      }
    }
  }

  /**
   * Verify OTP from DynamoDB
   */
  async verifyOTPFromDynamoDB(phoneNumber, enteredOtp) {
    try {
      const result = await this.dynamodb.get({
        TableName: this.config.otp.tableName,
        Key: { phone_number: phoneNumber }
      }).promise();

      if (!result.Item) {
        return {
          success: false,
          error: 'OTP not found or expired'
        };
      }

      const otpData = result.Item;
      const currentTime = Math.floor(Date.now() / 1000);

      // Check expiration
      if (currentTime > otpData.expires_at) {
        await this.dynamodb.delete({
          TableName: this.config.otp.tableName,
          Key: { phone_number: phoneNumber }
        }).promise();
        
        return {
          success: false,
          error: 'OTP expired'
        };
      }

      // Check max attempts
      if (otpData.attempts >= otpData.max_attempts) {
        await this.dynamodb.delete({
          TableName: this.config.otp.tableName,
          Key: { phone_number: phoneNumber }
        }).promise();
        
        return {
          success: false,
          error: 'Maximum verification attempts exceeded'
        };
      }

      // Verify OTP
      const enteredOtpHash = crypto.createHash('sha256').update(enteredOtp).digest('hex');
      
      if (otpData.otp_hash === enteredOtpHash) {
        // OTP verified successfully
        await this.dynamodb.delete({
          TableName: this.config.otp.tableName,
          Key: { phone_number: phoneNumber }
        }).promise();
        
        return {
          success: true,
          message: 'OTP verified successfully'
        };
      } else {
        // Increment attempts
        await this.dynamodb.update({
          TableName: this.config.otp.tableName,
          Key: { phone_number: phoneNumber },
          UpdateExpression: 'SET attempts = attempts + :inc',
          ExpressionAttributeValues: {
            ':inc': 1
          }
        }).promise();
        
        const remainingAttempts = otpData.max_attempts - (otpData.attempts + 1);
        
        return {
          success: false,
          error: 'Invalid OTP',
          remainingAttempts
        };
      }

    } catch (error) {
      logger.error('DynamoDB OTP verification failed:', error);
      throw error;
    }
  }

  /**
   * Send OTP via multiple AWS channels
   */
  async sendOTP(phoneNumber, options = {}) {
    try {
      const sanitizedPhone = sanitizePhoneNumber(phoneNumber);
      
      if (!validatePhoneNumber(sanitizedPhone)) {
        return {
          success: false,
          error: 'Invalid phone number format'
        };
      }

      const otp = this.generateOTP();
      const deliveryChannels = [];

      // SMS via SNS (Primary)
      if (options.enableSMS !== false) {
        try {
          const smsResult = await this.sendSMSViaSNS(sanitizedPhone, otp, options.smsOptions);
          deliveryChannels.push({ channel: 'sms', ...smsResult });
        } catch (error) {
          deliveryChannels.push({ 
            channel: 'sms', 
            success: false, 
            error: error.message 
          });
        }
      }

      // Email via SES (if email provided)
      if (options.email && options.enableEmail !== false) {
        try {
          const emailResult = await this.sendEmailViaSES(options.email, otp, options.emailOptions);
          deliveryChannels.push({ channel: 'email', ...emailResult });
        } catch (error) {
          deliveryChannels.push({ 
            channel: 'email', 
            success: false, 
            error: error.message 
          });
        }
      }

      // Cognito OTP (Alternative)
      if (options.useCognito === true) {
        try {
          const cognitoResult = await this.sendOTPViaCognito(sanitizedPhone, options.cognitoOptions);
          deliveryChannels.push({ channel: 'cognito', ...cognitoResult });
        } catch (error) {
          deliveryChannels.push({ 
            channel: 'cognito', 
            success: false, 
            error: error.message 
          });
        }
      }

      // Check if at least one channel succeeded
      const successfulChannels = deliveryChannels.filter(channel => channel.success);
      
      if (successfulChannels.length === 0) {
        return {
          success: false,
          error: 'Failed to send OTP via any channel',
          details: deliveryChannels
        };
      }

      // Store OTP in DynamoDB
      await this.storeOTPInDynamoDB(sanitizedPhone, otp, {
        delivery_channels: successfulChannels.map(c => c.channel),
        message_ids: successfulChannels.reduce((acc, c) => {
          if (c.messageId) acc[c.channel] = c.messageId;
          return acc;
        }, {})
      });

      logger.info(`AWS OTP sent successfully to ${sanitizedPhone} via ${successfulChannels.length} channel(s)`);

      return {
        success: true,
        message: 'OTP sent successfully',
        channels: successfulChannels,
        expiresIn: this.config.otp.expiryMinutes * 60,
        // Include OTP only in development
        ...(process.env.NODE_ENV === 'development' && { otp })
      };

    } catch (error) {
      logger.error('AWS OTP service error:', error);
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Verify OTP
   */
  async verifyOTP(phoneNumber, enteredOtp) {
    try {
      const sanitizedPhone = sanitizePhoneNumber(phoneNumber);
      
      const result = await this.verifyOTPFromDynamoDB(sanitizedPhone, enteredOtp);
      
      if (result.success) {
        logger.info(`AWS OTP verified successfully for ${sanitizedPhone}`);
      }
      
      return result;

    } catch (error) {
      logger.error('AWS OTP verification error:', error);
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Get AWS service costs estimation
   */
  getCostEstimation(monthlyOTPs) {
    return {
      sns: {
        sms: monthlyOTPs * 0.00645, // $0.00645 per SMS in India
        description: 'Amazon SNS SMS pricing for India'
      },
      ses: {
        email: Math.min(monthlyOTPs * 0.0001, 62000 * 0.0001), // First 62,000 emails free
        description: 'Amazon SES email pricing (first 62K free)'
      },
      dynamodb: {
        storage: 0.25, // Estimated monthly storage cost
        requests: monthlyOTPs * 0.0000013, // Write/Read requests
        description: 'DynamoDB storage and request pricing'
      },
      total: function() {
        return this.sns.sms + this.ses.email + this.dynamodb.storage + this.dynamodb.requests;
      }
    };
  }

  /**
   * Check AWS services health
   */
  async checkHealth() {
    const health = {
      sns: { status: 'unknown' },
      ses: { status: 'unknown' },
      dynamodb: { status: 'unknown' },
      cognito: { status: 'unknown' }
    };

    try {
      // Check SNS
      await this.sns.getTopicAttributes({ TopicArn: 'arn:aws:sns:us-east-1:123456789012:test' }).promise();
    } catch (error) {
      health.sns = { 
        status: error.code === 'NotFound' ? 'accessible' : 'error',
        error: error.message
      };
    }

    try {
      // Check SES
      await this.ses.getAccountSendingEnabled().promise();
      health.ses.status = 'accessible';
    } catch (error) {
      health.ses = { status: 'error', error: error.message };
    }

    try {
      // Check DynamoDB
      await this.dynamodb.describe({ TableName: this.config.otp.tableName }).promise();
      health.dynamodb.status = 'accessible';
    } catch (error) {
      health.dynamodb = { status: 'error', error: error.message };
    }

    return health;
  }
}

module.exports = new AWSOTPService();
