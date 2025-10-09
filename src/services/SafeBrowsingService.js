import SecurityEvents from '../models/SecurityEvents';

class SafeBrowsingService {
  constructor() {
    this.apiKey = null; // Set your Google Safe Browsing API key here
    this.baseUrl = 'https://safebrowsing.googleapis.com/v4/threatMatches:find';
    this.threatTypes = [
      'MALWARE',
      'SOCIAL_ENGINEERING',
      'UNWANTED_SOFTWARE',
      'POTENTIALLY_HARMFUL_APPLICATION'
    ];
    this.platformTypes = ['ANY_PLATFORM'];
    this.threatEntryTypes = ['URL'];
    
    // Local threat intelligence cache
    this.localThreatDB = new Map();
    this.lastUpdate = null;
    this.updateInterval = 24 * 60 * 60 * 1000; // 24 hours
  }

  // Initialize the service
  async initialize() {
    await SecurityEvents.loadEvents();
    await this.updateLocalThreatDB();
  }

  // Check a URL for threats
  async checkUrl(url) {
    try {
      // First check local database
      const localResult = this.checkLocalThreatDB(url);
      if (localResult.isThreat) {
        return localResult;
      }

      // Then check with Google Safe Browsing API if available
      if (this.apiKey) {
        const apiResult = await this.checkWithGoogleAPI(url);
        if (apiResult.isThreat) {
          // Cache the result
          this.localThreatDB.set(url, {
            isThreat: true,
            threatType: apiResult.threatType,
            timestamp: Date.now(),
          });
          return apiResult;
        }
      }

      // Check with built-in patterns
      const patternResult = SecurityEvents.checkUrl(url);
      if (patternResult.isSuspicious) {
        return {
          isThreat: true,
          threatType: 'SUSPICIOUS_PATTERN',
          confidence: patternResult.riskScore / 100,
          reasons: patternResult.reasons,
          riskLevel: patternResult.riskLevel,
        };
      }

      return {
        isThreat: false,
        threatType: null,
        confidence: 0,
        reasons: [],
        riskLevel: 'safe',
      };

    } catch (error) {
      console.error('Error checking URL:', error);
      return {
        isThreat: false,
        threatType: 'ERROR',
        confidence: 0,
        reasons: ['Error occurred during URL check'],
        riskLevel: 'unknown',
      };
    }
  }

  // Check local threat database
  checkLocalThreatDB(url) {
    const entry = this.localThreatDB.get(url);
    if (entry && Date.now() - entry.timestamp < this.updateInterval) {
      return {
        isThreat: entry.isThreat,
        threatType: entry.threatType,
        confidence: 0.9,
        reasons: ['Found in local threat database'],
        riskLevel: entry.isThreat ? 'high' : 'safe',
      };
    }
    return { isThreat: false };
  }

  // Check with Google Safe Browsing API
  async checkWithGoogleAPI(url) {
    if (!this.apiKey) {
      return { isThreat: false };
    }

    try {
      const requestBody = {
        client: {
          clientId: 'mobile-security-app',
          clientVersion: '1.0.0',
        },
        threatInfo: {
          threatTypes: this.threatTypes,
          platformTypes: this.platformTypes,
          threatEntryTypes: this.threatEntryTypes,
          threatEntries: [{ url: url }],
        },
      };

      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.matches && data.matches.length > 0) {
        const match = data.matches[0];
        return {
          isThreat: true,
          threatType: match.threatType,
          confidence: 0.95,
          reasons: [`Detected by Google Safe Browsing: ${match.threatType}`],
          riskLevel: this.getRiskLevelFromThreatType(match.threatType),
        };
      }

      return { isThreat: false };

    } catch (error) {
      console.error('Google Safe Browsing API error:', error);
      return { isThreat: false };
    }
  }

  // Get risk level from threat type
  getRiskLevelFromThreatType(threatType) {
    const riskLevels = {
      'MALWARE': 'critical',
      'SOCIAL_ENGINEERING': 'high',
      'UNWANTED_SOFTWARE': 'medium',
      'POTENTIALLY_HARMFUL_APPLICATION': 'medium',
    };
    return riskLevels[threatType] || 'medium';
  }

  // Update local threat database
  async updateLocalThreatDB() {
    try {
      // In a real implementation, you would fetch from your own threat intelligence API
      // For now, we'll use a static list of known threats
      const knownThreats = [
        'malicious-site.com',
        'phishing-bank.net',
        'fake-paypal.org',
        'scam-amazon.info',
        'virus-download.biz',
        'malware-distribution.net',
        'phishing-google.com',
        'fake-facebook.net',
        'scam-paypal.org',
        'malware-download.com',
      ];

      knownThreats.forEach(domain => {
        this.localThreatDB.set(`https://${domain}`, {
          isThreat: true,
          threatType: 'MALWARE',
          timestamp: Date.now(),
        });
      });

      this.lastUpdate = Date.now();
    } catch (error) {
      console.error('Error updating local threat database:', error);
    }
  }

  // Handle URL click event
  async handleUrlClick(url, source = 'unknown') {
    const result = await this.checkUrl(url);
    
    if (result.isThreat) {
      // Log the security event
      const event = await SecurityEvents.addEvent({
        type: this.getEventTypeFromThreatType(result.threatType),
        severity: result.riskLevel,
        url: url,
        description: `Suspicious link detected: ${result.reasons.join(', ')}`,
        action: 'warned',
        userAction: 'pending',
        riskScore: result.confidence * 100,
        metadata: {
          source: source,
          threatType: result.threatType,
          confidence: result.confidence,
        },
      });

      return {
        shouldBlock: true,
        event: event,
        warning: this.generateWarningMessage(result),
        recommendations: this.generateRecommendations(result),
      };
    }

    return {
      shouldBlock: false,
      event: null,
      warning: null,
      recommendations: [],
    };
  }

  // Get event type from threat type
  getEventTypeFromThreatType(threatType) {
    const typeMapping = {
      'MALWARE': 'malware',
      'SOCIAL_ENGINEERING': 'phishing',
      'UNWANTED_SOFTWARE': 'suspicious_download',
      'POTENTIALLY_HARMFUL_APPLICATION': 'suspicious_download',
      'SUSPICIOUS_PATTERN': 'unsafe_browsing',
    };
    return typeMapping[threatType] || 'unsafe_browsing';
  }

  // Generate warning message
  generateWarningMessage(result) {
    const messages = {
      'MALWARE': '⚠️ DANGER: This link contains malware that could harm your device and steal your data.',
      'SOCIAL_ENGINEERING': '🚨 PHISHING ALERT: This link appears to be a fake website designed to steal your login credentials.',
      'UNWANTED_SOFTWARE': '⚠️ WARNING: This link may download unwanted software or adware.',
      'POTENTIALLY_HARMFUL_APPLICATION': '⚠️ CAUTION: This link may install potentially harmful software.',
      'SUSPICIOUS_PATTERN': '⚠️ SUSPICIOUS: This link shows suspicious characteristics that could be dangerous.',
    };

    return messages[result.threatType] || messages['SUSPICIOUS_PATTERN'];
  }

  // Generate recommendations
  generateRecommendations(result) {
    const recommendations = [
      'Do not enter any personal information on this site',
      'Do not download any files from this link',
      'Close this page immediately',
      'Report this link to help protect others',
    ];

    if (result.threatType === 'SOCIAL_ENGINEERING') {
      recommendations.unshift('This appears to be a phishing site - do not enter passwords or financial information');
    }

    if (result.threatType === 'MALWARE') {
      recommendations.unshift('This link contains malware - do not proceed');
    }

    return recommendations;
  }

  // Get security statistics
  getSecurityStats() {
    return SecurityEvents.getSecurityStats();
  }

  // Get recent security events
  getRecentEvents(days = 7) {
    return SecurityEvents.getRecentEvents(days);
  }

  // Get dashboard data
  getDashboardData() {
    return SecurityEvents.getDashboardData();
  }

  // Set API key for Google Safe Browsing
  setApiKey(apiKey) {
    this.apiKey = apiKey;
  }

  // Get safety score
  getSafetyScore() {
    return SecurityEvents.calculateSafetyScore();
  }

  // Get threat trends
  getThreatTrends() {
    return SecurityEvents.calculateTrends();
  }

  // Clear all security events
  async clearAllEvents() {
    await SecurityEvents.clearEvents();
  }

  // Export security events (for backup)
  async exportEvents() {
    return SecurityEvents.events;
  }

  // Import security events (for restore)
  async importEvents(events) {
    SecurityEvents.events = events;
    await SecurityEvents.saveEvents();
  }
}

const safeBrowsingService = new SafeBrowsingService();
export default safeBrowsingService;
