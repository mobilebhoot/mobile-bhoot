import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';

class ProductionOTPService {
  constructor() {
    // Production backend API configuration
    this.baseURL = __DEV__ 
      ? 'http://localhost:3000/api' 
      : 'https://api.pocketshield.app/api';
    
    this.endpoints = {
      sendOTP: '/otp/send',
      verifyOTP: '/otp/verify',
      resendOTP: '/otp/resend',
      otpStatus: '/otp/status'
    };
  }

  // Validate Indian mobile number
  validateIndianMobile(number) {
    const cleanNumber = number.replace(/\s/g, '');
    // Indian mobile: starts with 6-9 and has 10 digits
    return /^[6-9]\d{9}$/.test(cleanNumber);
  }

  // Get stored auth token
  async getAuthToken() {
    try {
      return await AsyncStorage.getItem('authToken');
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return null;
    }
  }

  // Make API request with proper headers
  async makeRequest(endpoint, method = 'GET', body = null) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const token = await this.getAuthToken();
      
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const config = {
        method,
        headers,
        timeout: 30000,
      };

      if (body && (method === 'POST' || method === 'PUT')) {
        config.body = JSON.stringify(body);
      }

      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;

    } catch (error) {
      console.error(`API Request failed (${endpoint}):`, error);
      throw error;
    }
  }

  // Send OTP via Real APIs (SMS + WhatsApp)
  async sendOTP(mobileNumber, options = {}) {
    try {
      console.log(`📡 Sending OTP via production APIs to +91${mobileNumber}`);

      const requestBody = {
        phoneNumber: mobileNumber,
        enableSMS: options.enableSMS !== false,
        enableWhatsApp: options.enableWhatsApp !== false,
        templateId: options.templateId
      };

      const response = await this.makeRequest(this.endpoints.sendOTP, 'POST', requestBody);

      if (response.success) {
        console.log(`✅ OTP sent successfully via ${response.channels?.length || 0} channel(s)`);
        
        // Log delivery channels
        response.channels?.forEach(channel => {
          console.log(`📨 ${channel.channel.toUpperCase()}: ${channel.status} (${channel.provider})`);
        });

        // For development: Copy OTP to clipboard if provided
        if (__DEV__ && response.otp) {
          await Clipboard.setStringAsync(response.otp);
          console.log(`📋 DEV MODE: OTP ${response.otp} copied to clipboard`);
        }

        return {
          success: true,
          message: response.message,
          channels: response.channels,
          expiresIn: response.expiresIn,
          deliveryStatus: this.formatDeliveryStatus(response.channels),
          // Include OTP only in development
          ...((__DEV__ && response.otp) && { otp: response.otp })
        };
      } else {
        throw new Error(response.error || 'Failed to send OTP');
      }

    } catch (error) {
      console.error('❌ Production OTP sending failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to send OTP. Please check your network connection.'
      };
    }
  }

  // Format delivery status for display
  formatDeliveryStatus(channels) {
    if (!channels || channels.length === 0) {
      return 'No channels available';
    }

    return channels.map(channel => {
      const icon = channel.channel === 'sms' ? '📱' : '💬';
      return `${icon} ${channel.channel.toUpperCase()}: ${channel.status}`;
    }).join(' | ');
  }

  // Verify OTP via Production API
  async verifyOTP(mobileNumber, enteredOtp) {
    try {
      console.log(`📡 Verifying OTP for +91${mobileNumber}`);

      const requestBody = {
        phoneNumber: mobileNumber,
        otp: enteredOtp
      };

      const response = await this.makeRequest(this.endpoints.verifyOTP, 'POST', requestBody);

      if (response.success) {
        console.log(`✅ OTP verified successfully for +91${mobileNumber}`);
        return {
          success: true,
          message: response.message,
          phoneNumber: response.phoneNumber
        };
      } else {
        console.log(`❌ OTP verification failed: ${response.error}`);
        return {
          success: false,
          error: response.error,
          remainingAttempts: response.remainingAttempts
        };
      }

    } catch (error) {
      console.error('❌ Production OTP verification failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to verify OTP'
      };
    }
  }

  // Create user account via API
  async createUser(mobileNumber, name) {
    try {
      console.log(`📡 Creating user account for +91${mobileNumber}`);

      const requestBody = {
        phoneNumber: mobileNumber,
        name: name.trim()
      };

      // This would be a separate API endpoint
      const response = await this.makeRequest('/auth/register', 'POST', requestBody);

      if (response.success) {
        console.log(`✅ User account created successfully`);
        
        // Store auth token if provided
        if (response.token) {
          await AsyncStorage.setItem('authToken', response.token);
        }

        return {
          success: true,
          user: response.user,
          token: response.token,
          message: response.message
        };
      } else {
        throw new Error(response.error || 'Failed to create account');
      }

    } catch (error) {
      console.error('❌ User creation failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to create account'
      };
    }
  }

  // Resend OTP
  async resendOTP(mobileNumber, options = {}) {
    try {
      console.log(`📡 Resending OTP to +91${mobileNumber}`);

      const requestBody = {
        phoneNumber: mobileNumber,
        enableSMS: options.enableSMS !== false,
        enableWhatsApp: options.enableWhatsApp !== false
      };

      const response = await this.makeRequest(this.endpoints.resendOTP, 'POST', requestBody);

      if (response.success) {
        console.log(`✅ OTP resent successfully`);
        
        // For development: Copy OTP to clipboard if provided
        if (__DEV__ && response.otp) {
          await Clipboard.setStringAsync(response.otp);
          console.log(`📋 DEV MODE: New OTP ${response.otp} copied to clipboard`);
        }

        return {
          success: true,
          message: response.message,
          channels: response.channels,
          expiresIn: response.expiresIn,
          deliveryStatus: this.formatDeliveryStatus(response.channels),
          ...((__DEV__ && response.otp) && { otp: response.otp })
        };
      } else {
        throw new Error(response.error || 'Failed to resend OTP');
      }

    } catch (error) {
      console.error('❌ OTP resend failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to resend OTP'
      };
    }
  }

  // Get OTP delivery status
  async getOTPStatus(mobileNumber) {
    try {
      const response = await this.makeRequest(`${this.endpoints.otpStatus}/${mobileNumber}`);
      return response;
    } catch (error) {
      console.error('❌ Get OTP status failed:', error);
      return { status: 'error', error: error.message };
    }
  }

  // Auto-read OTP from clipboard (for development)
  async startAutoOTPReading(callback) {
    if (!__DEV__) {
      console.log('Auto OTP reading disabled in production');
      return;
    }

    let attempts = 0;
    const maxAttempts = 60; // Check for 1 minute
    
    console.log('🔍 Starting auto OTP detection...');
    
    const checkClipboard = async () => {
      try {
        const clipboardContent = await Clipboard.getStringAsync();
        
        // Look for 6-digit OTP in clipboard
        const otpMatch = clipboardContent.match(/\b\d{6}\b/);
        if (otpMatch) {
          const detectedOtp = otpMatch[0];
          console.log(`📋 Auto-detected OTP: ${detectedOtp}`);
          callback(detectedOtp);
          return true; // Found OTP
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkClipboard, 1000); // Check every second
        } else {
          console.log('🔍 Auto OTP detection timeout');
        }
        
      } catch (error) {
        console.error('Auto OTP reading error:', error);
      }
      
      return false;
    };

    checkClipboard();
  }

  // Check backend health
  async checkHealth() {
    try {
      const response = await this.makeRequest('/otp/health');
      return response;
    } catch (error) {
      console.error('❌ Backend health check failed:', error);
      return { status: 'unhealthy', error: error.message };
    }
  }
}

export default new ProductionOTPService();
