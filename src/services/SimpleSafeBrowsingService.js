import SimpleSecurityEvents from '../models/SimpleSecurityEvents';

class SimpleSafeBrowsingService {
  constructor() {
    this.initialized = false;
  }

  // Initialize the service
  async initialize() {
    if (!this.initialized) {
      SimpleSecurityEvents.initialize();
      this.initialized = true;
      console.log('Simple security services initialized');
    }
  }

  // Check a URL for threats (simplified version)
  async checkUrl(url) {
    // Simple pattern matching for demonstration
    const suspiciousPatterns = [
      /phishing/i,
      /malware/i,
      /virus/i,
      /fake/i,
      /scam/i,
    ];

    const isThreat = suspiciousPatterns.some(pattern => pattern.test(url));
    
    if (isThreat) {
      // Log the security event
      SimpleSecurityEvents.addEvent({
        type: 'url_threat',
        severity: 'high',
        description: `Suspicious URL detected: ${url}`,
        riskScore: 80,
      });
    }

    return {
      isThreat,
      threatType: isThreat ? 'SUSPICIOUS_PATTERN' : null,
      confidence: isThreat ? 0.8 : 0,
      reasons: isThreat ? ['Suspicious pattern detected'] : [],
      riskLevel: isThreat ? 'high' : 'safe',
    };
  }

  // Handle URL click event
  async handleUrlClick(url, source = 'unknown') {
    const result = await this.checkUrl(url);
    
    if (result.isThreat) {
      return {
        shouldBlock: true,
        warning: '⚠️ This link appears to be suspicious. Proceed with caution.',
        recommendations: [
          'Do not enter personal information',
          'Do not download any files',
          'Close this page immediately',
        ],
      };
    }

    return {
      shouldBlock: false,
      warning: null,
      recommendations: [],
    };
  }

  // Get security statistics
  getSecurityStats() {
    return SimpleSecurityEvents.getSecurityStats();
  }

  // Get recent security events
  getRecentEvents(days = 7) {
    return SimpleSecurityEvents.getRecentEvents(days);
  }

  // Get safety score
  getSafetyScore() {
    return SimpleSecurityEvents.getSafetyScore();
  }

  // Clear all security events
  clearAllEvents() {
    SimpleSecurityEvents.clearEvents();
  }
}

const simpleSafeBrowsingService = new SimpleSafeBrowsingService();
export default simpleSafeBrowsingService;
