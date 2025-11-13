/**
 * Breach Detection Service for Mobile App
 * Have I Been Pwned integration client
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

class BreachDetectionService {
  constructor() {
    // Production backend API configuration
    this.baseURL = __DEV__ 
      ? 'http://localhost:3000/api' 
      : 'https://api.pocketshield.app/api';
    
    this.endpoints = {
      checkEmail: '/breach/check-email',
      checkPassword: '/breach/check-password',
      comprehensiveCheck: '/breach/comprehensive-check',
      checkPastes: '/breach/check-pastes',
      serviceStats: '/breach/service-stats',
      health: '/breach/health'
    };

    // Cache for results (24 hours)
    this.cacheTimeout = 24 * 60 * 60 * 1000;
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
   * Make API request with proper headers
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
      console.error(`Breach API Request failed (${endpoint}):`, error);
      throw error;
    }
  }

  /**
   * Check if email has been in data breaches
   */
  async checkEmailBreaches(email) {
    try {
      // Check cache first
      const cacheKey = `breach_email_${email.toLowerCase()}`;
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        console.log(`📋 Returning cached breach data for ${email}`);
        return cached;
      }

      console.log(`🔍 Checking breaches for email: ${email}`);

      const response = await this.makeRequest(this.endpoints.checkEmail, 'POST', { email });

      if (response.success) {
        // Cache the result
        await this.saveToCache(cacheKey, response.data);
        
        console.log(`✅ Email breach check completed: ${response.data.breached ? response.data.breachCount + ' breaches' : 'No breaches'}`);
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to check email breaches');
      }

    } catch (error) {
      console.error('❌ Email breach check failed:', error);
      throw error;
    }
  }

  /**
   * Check if password has been compromised
   */
  async checkPasswordSecurity(password) {
    try {
      console.log('🔐 Checking password security using k-anonymity');

      const response = await this.makeRequest(this.endpoints.checkPassword, 'POST', { password });

      if (response.success) {
        console.log(`✅ Password security check completed: ${response.data.compromised ? 'COMPROMISED' : 'SECURE'}`);
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to check password security');
      }

    } catch (error) {
      console.error('❌ Password security check failed:', error);
      throw error;
    }
  }

  /**
   * Comprehensive security check
   */
  async comprehensiveSecurityCheck(email, password = null) {
    try {
      console.log('🛡️ Running comprehensive security check');

      const requestBody = { email };
      if (password) {
        requestBody.password = password;
      }

      const response = await this.makeRequest(this.endpoints.comprehensiveCheck, 'POST', requestBody);

      if (response.success) {
        console.log(`✅ Comprehensive check completed - Security Score: ${response.data.securityScore}/100`);
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to perform comprehensive security check');
      }

    } catch (error) {
      console.error('❌ Comprehensive security check failed:', error);
      throw error;
    }
  }

  /**
   * Check paste records (requires API key)
   */
  async checkPastes(email) {
    try {
      console.log(`🔍 Checking paste records for: ${email}`);

      const response = await this.makeRequest(this.endpoints.checkPastes, 'POST', { email });

      if (response.success) {
        console.log(`✅ Paste check completed: ${response.data.pastesFound ? response.data.pasteCount + ' pastes' : 'No pastes'}`);
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to check paste records');
      }

    } catch (error) {
      console.error('❌ Paste check failed:', error);
      throw error;
    }
  }

  /**
   * Get service statistics
   */
  async getServiceStats() {
    try {
      const response = await this.makeRequest(this.endpoints.serviceStats);
      return response.success ? response.data : null;
    } catch (error) {
      console.error('Failed to get service stats:', error);
      return null;
    }
  }

  /**
   * Check service health
   */
  async checkHealth() {
    try {
      const response = await this.makeRequest(this.endpoints.health);
      return response;
    } catch (error) {
      console.error('Health check failed:', error);
      return { status: 'unhealthy', error: error.message };
    }
  }

  /**
   * Validate email format
   */
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Get breach statistics for display
   */
  getBreachStatistics(results) {
    if (!results) return null;

    const stats = {
      totalBreaches: 0,
      recentBreaches: 0,
      criticalBreaches: 0,
      totalAccounts: 0
    };

    if (results.breaches && results.breaches.breached) {
      stats.totalBreaches = results.breaches.breachCount;
      
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

      results.breaches.breaches.forEach(breach => {
        // Count recent breaches
        if (new Date(breach.breachDate) > twoYearsAgo) {
          stats.recentBreaches++;
        }
        
        // Count critical breaches (contain passwords)
        if (breach.dataClasses && breach.dataClasses.includes('Passwords')) {
          stats.criticalBreaches++;
        }
        
        // Sum total accounts affected
        stats.totalAccounts += breach.pwnCount || 0;
      });
    }

    return stats;
  }

  /**
   * Get security recommendations based on results
   */
  getSecurityRecommendations(results) {
    const recommendations = [];

    if (results.breaches?.breached) {
      recommendations.push({
        type: 'critical',
        icon: '🚨',
        title: 'Data Breaches Found',
        description: 'Your email was found in data breaches. Change passwords immediately.',
        action: 'Change Passwords'
      });
    }

    if (results.password?.compromised) {
      recommendations.push({
        type: 'critical',
        icon: '🔐',
        title: 'Compromised Password',
        description: 'This password has been exposed. Use a unique, strong password.',
        action: 'Change Password'
      });
    }

    if (results.securityScore < 60) {
      recommendations.push({
        type: 'warning',
        icon: '🛡️',
        title: 'Enable Enhanced Security',
        description: 'Your security score is low. Enable 2FA and use a password manager.',
        action: 'Secure Account'
      });
    }

    // Always include general recommendations
    recommendations.push({
      type: 'info',
      icon: '💡',
      title: 'Best Practices',
      description: 'Use unique passwords, enable 2FA, and monitor accounts regularly.',
      action: 'Learn More'
    });

    return recommendations;
  }

  /**
   * Save data to cache
   */
  async saveToCache(key, data) {
    try {
      const cacheItem = {
        data,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem(key, JSON.stringify(cacheItem));
    } catch (error) {
      console.error('Failed to save to cache:', error);
    }
  }

  /**
   * Get data from cache
   */
  async getFromCache(key) {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (!cached) return null;

      const cacheItem = JSON.parse(cached);
      
      // Check if cache is still valid
      if (Date.now() - cacheItem.timestamp > this.cacheTimeout) {
        await AsyncStorage.removeItem(key);
        return null;
      }

      return cacheItem.data;
    } catch (error) {
      console.error('Failed to get from cache:', error);
      return null;
    }
  }

  /**
   * Clear all cached breach data
   */
  async clearCache() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const breachKeys = keys.filter(key => key.startsWith('breach_'));
      await AsyncStorage.multiRemove(breachKeys);
      console.log('🧹 Breach detection cache cleared');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  /**
   * Format breach data for display
   */
  formatBreachesForDisplay(breaches) {
    if (!breaches || !breaches.length) return [];

    return breaches.map(breach => ({
      name: breach.name || breach.title,
      title: breach.title,
      date: breach.breachDate,
      accounts: breach.pwnCount,
      dataTypes: breach.dataClasses || [],
      severity: this.getBreachSeverity(breach),
      description: breach.description
    })).sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  /**
   * Determine breach severity
   */
  getBreachSeverity(breach) {
    if (!breach.dataClasses) return 'low';
    
    const sensitiveData = ['Passwords', 'Social security numbers', 'Credit card numbers'];
    const hasSensitive = breach.dataClasses.some(dc => sensitiveData.includes(dc));
    
    if (hasSensitive) return 'critical';
    if (breach.dataClasses.includes('Email addresses')) return 'medium';
    return 'low';
  }

  /**
   * Get risk level color
   */
  getRiskColor(riskLevel) {
    const colors = {
      low: '#4CAF50',
      safe: '#4CAF50',
      medium: '#FF9800',
      high: '#FF5722',
      critical: '#F44336'
    };
    return colors[riskLevel] || '#9E9E9E';
  }

  /**
   * Get risk level icon
   */
  getRiskIcon(riskLevel) {
    const icons = {
      low: 'shield-checkmark',
      safe: 'shield-checkmark',
      medium: 'warning',
      high: 'alert',
      critical: 'skull'
    };
    return icons[riskLevel] || 'help';
  }
}

export default new BreachDetectionService();
