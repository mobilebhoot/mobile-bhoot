class SimpleSecurityEvents {
  constructor() {
    this.events = [];
    this.stats = {
      totalEvents: 0,
      criticalEvents: 0,
      phishingAttempts: 0,
      malwareDetected: 0,
      safetyScore: 85,
    };
  }

  // Add a new security event
  addEvent(event) {
    const securityEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: event.type || 'security_event',
      severity: event.severity || 'medium',
      description: event.description || 'Security event detected',
      riskScore: event.riskScore || 50,
    };

    this.events.push(securityEvent);
    this.updateStats();
    return securityEvent;
  }

  // Update statistics
  updateStats() {
    this.stats.totalEvents = this.events.length;
    this.stats.criticalEvents = this.events.filter(e => e.severity === 'critical').length;
    this.stats.phishingAttempts = this.events.filter(e => e.type === 'phishing').length;
    this.stats.malwareDetected = this.events.filter(e => e.type === 'malware').length;
    
    // Calculate safety score (higher is safer)
    let score = 100;
    score -= this.stats.criticalEvents * 20;
    score -= this.stats.phishingAttempts * 5;
    score -= this.stats.malwareDetected * 15;
    this.stats.safetyScore = Math.max(0, Math.min(100, score));
  }

  // Get security statistics
  getSecurityStats() {
    return this.stats;
  }

  // Get safety score
  getSafetyScore() {
    return this.stats.safetyScore;
  }

  // Get recent events
  getRecentEvents(days = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return this.events.filter(event => event.timestamp >= cutoffDate);
  }

  // Clear all events
  clearEvents() {
    this.events = [];
    this.updateStats();
  }

  // Initialize with sample data
  initialize() {
    // Add some sample events for demonstration with unique timestamps
    const now = new Date();
    
    this.addEvent({
      type: 'phishing',
      severity: 'high',
      description: 'Phishing attempt detected from suspicious email',
      riskScore: 80,
    });
    
    // Add small delay to ensure unique timestamps
    setTimeout(() => {
      this.addEvent({
        type: 'malware',
        severity: 'critical',
        description: 'Malicious download blocked',
        riskScore: 95,
      });
    }, 100);
    
    setTimeout(() => {
      this.addEvent({
        type: 'suspicious_download',
        severity: 'medium',
        description: 'Suspicious file download attempt',
        riskScore: 60,
      });
    }, 200);
  }
}

const simpleSecurityEvents = new SimpleSecurityEvents();
export default simpleSecurityEvents;
