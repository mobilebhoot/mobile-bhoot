import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuration
const API_BASE_URL = 'https://api.pocketshield.io'; // Replace with your actual API URL
const API_ENDPOINTS = {
  login: '/auth/login',
  signup: '/auth/signup',
  forgotPassword: '/auth/forgot-password',
  resetPassword: '/auth/reset-password',
  verifyEmail: '/auth/verify-email',
  refreshToken: '/auth/refresh-token',
  logout: '/auth/logout',
  socialAuth: '/auth/social',
};

class AuthAPIService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.accessToken = null;
    this.refreshToken = null;
    this.initialize();
  }

  async initialize() {
    try {
      this.accessToken = await AsyncStorage.getItem('accessToken');
      this.refreshToken = await AsyncStorage.getItem('refreshToken');
    } catch (error) {
      console.error('Failed to initialize auth tokens:', error);
    }
  }

  // Generic API request handler
  async apiRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add authorization header if we have a token
    if (this.accessToken && !options.skipAuth) {
      config.headers.Authorization = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        // Handle token expiration
        if (response.status === 401 && this.refreshToken) {
          const refreshed = await this.handleTokenRefresh();
          if (refreshed) {
            // Retry the original request with new token
            config.headers.Authorization = `Bearer ${this.accessToken}`;
            const retryResponse = await fetch(url, config);
            return await retryResponse.json();
          }
        }
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  // Handle token refresh
  async handleTokenRefresh() {
    try {
      const response = await fetch(`${this.baseURL}${API_ENDPOINTS.refreshToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: this.refreshToken,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        await this.storeTokens(data.accessToken, data.refreshToken);
        return true;
      } else {
        await this.clearTokens();
        return false;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      await this.clearTokens();
      return false;
    }
  }

  // Store authentication tokens
  async storeTokens(accessToken, refreshToken) {
    try {
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
      await AsyncStorage.setItem('accessToken', accessToken);
      await AsyncStorage.setItem('refreshToken', refreshToken);
    } catch (error) {
      console.error('Failed to store tokens:', error);
    }
  }

  // Clear authentication tokens
  async clearTokens() {
    try {
      this.accessToken = null;
      this.refreshToken = null;
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('refreshToken');
      await AsyncStorage.removeItem('userProfile');
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }

  // Store user profile
  async storeUserProfile(user) {
    try {
      await AsyncStorage.setItem('userProfile', JSON.stringify(user));
    } catch (error) {
      console.error('Failed to store user profile:', error);
    }
  }

  // Get stored user profile
  async getUserProfile() {
    try {
      const profile = await AsyncStorage.getItem('userProfile');
      return profile ? JSON.parse(profile) : null;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return null;
    }
  }

  // Email/Password Login
  async login(email, password) {
    try {
      const data = await this.apiRequest(API_ENDPOINTS.login, {
        method: 'POST',
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password: password,
        }),
      });

      if (data.success) {
        await this.storeTokens(data.accessToken, data.refreshToken);
        await this.storeUserProfile(data.user);
        
        return {
          success: true,
          user: data.user,
          requiresEmailVerification: data.requiresEmailVerification || false,
        };
      } else {
        return {
          success: false,
          error: data.message || 'Login failed',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Network error occurred',
      };
    }
  }

  // Email/Password Signup
  async signup(email, password, fullName) {
    try {
      const data = await this.apiRequest(API_ENDPOINTS.signup, {
        method: 'POST',
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password: password,
          fullName: fullName.trim(),
        }),
      });

      if (data.success) {
        // Some apps auto-login after signup, others require email verification
        if (data.accessToken) {
          await this.storeTokens(data.accessToken, data.refreshToken);
          await this.storeUserProfile(data.user);
        }
        
        return {
          success: true,
          user: data.user,
          requiresEmailVerification: data.requiresEmailVerification || false,
          message: data.message || 'Account created successfully',
        };
      } else {
        return {
          success: false,
          error: data.message || 'Signup failed',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Network error occurred',
      };
    }
  }

  // Password Reset Request
  async requestPasswordReset(email) {
    try {
      const data = await this.apiRequest(API_ENDPOINTS.forgotPassword, {
        method: 'POST',
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
        }),
      });

      return {
        success: data.success || false,
        message: data.message || 'If an account with this email exists, you will receive reset instructions.',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to send reset email',
      };
    }
  }

  // Password Reset (with token)
  async resetPassword(token, newPassword) {
    try {
      const data = await this.apiRequest(API_ENDPOINTS.resetPassword, {
        method: 'POST',
        body: JSON.stringify({
          token: token,
          newPassword: newPassword,
        }),
      });

      return {
        success: data.success || false,
        message: data.message || 'Password reset successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to reset password',
      };
    }
  }

  // Email Verification
  async verifyEmail(token) {
    try {
      const data = await this.apiRequest(API_ENDPOINTS.verifyEmail, {
        method: 'POST',
        body: JSON.stringify({
          token: token,
        }),
      });

      if (data.success && data.accessToken) {
        await this.storeTokens(data.accessToken, data.refreshToken);
        await this.storeUserProfile(data.user);
      }

      return {
        success: data.success || false,
        message: data.message || 'Email verified successfully',
        user: data.user,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Email verification failed',
      };
    }
  }

  // Social Authentication
  async socialAuth(provider, token, userInfo) {
    try {
      const data = await this.apiRequest(API_ENDPOINTS.socialAuth, {
        method: 'POST',
        body: JSON.stringify({
          provider: provider, // 'google', 'apple', 'facebook', etc.
          token: token,
          userInfo: userInfo,
        }),
      });

      if (data.success) {
        await this.storeTokens(data.accessToken, data.refreshToken);
        await this.storeUserProfile(data.user);
        
        return {
          success: true,
          user: data.user,
          isNewUser: data.isNewUser || false,
        };
      } else {
        return {
          success: false,
          error: data.message || 'Social authentication failed',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Network error occurred',
      };
    }
  }

  // Logout
  async logout() {
    try {
      if (this.accessToken) {
        await this.apiRequest(API_ENDPOINTS.logout, {
          method: 'POST',
        });
      }
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      await this.clearTokens();
    }

    return { success: true };
  }

  // Check if user is authenticated
  async isAuthenticated() {
    try {
      if (!this.accessToken) {
        await this.initialize();
      }
      
      if (!this.accessToken) {
        return false;
      }

      // Optionally verify token with backend
      // const data = await this.apiRequest('/auth/verify');
      // return data.valid;

      return true;
    } catch (error) {
      return false;
    }
  }

  // Get current user information
  async getCurrentUser() {
    try {
      if (!await this.isAuthenticated()) {
        return null;
      }

      const profile = await this.getUserProfile();
      return profile;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }
}

// Demo/Mock Implementation (remove when connecting to real backend)
class MockAuthAPIService extends AuthAPIService {
  async apiRequest(endpoint, options = {}) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1000));

    const body = options.body ? JSON.parse(options.body) : {};

    switch (endpoint) {
      case API_ENDPOINTS.login:
        return this.mockLogin(body);
      case API_ENDPOINTS.signup:
        return this.mockSignup(body);
      case API_ENDPOINTS.forgotPassword:
        return this.mockForgotPassword(body);
      default:
        return { success: true };
    }
  }

  async mockLogin({ email, password }) {
    // Demo: Accept any valid email/password combo
    if (email?.includes('@') && password?.length >= 8) {
      const mockUser = {
        id: 'demo-user-123',
        email: email,
        name: 'Demo User',
        avatar: null,
        emailVerified: true,
        createdAt: new Date().toISOString(),
      };

      const mockTokens = {
        accessToken: 'demo-access-token-' + Date.now(),
        refreshToken: 'demo-refresh-token-' + Date.now(),
      };

      return {
        success: true,
        user: mockUser,
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
        requiresEmailVerification: false,
      };
    } else {
      return {
        success: false,
        message: 'Invalid email or password',
      };
    }
  }

  async mockSignup({ email, password, fullName }) {
    if (email?.includes('@') && password?.length >= 8 && fullName?.trim()) {
      const mockUser = {
        id: 'demo-user-' + Date.now(),
        email: email,
        name: fullName,
        avatar: null,
        emailVerified: false,
        createdAt: new Date().toISOString(),
      };

      return {
        success: true,
        user: mockUser,
        requiresEmailVerification: true,
        message: 'Account created! Please check your email to verify your account.',
      };
    } else {
      return {
        success: false,
        message: 'Please check your information and try again',
      };
    }
  }

  async mockForgotPassword({ email }) {
    return {
      success: email?.includes('@'),
      message: email?.includes('@') 
        ? 'Password reset instructions have been sent to your email'
        : 'Please enter a valid email address',
    };
  }
}

// Export the appropriate service based on environment
// In production, use AuthAPIService and remove MockAuthAPIService
export default new MockAuthAPIService(); // Change to AuthAPIService for production
