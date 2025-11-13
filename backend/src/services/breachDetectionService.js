/**
 * Have I Been Pwned Integration Service
 * Check emails and passwords for known data breaches
 */

const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { validateEmail } = require('../utils/validation');

class BreachDetectionService {
  constructor() {
    this.baseURL = 'https://haveibeenpwned.com/api/v3';
    this.apiKey = process.env.HIBP_API_KEY; // Optional for enhanced features
    this.userAgent = 'PocketShield-Security-App';
    
    // Rate limiting for API calls
    this.lastRequestTime = 0;
    this.minRequestInterval = 1500; // 1.5 seconds between requests (API requirement)
    
    // Cache for reducing API calls
    this.cache = new Map();
    this.cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Check if email has been in data breaches
   */
  async checkEmailBreaches(email) {
    try {
      if (!validateEmail(email)) {
        throw new Error('Invalid email format');
      }

      // Check cache first
      const cacheKey = `breach_${email.toLowerCase()}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        logger.info(`Returning cached breach data for ${email}`);
        return cached.data;
      }

      // Rate limiting
      await this.enforceRateLimit();

      const headers = {
        'User-Agent': this.userAgent,
        'Accept': 'application/json'
      };

      // Add API key if available (for enhanced features)
      if (this.apiKey) {
        headers['hibp-api-key'] = this.apiKey;
      }

      logger.info(`Checking breaches for email: ${email}`);

      const response = await axios.get(
        `${this.baseURL}/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`,
        {
          headers,
          timeout: 10000,
          validateStatus: (status) => status === 200 || status === 404
        }
      );

      let result;

      if (response.status === 404) {
        // No breaches found
        result = {
          email,
          breached: false,
          breachCount: 0,
          breaches: [],
          riskLevel: 'low',
          message: 'Good news! This email address was not found in any known data breaches.',
          checkedAt: new Date().toISOString()
        };
      } else {
        // Breaches found
        const breaches = response.data || [];
        const highRiskBreaches = breaches.filter(b => 
          b.DataClasses && (
            b.DataClasses.includes('Passwords') ||
            b.DataClasses.includes('Email addresses') ||
            b.DataClasses.includes('Social security numbers')
          )
        );

        const riskLevel = this.calculateRiskLevel(breaches);

        result = {
          email,
          breached: true,
          breachCount: breaches.length,
          breaches: breaches.map(breach => ({
            name: breach.Name,
            title: breach.Title,
            domain: breach.Domain,
            breachDate: breach.BreachDate,
            addedDate: breach.AddedDate,
            modifiedDate: breach.ModifiedDate,
            pwnCount: breach.PwnCount,
            description: breach.Description,
            dataClasses: breach.DataClasses,
            isVerified: breach.IsVerified,
            isFabricated: breach.IsFabricated,
            isSpamList: breach.IsSpamList,
            isRetired: breach.IsRetired,
            isSensitive: breach.IsSensitive,
            logoPath: breach.LogoPath
          })),
          highRiskBreaches: highRiskBreaches.length,
          riskLevel,
          message: `Alert! This email was found in ${breaches.length} data breach${breaches.length > 1 ? 'es' : ''}.`,
          checkedAt: new Date().toISOString()
        };
      }

      // Cache the result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      logger.info(`Breach check completed for ${email}: ${result.breached ? result.breachCount + ' breaches found' : 'No breaches'}`);

      return result;

    } catch (error) {
      if (error.response?.status === 429) {
        logger.warn('Have I Been Pwned rate limit exceeded');
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      
      logger.error('Breach detection error:', error);
      throw error;
    }
  }

  /**
   * Check if password has been compromised (using k-anonymity)
   */
  async checkPasswordCompromised(password) {
    try {
      if (!password || password.length < 4) {
        throw new Error('Password too short for checking');
      }

      // Rate limiting
      await this.enforceRateLimit();

      // Hash the password with SHA-1
      const sha1Hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
      const hashPrefix = sha1Hash.substring(0, 5);
      const hashSuffix = sha1Hash.substring(5);

      logger.info(`Checking password compromise using k-anonymity (prefix: ${hashPrefix})`);

      const response = await axios.get(
        `https://api.pwnedpasswords.com/range/${hashPrefix}`,
        {
          headers: {
            'User-Agent': this.userAgent
          },
          timeout: 10000
        }
      );

      const hashLines = response.data.split('\n');
      let compromisedCount = 0;

      for (const line of hashLines) {
        const [suffix, count] = line.split(':');
        if (suffix === hashSuffix) {
          compromisedCount = parseInt(count);
          break;
        }
      }

      const result = {
        compromised: compromisedCount > 0,
        occurrences: compromisedCount,
        riskLevel: this.getPasswordRiskLevel(compromisedCount),
        message: compromisedCount > 0 
          ? `This password has been seen ${compromisedCount.toLocaleString()} times in data breaches.`
          : 'This password has not been found in known data breaches.',
        recommendations: this.getPasswordRecommendations(compromisedCount),
        checkedAt: new Date().toISOString()
      };

      logger.info(`Password check completed: ${compromisedCount > 0 ? 'COMPROMISED' : 'SAFE'} (${compromisedCount} occurrences)`);

      return result;

    } catch (error) {
      logger.error('Password compromise check error:', error);
      throw error;
    }
  }

  /**
   * Get paste records for email (requires API key)
   */
  async checkPastes(email) {
    if (!this.apiKey) {
      throw new Error('API key required for paste checking');
    }

    try {
      await this.enforceRateLimit();

      const response = await axios.get(
        `${this.baseURL}/pasteaccount/${encodeURIComponent(email)}`,
        {
          headers: {
            'User-Agent': this.userAgent,
            'hibp-api-key': this.apiKey
          },
          timeout: 10000,
          validateStatus: (status) => status === 200 || status === 404
        }
      );

      if (response.status === 404) {
        return {
          email,
          pastesFound: false,
          pasteCount: 0,
          pastes: []
        };
      }

      const pastes = response.data || [];

      return {
        email,
        pastesFound: true,
        pasteCount: pastes.length,
        pastes: pastes.map(paste => ({
          source: paste.Source,
          id: paste.Id,
          title: paste.Title,
          date: paste.Date,
          emailCount: paste.EmailCount
        }))
      };

    } catch (error) {
      logger.error('Paste check error:', error);
      throw error;
    }
  }

  /**
   * Comprehensive security check for email and password
   */
  async comprehensiveSecurityCheck(email, password = null) {
    try {
      const results = {
        email,
        timestamp: new Date().toISOString()
      };

      // Check email breaches
      const breachResult = await this.checkEmailBreaches(email);
      results.breaches = breachResult;

      // Check password if provided
      if (password) {
        const passwordResult = await this.checkPasswordCompromised(password);
        results.password = passwordResult;
      }

      // Calculate overall security score
      results.securityScore = this.calculateSecurityScore(results);
      results.overallRisk = this.getOverallRiskLevel(results.securityScore);
      results.recommendations = this.getSecurityRecommendations(results);

      return results;

    } catch (error) {
      logger.error('Comprehensive security check error:', error);
      throw error;
    }
  }

  /**
   * Calculate risk level based on breach data
   */
  calculateRiskLevel(breaches) {
    if (!breaches || breaches.length === 0) return 'low';
    
    const criticalBreaches = breaches.filter(b => 
      b.DataClasses && b.DataClasses.includes('Passwords')
    ).length;
    
    const recentBreaches = breaches.filter(b => {
      const breachDate = new Date(b.BreachDate);
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      return breachDate > twoYearsAgo;
    }).length;

    if (criticalBreaches > 2 || recentBreaches > 3) return 'critical';
    if (criticalBreaches > 0 || breaches.length > 5) return 'high';
    if (breaches.length > 2) return 'medium';
    return 'low';
  }

  /**
   * Get password risk level based on occurrence count
   */
  getPasswordRiskLevel(occurrences) {
    if (occurrences === 0) return 'safe';
    if (occurrences < 10) return 'low';
    if (occurrences < 100) return 'medium';
    if (occurrences < 1000) return 'high';
    return 'critical';
  }

  /**
   * Calculate overall security score (0-100)
   */
  calculateSecurityScore(results) {
    let score = 100;

    // Email breach penalties
    if (results.breaches?.breached) {
      score -= Math.min(results.breaches.breachCount * 10, 50);
      score -= results.breaches.highRiskBreaches * 15;
    }

    // Password compromise penalties
    if (results.password?.compromised) {
      const occurrences = results.password.occurrences;
      if (occurrences > 1000000) score -= 40;
      else if (occurrences > 100000) score -= 30;
      else if (occurrences > 10000) score -= 20;
      else if (occurrences > 1000) score -= 15;
      else score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get overall risk level based on security score
   */
  getOverallRiskLevel(score) {
    if (score >= 80) return 'low';
    if (score >= 60) return 'medium';
    if (score >= 40) return 'high';
    return 'critical';
  }

  /**
   * Get password security recommendations
   */
  getPasswordRecommendations(occurrences) {
    const recommendations = [];

    if (occurrences > 0) {
      recommendations.push('🔴 Change this password immediately');
      recommendations.push('🔒 Use a unique password for each account');
      recommendations.push('🎯 Consider using a password manager');
    } else {
      recommendations.push('✅ This password appears to be safe');
      recommendations.push('🔒 Continue using unique passwords for each account');
    }

    recommendations.push('🔐 Enable two-factor authentication where possible');
    return recommendations;
  }

  /**
   * Get comprehensive security recommendations
   */
  getSecurityRecommendations(results) {
    const recommendations = [];

    if (results.breaches?.breached) {
      recommendations.push('🚨 Your email was found in data breaches');
      recommendations.push('🔄 Change passwords for affected accounts');
      recommendations.push('👀 Monitor accounts for suspicious activity');
    }

    if (results.password?.compromised) {
      recommendations.push('🔴 Your password has been compromised');
      recommendations.push('🔑 Use a password manager for unique passwords');
    }

    if (results.securityScore < 60) {
      recommendations.push('🛡️ Enable PocketShield real-time monitoring');
      recommendations.push('📧 Set up breach notification alerts');
    }

    recommendations.push('🔐 Enable two-factor authentication');
    recommendations.push('🎯 Regular security checkups recommended');

    return recommendations;
  }

  /**
   * Rate limiting enforcement
   */
  async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      logger.debug(`Rate limiting: waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Get service statistics
   */
  getServiceStats() {
    return {
      apiBaseURL: this.baseURL,
      hasApiKey: !!this.apiKey,
      cacheSize: this.cache.size,
      rateLimitInterval: this.minRequestInterval,
      features: {
        emailBreachCheck: true,
        passwordCheck: true,
        pasteCheck: !!this.apiKey,
        comprehensiveCheck: true
      }
    };
  }

  /**
   * Clear cache (for testing or memory management)
   */
  clearCache() {
    this.cache.clear();
    logger.info('Breach detection cache cleared');
  }
}

module.exports = new BreachDetectionService();
