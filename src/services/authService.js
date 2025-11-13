/**
 * Enhanced Authentication Service
 * Supports Gmail, Mobile OTP, and Demo authentication
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Google from 'expo-auth-session/providers/google';

class AuthService {
  constructor() {
    // Production backend API configuration
    this.baseURL = __DEV__ 
      ? 'http://localhost:3000/api' 
      : 'https://api.pocketshield.app/api';
    
    this.endpoints = {
      googleAuth: '/auth/google',
      mobileAuth: '/auth/mobile',
      refreshToken: '/auth/refresh',
      logout: '/auth/logout',
      profile: '/auth/profile'
    };
  }

  /**
   * Make authenticated API request
   */
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
      console.error(`Auth API Request failed (${endpoint}):`, error);
      throw error;
    }
  }

  /**
   * Get stored auth token
   */
  async getAuthToken() {
    try {
      return await AsyncStorage.getItem('authToken');
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return null;
    }
  }

  /**
   * Get stored user info
   */
  async getUserInfo() {
    try {
      const userInfo = await AsyncStorage.getItem('userInfo');
      return userInfo ? JSON.parse(userInfo) : null;
    } catch (error) {
      console.error('Failed to get user info:', error);
      return null;
    }
  }

  /**
   * Store authentication data
   */
  async storeAuthData(authToken, refreshToken, userInfo) {
    try {
      await AsyncStorage.setItem('authToken', authToken);
      if (refreshToken) {
        await AsyncStorage.setItem('authRefreshToken', refreshToken);
      }
      await AsyncStorage.setItem('userInfo', JSON.stringify(userInfo));
      
      console.log('✅ Authentication data stored successfully');
    } catch (error) {
      console.error('❌ Failed to store auth data:', error);
      throw error;
    }
  }

  /**
   * Authenticate with Google
   */
  async authenticateWithGoogle(googleUserInfo, googleAuthToken) {
    try {
      console.log('🔐 Processing Google authentication');

      // Send Google auth data to backend for verification and user creation
      const response = await this.makeRequest(this.endpoints.googleAuth, 'POST', {
        googleToken: googleAuthToken,
        userInfo: {
          id: googleUserInfo.id,
          email: googleUserInfo.email,
          name: googleUserInfo.name,
          picture: googleUserInfo.picture
        }
      });

      if (response.success) {
        // Store authentication data
        await this.storeAuthData(
          response.authToken,
          response.refreshToken,
          {
            ...response.user,
            authMethod: 'gmail',
            loginTime: new Date().toISOString(),
            picture: googleUserInfo.picture
          }
        );

        console.log('✅ Google authentication successful');
        return {
          success: true,
          user: response.user,
          message: 'Successfully authenticated with Google'
        };
      } else {
        throw new Error(response.error || 'Google authentication failed');
      }

    } catch (error) {
      console.error('❌ Google authentication failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to authenticate with Google'
      };
    }
  }

  /**
   * Create test session for skip login
   */
  async createTestSession() {
    try {
      console.log('🧪 Creating test session');

      const testUser = {
        id: 'test_user_' + Date.now(),
        name: 'Test User',
        email: 'test@pocketshield.app',
        authMethod: 'skip_login',
        loginTime: new Date().toISOString(),
        isTestMode: true
      };

      // Store test session data
      await AsyncStorage.setItem('authToken', 'test_token_' + Date.now());
      await AsyncStorage.setItem('userInfo', JSON.stringify(testUser));

      console.log('✅ Test session created');
      return {
        success: true,
        user: testUser,
        message: 'Test session created successfully'
      };

    } catch (error) {
      console.error('❌ Failed to create test session:', error);
      return {
        success: false,
        error: 'Failed to create test session'
      };
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated() {
    try {
      const authToken = await this.getAuthToken();
      const userInfo = await this.getUserInfo();
      
      if (!authToken || !userInfo) {
        return false;
      }

      // For test mode or demo mode, always return true
      if (userInfo.isTestMode || userInfo.isDemoMode) {
        return true;
      }

      // For real authentication, check token validity with backend
      try {
        const response = await this.makeRequest(this.endpoints.profile);
        return response.success;
      } catch (error) {
        // Token might be expired, try to refresh
        return await this.refreshAuthToken();
      }

    } catch (error) {
      console.error('Failed to check authentication:', error);
      return false;
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshAuthToken() {
    try {
      const refreshToken = await AsyncStorage.getItem('authRefreshToken');
      
      if (!refreshToken) {
        return false;
      }

      const response = await this.makeRequest(this.endpoints.refreshToken, 'POST', {
        refreshToken
      });

      if (response.success) {
        await AsyncStorage.setItem('authToken', response.authToken);
        console.log('✅ Auth token refreshed');
        return true;
      } else {
        // Refresh failed, user needs to login again
        await this.logout();
        return false;
      }

    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      await this.logout();
      return false;
    }
  }

  /**
   * Logout user
   */
  async logout() {
    try {
      console.log('🔓 Logging out user');

      // Try to notify backend about logout
      try {
        await this.makeRequest(this.endpoints.logout, 'POST');
      } catch (error) {
        // Ignore backend errors during logout
        console.log('Backend logout notification failed:', error.message);
      }

      // Clear local storage
      await AsyncStorage.multiRemove([
        'authToken',
        'authRefreshToken',
        'userInfo'
      ]);

      console.log('✅ Logout successful');
      return { success: true };

    } catch (error) {
      console.error('❌ Logout failed:', error);
      return {
        success: false,
        error: 'Failed to logout properly'
      };
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(profileData) {
    try {
      console.log('👤 Updating user profile');

      const response = await this.makeRequest(this.endpoints.profile, 'PUT', profileData);

      if (response.success) {
        // Update local user info
        const currentUserInfo = await this.getUserInfo();
        const updatedUserInfo = { ...currentUserInfo, ...response.user };
        await AsyncStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));

        console.log('✅ Profile updated successfully');
        return {
          success: true,
          user: updatedUserInfo
        };
      } else {
        throw new Error(response.error || 'Profile update failed');
      }

    } catch (error) {
      console.error('❌ Profile update failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to update profile'
      };
    }
  }

  /**
   * Get authentication method for current user
   */
  async getAuthMethod() {
    try {
      const userInfo = await this.getUserInfo();
      return userInfo ? userInfo.authMethod : null;
    } catch (error) {
      console.error('Failed to get auth method:', error);
      return null;
    }
  }

  /**
   * Check if current session is demo mode
   */
  async isDemoMode() {
    try {
      const userInfo = await this.getUserInfo();
      return userInfo ? userInfo.isDemoMode === true : false;
    } catch (error) {
      console.error('Failed to check demo mode:', error);
      return false;
    }
  }

  /**
   * Check if current session is test mode
   */
  async isTestMode() {
    try {
      const userInfo = await this.getUserInfo();
      return userInfo ? userInfo.isTestMode === true : false;
    } catch (error) {
      console.error('Failed to check test mode:', error);
      return false;
    }
  }

  /**
   * Check if current session is demo or test mode
   */
  async isOfflineMode() {
    try {
      const isDemo = await this.isDemoMode();
      const isTest = await this.isTestMode();
      return isDemo || isTest;
    } catch (error) {
      console.error('Failed to check offline mode:', error);
      return false;
    }
  }

  /**
   * Get user's security score (if available)
   */
  async getSecurityScore() {
    try {
      if (await this.isOfflineMode()) {
        // Return demo/test data
        return {
          score: 75,
          level: 'Good',
          lastUpdated: new Date().toISOString(),
          mode: await this.isTestMode() ? 'test' : 'demo'
        };
      }

      const response = await this.makeRequest('/security/score');
      return response.success ? response.data : null;

    } catch (error) {
      console.error('Failed to get security score:', error);
      return null;
    }
  }

  /**
   * Clear all auth data (for testing/debugging)
   */
  async clearAuthData() {
    try {
      await AsyncStorage.multiRemove([
        'authToken',
        'authRefreshToken',
        'userInfo'
      ]);
      console.log('✅ All auth data cleared');
    } catch (error) {
      console.error('❌ Failed to clear auth data:', error);
    }
  }
}

export default new AuthService();