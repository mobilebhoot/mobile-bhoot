// import AsyncStorage from '@react-native-async-storage/async-storage';

class SecurityEvents {
  constructor() {
    this.events = [];
    this.suspiciousPatterns = [
      // Phishing patterns
      /paypal.*login/i,
      /amazon.*login/i,
      /google.*login/i,
      /facebook.*login/i,
      /bank.*login/i,
      /credit.*card/i,
      /password.*reset/i,
      /account.*suspended/i,
      /urgent.*action/i,
      /verify.*account/i,
      
      // Suspicious domains
      /bit\.ly/i,
      /tinyurl/i,
      /goo\.gl/i,
      /t\.co/i,
      
      // Unicode lookalike patterns
      /[а-я]/i, // Cyrillic characters
      /[α-ω]/i, // Greek characters
      /[０-９]/i, // Full-width numbers
      
      // Common malicious patterns
      /malware/i,
      /virus/i,
      /trojan/i,
      /keylogger/i,
      /backdoor/i,
    ];
    
    this.knownMaliciousDomains = [
      'malicious-site.com',
      'phishing-bank.net',
      'fake-paypal.org',
      'scam-amazon.info',
      'virus-download.biz',
    ];
  }

  // Add a new security event
  async addEvent(event) {
    const securityEvent = {
      id: Date.now().toString(),
      timestamp: new Date(),
      type: event.type, // 'phishing', 'malware', 'suspicious_download', 'unsafe_browsing'
      severity: event.severity, // 'low', 'medium', 'high', 'critical'
      url: event.url,
      description: event.description,
      action: event.action, // 'blocked', 'warned', 'detected'
      userAction: event.userAction, // 'ignored', 'avoided', 'proceeded'
      riskScore: event.riskScore || this.calculateRiskScore(event),
      metadata: event.metadata || {},
    };

    this.events.push(securityEvent);
    await this.saveEvents();
    return securityEvent;
  }

  // Check if a URL is suspicious
  checkUrl(url) {
    const results = {
      isSuspicious: false,
      riskLevel: 'safe',
      reasons: [],
      riskScore: 0,
    };

    // Check against known malicious domains
    if (this.knownMaliciousDomains.some(domain => url.includes(domain))) {
      results.isSuspicious = true;
      results.riskLevel = 'critical';
      results.reasons.push('Known malicious domain');
      results.riskScore += 100;
    }

    // Check against suspicious patterns
    this.suspiciousPatterns.forEach((pattern, index) => {
      if (pattern.test(url)) {
        results.isSuspicious = true;
        results.reasons.push(`Suspicious pattern detected: ${pattern.source}`);
        results.riskScore += 20;
        
        if (results.riskLevel === 'safe') results.riskLevel = 'low';
        else if (results.riskLevel === 'low') results.riskLevel = 'medium';
        else if (results.riskLevel === 'medium') results.riskLevel = 'high';
      }
    });

    // Check for suspicious URL structure
    if (this.hasSuspiciousStructure(url)) {
      results.isSuspicious = true;
      results.reasons.push('Suspicious URL structure');
      results.riskScore += 15;
      if (results.riskLevel === 'safe') results.riskLevel = 'low';
    }

    // Check for unicode lookalike domains
    if (this.hasUnicodeLookalike(url)) {
      results.isSuspicious = true;
      results.riskLevel = 'high';
      results.reasons.push('Unicode lookalike domain detected');
      results.riskScore += 50;
    }

    return results;
  }

  // Check for suspicious URL structure
  hasSuspiciousStructure(url) {
    // Multiple subdomains
    if ((url.match(/\./g) || []).length > 3) return true;
    
    // Very long domain
    if (url.length > 50) return true;
    
    // Mixed case (potential obfuscation)
    if (url !== url.toLowerCase() && url !== url.toUpperCase()) return true;
    
    // Suspicious characters
    if (/[^\w\.\-]/.test(url)) return true;
    
    return false;
  }

  // Check for unicode lookalike domains
  hasUnicodeLookalike(url) {
    // Check for mixed scripts (Latin + Cyrillic, etc.)
    const hasLatin = /[a-zA-Z]/.test(url);
    const hasCyrillic = /[а-яё]/i.test(url);
    const hasGreek = /[α-ω]/i.test(url);
    const hasArabic = /[ا-ي]/i.test(url);
    
    return (hasLatin && (hasCyrillic || hasGreek || hasArabic));
  }

  // Calculate risk score based on event details
  calculateRiskScore(event) {
    let score = 0;
    
    // Base score by type
    const typeScores = {
      'phishing': 80,
      'malware': 90,
      'suspicious_download': 70,
      'unsafe_browsing': 60,
      'data_leak': 85,
      'unauthorized_access': 95,
    };
    
    score += typeScores[event.type] || 50;
    
    // Severity multiplier
    const severityMultipliers = {
      'low': 0.5,
      'medium': 1.0,
      'high': 1.5,
      'critical': 2.0,
    };
    
    score *= severityMultipliers[event.severity] || 1.0;
    
    return Math.min(Math.round(score), 100);
  }

  // Get events by type
  getEventsByType(type) {
    return this.events.filter(event => event.type === type);
  }

  // Get events by severity
  getEventsBySeverity(severity) {
    return this.events.filter(event => event.severity === severity);
  }

  // Get recent events (last N days)
  getRecentEvents(days = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return this.events.filter(event => event.timestamp >= cutoffDate);
  }

  // Get security statistics
  getSecurityStats() {
    const recentEvents = this.getRecentEvents(30);
    
    return {
      totalEvents: this.events.length,
      recentEvents: recentEvents.length,
      criticalEvents: this.getEventsBySeverity('critical').length,
      highRiskEvents: this.getEventsBySeverity('high').length,
      phishingAttempts: this.getEventsByType('phishing').length,
      malwareDetected: this.getEventsByType('malware').length,
      blockedDownloads: this.getEventsByType('suspicious_download').length,
      averageRiskScore: this.calculateAverageRiskScore(),
      safetyScore: this.calculateSafetyScore(),
    };
  }

  // Calculate average risk score
  calculateAverageRiskScore() {
    if (this.events.length === 0) return 0;
    
    const totalScore = this.events.reduce((sum, event) => sum + event.riskScore, 0);
    return Math.round(totalScore / this.events.length);
  }

  // Calculate safety score (0-100, higher is safer)
  calculateSafetyScore() {
    const stats = this.getSecurityStats();
    const maxScore = 100;
    
    // Deduct points for events
    let score = maxScore;
    score -= stats.criticalEvents * 20;
    score -= stats.highRiskEvents * 10;
    score -= stats.phishingAttempts * 5;
    score -= stats.malwareDetected * 15;
    score -= stats.blockedDownloads * 3;
    
    return Math.max(0, Math.min(100, score));
  }

  // Save events to AsyncStorage
  async saveEvents() {
    try {
      // For now, just store in memory
      // await AsyncStorage.setItem('security_events', JSON.stringify(this.events));
      console.log('Security events saved:', this.events.length);
    } catch (error) {
      console.error('Error saving security events:', error);
    }
  }

  // Load events from AsyncStorage
  async loadEvents() {
    try {
      // For now, just initialize with empty array
      // const stored = await AsyncStorage.getItem('security_events');
      // if (stored) {
      //   this.events = JSON.parse(stored).map(event => ({
      //     ...event,
      //     timestamp: new Date(event.timestamp),
      //   }));
      // }
      console.log('Security events loaded');
    } catch (error) {
      console.error('Error loading security events:', error);
      this.events = [];
    }
  }

  // Clear all events
  async clearEvents() {
    this.events = [];
    await this.saveEvents();
  }

  // Get events for dashboard
  getDashboardData() {
    const stats = this.getSecurityStats();
    const recentEvents = this.getRecentEvents(7);
    
    return {
      stats,
      recentEvents: recentEvents.slice(0, 10), // Last 10 events
      trends: this.calculateTrends(),
    };
  }

  // Calculate trends (comparing last 7 days vs previous 7 days)
  calculateTrends() {
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    const lastWeekEvents = this.events.filter(event => 
      event.timestamp >= lastWeek && event.timestamp <= now
    );
    
    const previousWeekEvents = this.events.filter(event => 
      event.timestamp >= twoWeeksAgo && event.timestamp < lastWeek
    );
    
    return {
      eventsChange: lastWeekEvents.length - previousWeekEvents.length,
      phishingChange: this.getEventsByType('phishing').filter(e => e.timestamp >= lastWeek).length - 
                     this.getEventsByType('phishing').filter(e => e.timestamp >= twoWeeksAgo && e.timestamp < lastWeek).length,
      malwareChange: this.getEventsByType('malware').filter(e => e.timestamp >= lastWeek).length - 
                    this.getEventsByType('malware').filter(e => e.timestamp >= twoWeeksAgo && e.timestamp < lastWeek).length,
    };
  }
}

const securityEvents = new SecurityEvents();
export default securityEvents;
