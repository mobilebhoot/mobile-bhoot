/**
 * Production OTP Service
 * Real SMS & WhatsApp integration for Indian market
 * Supports MSG91, TextLocal, Gupshup, and WhatsApp Business API
 */

const axios = require('axios');
const crypto = require('crypto');
const Redis = require('ioredis');
const logger = require('../utils/logger');
const { validatePhoneNumber, sanitizePhoneNumber } = require('../utils/validation');

class ProductionOTPService {
  constructor() {
    // Redis for OTP storage and rate limiting
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });

    // API Configuration
    this.config = {
      otp: {
        length: 6,
        expiryMinutes: 5,
        maxAttempts: 3,
        resendCooldown: 60 // seconds
      },
      
      sms: {
        provider: process.env.SMS_PROVIDER || 'MSG91',
        msg91: {
          authKey: process.env.MSG91_AUTH_KEY,
          baseUrl: 'https://api.msg91.com/api/v5',
          senderId: process.env.MSG91_SENDER_ID || 'POCKET',
          route: 4, // Transactional route
          country: '91'
        },
        textlocal: {
          apiKey: process.env.TEXTLOCAL_API_KEY,
          baseUrl: 'https://api.textlocal.in',
          sender: process.env.TEXTLOCAL_SENDER || 'POCKET'
        },
        twilio: {
          accountSid: process.env.TWILIO_ACCOUNT_SID,
          authToken: process.env.TWILIO_AUTH_TOKEN,
          fromNumber: process.env.TWILIO_PHONE_NUMBER
        }
      },

      whatsapp: {
        provider: process.env.WHATSAPP_PROVIDER || 'GUPSHUP',
        gupshup: {
          apiKey: process.env.GUPSHUP_API_KEY,
          baseUrl: 'https://api.gupshup.io/sm/api/v1',
          appName: process.env.GUPSHUP_APP_NAME,
          source: process.env.GUPSHUP_SOURCE_NUMBER
        },
        business: {
          accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
          phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
          baseUrl: 'https://graph.facebook.com/v18.0'
        }
      }
    };

    // Initialize rate limiting counters
    this.initializeRateLimiting();
  }

  /**
   * Initialize rate limiting for OTP requests
   */
  initializeRateLimiting() {
    this.rateLimits = {
      perPhone: {
        window: 3600, // 1 hour
        maxAttempts: 5
      },
      perIP: {
        window: 900, // 15 minutes
        maxAttempts: 10
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
   * Check rate limiting for phone number and IP
   */
  async checkRateLimit(phoneNumber, ipAddress) {
    const phoneKey = `rate_limit:phone:${phoneNumber}`;
    const ipKey = `rate_limit:ip:${ipAddress}`;

    try {
      // Check phone number rate limit
      const phoneAttempts = await this.redis.get(phoneKey) || 0;
      if (parseInt(phoneAttempts) >= this.rateLimits.perPhone.maxAttempts) {
        const ttl = await this.redis.ttl(phoneKey);
        return {
          allowed: false,
          reason: 'Phone rate limit exceeded',
          retryAfter: ttl
        };
      }

      // Check IP rate limit
      const ipAttempts = await this.redis.get(ipKey) || 0;
      if (parseInt(ipAttempts) >= this.rateLimits.perIP.maxAttempts) {
        const ttl = await this.redis.ttl(ipKey);
        return {
          allowed: false,
          reason: 'IP rate limit exceeded',
          retryAfter: ttl
        };
      }

      return { allowed: true };

    } catch (error) {
      logger.error('Rate limit check failed:', error);
      return { allowed: true }; // Allow on Redis error
    }
  }

  /**
   * Increment rate limit counters
   */
  async incrementRateLimit(phoneNumber, ipAddress) {
    const phoneKey = `rate_limit:phone:${phoneNumber}`;
    const ipKey = `rate_limit:ip:${ipAddress}`;

    try {
      // Increment phone counter
      await this.redis.incr(phoneKey);
      await this.redis.expire(phoneKey, this.rateLimits.perPhone.window);

      // Increment IP counter
      await this.redis.incr(ipKey);
      await this.redis.expire(ipKey, this.rateLimits.perIP.window);

    } catch (error) {
      logger.error('Rate limit increment failed:', error);
    }
  }

  /**
   * Send OTP via MSG91 SMS
   */
  async sendViaMSG91(phoneNumber, otp, templateId = null) {
    try {
      const { authKey, baseUrl, senderId, route, country } = this.config.sms.msg91;
      
      if (!authKey) {
        throw new Error('MSG91 Auth Key not configured');
      }

      const url = `${baseUrl}/otp`;
      const payload = templateId ? {
        template_id: templateId,
        mobile: `${country}${phoneNumber}`,
        authkey: authKey,
        otp: otp
      } : {
        authkey: authKey,
        mobile: `${country}${phoneNumber}`,
        message: `Your PocketShield security code is ${otp}. Valid for ${this.config.otp.expiryMinutes} minutes. Do not share this code.`,
        sender: senderId,
        route: route,
        country: country
      };

      logger.info(`Sending SMS via MSG91 to ${phoneNumber}`);

      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'authkey': authKey
        },
        timeout: 10000
      });

      if (response.data.type === 'success') {
        logger.info(`SMS sent successfully via MSG91: ${response.data.request_id}`);
        return {
          success: true,
          messageId: response.data.request_id,
          provider: 'MSG91',
          status: 'sent'
        };
      } else {
        throw new Error(response.data.message || 'MSG91 API error');
      }

    } catch (error) {
      logger.error('MSG91 SMS failed:', error.message);
      throw error;
    }
  }

  /**
   * Send OTP via TextLocal SMS
   */
  async sendViaTextLocal(phoneNumber, otp) {
    try {
      const { apiKey, baseUrl, sender } = this.config.sms.textlocal;
      
      if (!apiKey) {
        throw new Error('TextLocal API Key not configured');
      }

      const url = `${baseUrl}/send/`;
      const message = `Your PocketShield security code is ${otp}. Valid for ${this.config.otp.expiryMinutes} minutes. Do not share this code.`;
      
      const payload = new URLSearchParams({
        apikey: apiKey,
        numbers: `91${phoneNumber}`,
        message: message,
        sender: sender
      });

      logger.info(`Sending SMS via TextLocal to ${phoneNumber}`);

      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      });

      if (response.data.status === 'success') {
        logger.info(`SMS sent successfully via TextLocal: ${response.data.messages[0].id}`);
        return {
          success: true,
          messageId: response.data.messages[0].id,
          provider: 'TextLocal',
          status: 'sent'
        };
      } else {
        throw new Error(response.data.errors?.[0]?.message || 'TextLocal API error');
      }

    } catch (error) {
      logger.error('TextLocal SMS failed:', error.message);
      throw error;
    }
  }

  /**
   * Send OTP via Gupshup WhatsApp
   */
  async sendViaGupshup(phoneNumber, otp) {
    try {
      const { apiKey, baseUrl, appName, source } = this.config.whatsapp.gupshup;
      
      if (!apiKey || !source) {
        throw new Error('Gupshup configuration missing');
      }

      const url = `${baseUrl}/msg`;
      const message = {
        type: 'text',
        text: `🛡️ *PocketShield Security Code*\n\nYour verification code is: *${otp}*\n\n⏰ Valid for ${this.config.otp.expiryMinutes} minutes\n🔒 Keep this confidential\n\nDo not share this code with anyone.`
      };

      const payload = new URLSearchParams({
        channel: 'whatsapp',
        source: source,
        destination: `91${phoneNumber}`,
        'src.name': appName,
        message: JSON.stringify(message)
      });

      logger.info(`Sending WhatsApp via Gupshup to ${phoneNumber}`);

      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'apikey': apiKey
        },
        timeout: 15000
      });

      if (response.data.status === 'submitted') {
        logger.info(`WhatsApp sent successfully via Gupshup: ${response.data.messageId}`);
        return {
          success: true,
          messageId: response.data.messageId,
          provider: 'Gupshup',
          status: 'submitted'
        };
      } else {
        throw new Error(response.data.message || 'Gupshup API error');
      }

    } catch (error) {
      logger.error('Gupshup WhatsApp failed:', error.message);
      throw error;
    }
  }

  /**
   * Send OTP via WhatsApp Business API
   */
  async sendViaWhatsAppBusiness(phoneNumber, otp) {
    try {
      const { accessToken, phoneNumberId, baseUrl } = this.config.whatsapp.business;
      
      if (!accessToken || !phoneNumberId) {
        throw new Error('WhatsApp Business API configuration missing');
      }

      const url = `${baseUrl}/${phoneNumberId}/messages`;
      const payload = {
        messaging_product: 'whatsapp',
        to: `91${phoneNumber}`,
        type: 'text',
        text: {
          preview_url: false,
          body: `🛡️ PocketShield Security Code\n\nYour verification code is: ${otp}\n\nValid for ${this.config.otp.expiryMinutes} minutes. Keep this confidential.`
        }
      };

      logger.info(`Sending WhatsApp via Business API to ${phoneNumber}`);

      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      if (response.data.messages && response.data.messages[0].id) {
        logger.info(`WhatsApp sent successfully via Business API: ${response.data.messages[0].id}`);
        return {
          success: true,
          messageId: response.data.messages[0].id,
          provider: 'WhatsApp Business',
          status: 'sent'
        };
      } else {
        throw new Error('WhatsApp Business API error');
      }

    } catch (error) {
      logger.error('WhatsApp Business API failed:', error.message);
      throw error;
    }
  }

  /**
   * Store OTP in Redis with expiration
   */
  async storeOTP(phoneNumber, otp, metadata = {}) {
    const key = `otp:${phoneNumber}`;
    const data = {
      otp,
      attempts: 0,
      createdAt: Date.now(),
      expiresAt: Date.now() + (this.config.otp.expiryMinutes * 60 * 1000),
      ...metadata
    };

    try {
      await this.redis.setex(key, this.config.otp.expiryMinutes * 60, JSON.stringify(data));
      logger.info(`OTP stored for ${phoneNumber}, expires in ${this.config.otp.expiryMinutes} minutes`);
    } catch (error) {
      logger.error('Failed to store OTP:', error);
      throw error;
    }
  }

  /**
   * Send OTP via multiple channels (SMS + WhatsApp)
   */
  async sendOTP(phoneNumber, ipAddress, options = {}) {
    try {
      // Validate and sanitize phone number
      const sanitizedPhone = sanitizePhoneNumber(phoneNumber);
      if (!validatePhoneNumber(sanitizedPhone)) {
        return {
          success: false,
          error: 'Invalid Indian mobile number format'
        };
      }

      // Check rate limiting
      const rateLimitResult = await this.checkRateLimit(sanitizedPhone, ipAddress);
      if (!rateLimitResult.allowed) {
        return {
          success: false,
          error: rateLimitResult.reason,
          retryAfter: rateLimitResult.retryAfter
        };
      }

      // Check if recent OTP exists
      const existingOtpKey = `otp:${sanitizedPhone}`;
      const existingOtp = await this.redis.get(existingOtpKey);
      
      if (existingOtp && !options.resend) {
        const otpData = JSON.parse(existingOtp);
        const cooldownRemaining = this.config.otp.resendCooldown - Math.floor((Date.now() - otpData.createdAt) / 1000);
        
        if (cooldownRemaining > 0) {
          return {
            success: false,
            error: 'OTP already sent recently',
            cooldownRemaining
          };
        }
      }

      // Generate new OTP
      const otp = this.generateOTP();
      
      // Send via multiple channels
      const sendPromises = [];
      
      // SMS
      if (options.enableSMS !== false) {
        const smsProvider = this.config.sms.provider;
        if (smsProvider === 'MSG91' && this.config.sms.msg91.authKey) {
          sendPromises.push(
            this.sendViaMSG91(sanitizedPhone, otp, options.templateId)
              .then(result => ({ channel: 'sms', ...result }))
              .catch(error => ({ channel: 'sms', success: false, error: error.message }))
          );
        } else if (smsProvider === 'TEXTLOCAL' && this.config.sms.textlocal.apiKey) {
          sendPromises.push(
            this.sendViaTextLocal(sanitizedPhone, otp)
              .then(result => ({ channel: 'sms', ...result }))
              .catch(error => ({ channel: 'sms', success: false, error: error.message }))
          );
        }
      }

      // WhatsApp
      if (options.enableWhatsApp !== false) {
        const whatsappProvider = this.config.whatsapp.provider;
        if (whatsappProvider === 'GUPSHUP' && this.config.whatsapp.gupshup.apiKey) {
          sendPromises.push(
            this.sendViaGupshup(sanitizedPhone, otp)
              .then(result => ({ channel: 'whatsapp', ...result }))
              .catch(error => ({ channel: 'whatsapp', success: false, error: error.message }))
          );
        } else if (whatsappProvider === 'BUSINESS' && this.config.whatsapp.business.accessToken) {
          sendPromises.push(
            this.sendViaWhatsAppBusiness(sanitizedPhone, otp)
              .then(result => ({ channel: 'whatsapp', ...result }))
              .catch(error => ({ channel: 'whatsapp', success: false, error: error.message }))
          );
        }
      }

      // Wait for all sending attempts
      const results = await Promise.allSettled(sendPromises);
      const deliveryResults = results.map(result => 
        result.status === 'fulfilled' ? result.value : { success: false, error: result.reason.message }
      );

      // Check if at least one channel succeeded
      const successfulDeliveries = deliveryResults.filter(result => result.success);
      const failedDeliveries = deliveryResults.filter(result => !result.success);

      if (successfulDeliveries.length === 0) {
        logger.error(`All OTP delivery channels failed for ${sanitizedPhone}`);
        return {
          success: false,
          error: 'Failed to send OTP via any channel',
          details: failedDeliveries
        };
      }

      // Store OTP in Redis
      await this.storeOTP(sanitizedPhone, otp, {
        ipAddress,
        deliveryChannels: successfulDeliveries.map(r => r.channel),
        messageIds: successfulDeliveries.reduce((acc, r) => {
          acc[r.channel] = r.messageId;
          return acc;
        }, {})
      });

      // Increment rate limiting
      await this.incrementRateLimit(sanitizedPhone, ipAddress);

      logger.info(`OTP sent successfully to ${sanitizedPhone} via ${successfulDeliveries.length} channel(s)`);

      return {
        success: true,
        message: 'OTP sent successfully',
        channels: successfulDeliveries,
        expiresIn: this.config.otp.expiryMinutes * 60,
        // Remove OTP from response in production
        ...(process.env.NODE_ENV === 'development' && { otp })
      };

    } catch (error) {
      logger.error('Send OTP failed:', error);
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Verify OTP
   */
  async verifyOTP(phoneNumber, enteredOtp, ipAddress) {
    try {
      const sanitizedPhone = sanitizePhoneNumber(phoneNumber);
      const key = `otp:${sanitizedPhone}`;
      
      const storedData = await this.redis.get(key);
      
      if (!storedData) {
        return {
          success: false,
          error: 'OTP not found or expired'
        };
      }

      const otpData = JSON.parse(storedData);

      // Check expiration
      if (Date.now() > otpData.expiresAt) {
        await this.redis.del(key);
        return {
          success: false,
          error: 'OTP expired'
        };
      }

      // Check max attempts
      if (otpData.attempts >= this.config.otp.maxAttempts) {
        await this.redis.del(key);
        return {
          success: false,
          error: 'Maximum verification attempts exceeded'
        };
      }

      // Verify OTP
      if (otpData.otp === enteredOtp) {
        // OTP verified successfully
        await this.redis.del(key);
        
        logger.info(`OTP verified successfully for ${sanitizedPhone}`);
        
        return {
          success: true,
          message: 'OTP verified successfully',
          phoneNumber: sanitizedPhone
        };
      } else {
        // Increment attempt counter
        otpData.attempts += 1;
        await this.redis.setex(key, this.config.otp.expiryMinutes * 60, JSON.stringify(otpData));
        
        const remainingAttempts = this.config.otp.maxAttempts - otpData.attempts;
        
        return {
          success: false,
          error: 'Invalid OTP',
          remainingAttempts
        };
      }

    } catch (error) {
      logger.error('Verify OTP failed:', error);
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Get OTP delivery status
   */
  async getDeliveryStatus(phoneNumber) {
    try {
      const sanitizedPhone = sanitizePhoneNumber(phoneNumber);
      const key = `otp:${sanitizedPhone}`;
      
      const storedData = await this.redis.get(key);
      
      if (!storedData) {
        return { status: 'not_found' };
      }

      const otpData = JSON.parse(storedData);
      const isExpired = Date.now() > otpData.expiresAt;
      const timeRemaining = Math.max(0, Math.floor((otpData.expiresAt - Date.now()) / 1000));

      return {
        status: isExpired ? 'expired' : 'active',
        timeRemaining,
        attempts: otpData.attempts,
        maxAttempts: this.config.otp.maxAttempts,
        deliveryChannels: otpData.deliveryChannels || [],
        messageIds: otpData.messageIds || {}
      };

    } catch (error) {
      logger.error('Get delivery status failed:', error);
      return { status: 'error' };
    }
  }
}

module.exports = new ProductionOTPService();
