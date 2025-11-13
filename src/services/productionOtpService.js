// Production OTP Service with Real APIs
import * as Clipboard from 'expo-clipboard';

class ProductionOTPService {
  constructor() {
    this.otpStore = new Map();
    
    // Production API Configuration
    this.config = {
      // SMS Configuration (Choose one)
      sms: {
        provider: 'MSG91', // or 'TEXTLOCAL', 'TWILIO'
        msg91: {
          apiKey: 'YOUR_MSG91_AUTH_KEY',
          baseUrl: 'https://api.msg91.com/api/v5/otp',
          senderId: 'POCKET'
        },
        textlocal: {
          apiKey: 'YOUR_TEXTLOCAL_API_KEY',
          baseUrl: 'https://api.textlocal.in/send/',
          senderId: 'POCKET'
        },
        twilio: {
          accountSid: 'YOUR_TWILIO_ACCOUNT_SID',
          authToken: 'YOUR_TWILIO_AUTH_TOKEN',
          fromNumber: '+1234567890'
        }
      },
      
      // WhatsApp Configuration
      whatsapp: {
        provider: 'WHATSAPP_BUSINESS', // or 'GUPSHUP'
        business: {
          accessToken: 'YOUR_WHATSAPP_ACCESS_TOKEN',
          phoneNumberId: 'YOUR_PHONE_NUMBER_ID',
          baseUrl: 'https://graph.facebook.com/v17.0'
        },
        gupshup: {
          apiKey: 'YOUR_GUPSHUP_API_KEY',
          baseUrl: 'https://api.gupshup.io/sm/api/v1/msg',
          botNumber: 'YOUR_BOT_NUMBER'
        }
      }
    };
  }

  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  validateIndianMobile(number) {
    const cleanNumber = number.replace(/\s/g, '');
    return /^[6-9]\d{9}$/.test(cleanNumber);
  }

  /**
   * Send OTP via Real SMS APIs
   */
  async sendSMSOTP(mobileNumber, otp) {
    try {
      const provider = this.config.sms.provider;
      let result;

      switch (provider) {
        case 'MSG91':
          result = await this.sendViaMSG91(mobileNumber, otp);
          break;
        case 'TEXTLOCAL':
          result = await this.sendViaTextLocal(mobileNumber, otp);
          break;
        case 'TWILIO':
          result = await this.sendViaTwilio(mobileNumber, otp);
          break;
        default:
          throw new Error('SMS Provider not configured');
      }

      return {
        success: result.success,
        provider,
        messageId: result.messageId,
        status: result.status
      };

    } catch (error) {
      console.error('SMS sending failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * MSG91 SMS Implementation
   */
  async sendViaMSG91(mobile, otp) {
    const { apiKey, baseUrl, senderId } = this.config.sms.msg91;
    
    const response = await fetch(`${baseUrl}?mobile=91${mobile}&message=Your PocketShield OTP is ${otp}&sender=${senderId}&route=4&country=91`, {
      method: 'POST',
      headers: {
        'authkey': apiKey,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    return {
      success: data.type === 'success',
      messageId: data.request_id,
      status: data.type
    };
  }

  /**
   * TextLocal SMS Implementation
   */
  async sendViaTextLocal(mobile, otp) {
    const { apiKey, baseUrl, senderId } = this.config.sms.textlocal;
    
    const params = new URLSearchParams({
      apikey: apiKey,
      numbers: `91${mobile}`,
      message: `Your PocketShield OTP is ${otp}. Valid for 5 minutes. Do not share.`,
      sender: senderId
    });

    const response = await fetch(baseUrl, {
      method: 'POST',
      body: params
    });

    const data = await response.json();
    
    return {
      success: data.status === 'success',
      messageId: data.messages?.[0]?.id,
      status: data.status
    };
  }

  /**
   * Twilio SMS Implementation
   */
  async sendViaTwilio(mobile, otp) {
    // Note: Requires twilio package - npm install twilio
    const twilio = require('twilio');
    const { accountSid, authToken, fromNumber } = this.config.sms.twilio;
    
    const client = twilio(accountSid, authToken);
    
    const message = await client.messages.create({
      body: `Your PocketShield OTP is ${otp}. Valid for 5 minutes.`,
      from: fromNumber,
      to: `+91${mobile}`
    });

    return {
      success: message.status === 'sent' || message.status === 'queued',
      messageId: message.sid,
      status: message.status
    };
  }

  /**
   * Send WhatsApp OTP via Real APIs
   */
  async sendWhatsAppOTP(mobileNumber, otp) {
    try {
      const provider = this.config.whatsapp.provider;
      let result;

      switch (provider) {
        case 'WHATSAPP_BUSINESS':
          result = await this.sendViaWhatsAppBusiness(mobileNumber, otp);
          break;
        case 'GUPSHUP':
          result = await this.sendViaGupshup(mobileNumber, otp);
          break;
        default:
          throw new Error('WhatsApp Provider not configured');
      }

      return {
        success: result.success,
        provider,
        messageId: result.messageId,
        status: result.status
      };

    } catch (error) {
      console.error('WhatsApp sending failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * WhatsApp Business API Implementation
   */
  async sendViaWhatsAppBusiness(mobile, otp) {
    const { accessToken, phoneNumberId, baseUrl } = this.config.whatsapp.business;
    
    const response = await fetch(`${baseUrl}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: `91${mobile}`,
        type: 'text',
        text: {
          body: `🛡️ PocketShield Security OTP: ${otp}\n\nValid for 5 minutes. Keep this confidential.`
        }
      })
    });

    const data = await response.json();
    
    return {
      success: !!data.messages?.[0]?.id,
      messageId: data.messages?.[0]?.id,
      status: data.messages?.[0]?.message_status || 'sent'
    };
  }

  /**
   * Gupshup WhatsApp Implementation
   */
  async sendViaGupshup(mobile, otp) {
    const { apiKey, baseUrl, botNumber } = this.config.whatsapp.gupshup;
    
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        channel: 'whatsapp',
        source: botNumber,
        destination: `91${mobile}`,
        message: JSON.stringify({
          type: 'text',
          text: `🛡️ PocketShield OTP: ${otp}\n\nValid for 5 minutes. Do not share with anyone.`
        })
      })
    });

    const data = await response.json();
    
    return {
      success: data.status === 'submitted',
      messageId: data.messageId,
      status: data.status
    };
  }

  /**
   * Production Send OTP Function
   */
  async sendOTP(mobileNumber) {
    try {
      const otp = this.generateOTP();
      
      // Store OTP
      this.otpStore.set(mobileNumber, {
        otp,
        timestamp: Date.now(),
        attempts: 0
      });

      // Send via both SMS and WhatsApp
      const [smsResult, whatsappResult] = await Promise.allSettled([
        this.sendSMSOTP(mobileNumber, otp),
        this.sendWhatsAppOTP(mobileNumber, otp)
      ]);

      const smsSuccess = smsResult.status === 'fulfilled' && smsResult.value.success;
      const whatsappSuccess = whatsappResult.status === 'fulfilled' && whatsappResult.value.success;

      return {
        success: smsSuccess || whatsappSuccess, // Success if either works
        otp: otp, // Remove in production
        sms: {
          success: smsSuccess,
          error: smsResult.status === 'rejected' ? smsResult.reason.message : null
        },
        whatsapp: {
          success: whatsappSuccess,
          error: whatsappResult.status === 'rejected' ? whatsappResult.reason.message : null
        },
        deliveryStatus: `📱 SMS: ${smsSuccess ? 'sent' : 'failed'} | 💬 WhatsApp: ${whatsappSuccess ? 'sent' : 'failed'}`
      };

    } catch (error) {
      console.error('OTP sending error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ... (keep existing verifyOTP and other methods)
}

export default new ProductionOTPService();
