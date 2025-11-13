// Predictive Security Service - AI-Enhanced Threat Detection Foundation
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

class PredictiveSecurityService {
  constructor() {
    this.behaviorPatterns = new Map();
    this.threatPredictions = [];
    this.userProfile = null;
    this.riskThresholds = {
      low: 20,
      medium: 50,
      high: 75,
      critical: 90
    };
    
    this.initializeService();
  }

  // Initialize predictive security service
  async initializeService() {
    try {
      await this.loadUserProfile();
      await this.loadBehaviorPatterns();
      this.startBehaviorAnalysis();
      
      console.log('Predictive security service initialized');
    } catch (error) {
      console.error('Failed to initialize predictive security:', error);
    }
  }

  // Analyze user behavior patterns for anomaly detection
  async analyzeBehaviorPattern(action, context = {}) {
    const timestamp = Date.now();
    const pattern = {
      id: `${action}_${timestamp}`,
      action: action, // 'url_scan', 'file_download', 'app_install', 'message_received'
      timestamp: timestamp,
      context: context, // device info, location, time of day, etc.
      riskFactors: []
    };

    // Analyze timing patterns
    const timeRisk = this.analyzeTimingAnomaly(action, timestamp);
    if (timeRisk > 0) {
      pattern.riskFactors.push(`Unusual timing for ${action}: ${timeRisk}% deviation`);
    }

    // Analyze frequency patterns
    const frequencyRisk = this.analyzeFrequencyAnomaly(action, timestamp);
    if (frequencyRisk > 0) {
      pattern.riskFactors.push(`Unusual frequency for ${action}: ${frequencyRisk}% above normal`);
    }

    // Analyze context anomalies
    const contextRisk = this.analyzeContextAnomaly(action, context);
    if (contextRisk > 0) {
      pattern.riskFactors.push(`Unusual context for ${action}: ${contextRisk}% risk increase`);
    }

    // Calculate composite risk score
    pattern.riskScore = Math.min(100, timeRisk + frequencyRisk + contextRisk);
    pattern.riskLevel = this.calculateRiskLevel(pattern.riskScore);

    // Store pattern for learning
    this.behaviorPatterns.set(pattern.id, pattern);
    
    // Generate prediction if high risk
    if (pattern.riskScore >= this.riskThresholds.medium) {
      await this.generateThreatPrediction(pattern);
    }

    return pattern;
  }

  // Analyze timing anomalies (unusual hours, days, etc.)
  analyzeTimingAnomaly(action, timestamp) {
    const date = new Date(timestamp);
    const hour = date.getHours();
    const dayOfWeek = date.getDay();

    // Get historical patterns for this action
    const historicalPatterns = Array.from(this.behaviorPatterns.values())
      .filter(p => p.action === action)
      .slice(-100); // Last 100 occurrences

    if (historicalPatterns.length < 10) return 0; // Not enough data

    // Calculate typical hours for this action
    const typicalHours = historicalPatterns.map(p => new Date(p.timestamp).getHours());
    const avgHour = typicalHours.reduce((sum, h) => sum + h, 0) / typicalHours.length;
    const hourDeviation = Math.abs(hour - avgHour);

    // Higher risk for actions at unusual hours
    let riskScore = 0;
    if (hourDeviation > 6) { // More than 6 hours from typical
      riskScore += 30;
    } else if (hourDeviation > 3) {
      riskScore += 15;
    }

    // Additional risk for very late/early hours (2-6 AM)
    if (hour >= 2 && hour <= 6) {
      riskScore += 20;
    }

    return Math.min(50, riskScore);
  }

  // Analyze frequency anomalies (too many actions in short time)
  analyzeFrequencyAnomaly(action, timestamp) {
    const recentActions = Array.from(this.behaviorPatterns.values())
      .filter(p => p.action === action && timestamp - p.timestamp < 3600000) // Last hour
      .length;

    // Get typical frequency for this action
    const historicalHourlyFreq = this.getTypicalHourlyFrequency(action);
    
    let riskScore = 0;
    if (recentActions > historicalHourlyFreq * 3) { // 3x normal frequency
      riskScore = 40;
    } else if (recentActions > historicalHourlyFreq * 2) { // 2x normal frequency
      riskScore = 25;
    }

    return riskScore;
  }

  // Analyze context anomalies (location, device state, etc.)
  analyzeContextAnomaly(action, context) {
    let riskScore = 0;

    // Analyze device state anomalies
    if (context.batteryLevel && context.batteryLevel < 10) {
      riskScore += 10; // Rushed actions on low battery
    }

    if (context.networkType && context.networkType === 'unknown') {
      riskScore += 15; // Unknown network connections
    }

    // Analyze location anomalies (if available)
    if (context.location && this.isUnusualLocation(context.location)) {
      riskScore += 20;
    }

    // Analyze concurrent actions
    if (context.concurrentActions && context.concurrentActions > 3) {
      riskScore += 15; // Multiple simultaneous security-sensitive actions
    }

    return Math.min(40, riskScore);
  }

  // Generate threat prediction based on behavioral analysis
  async generateThreatPrediction(pattern) {
    const prediction = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      basedOnPattern: pattern.id,
      action: pattern.action,
      predictedThreat: this.identifyLikelyThreat(pattern),
      confidenceLevel: this.calculateConfidenceLevel(pattern),
      riskScore: pattern.riskScore,
      recommendations: this.generateSecurityRecommendations(pattern),
      timeWindow: '24-48 hours',
      preventiveActions: []
    };

    // Add specific preventive actions
    prediction.preventiveActions = this.generatePreventiveActions(pattern);

    this.threatPredictions.unshift(prediction);
    await this.saveThreatPredictions();

    // Send alert if high confidence and high risk
    if (prediction.confidenceLevel >= 70 && prediction.riskScore >= this.riskThresholds.high) {
      await this.sendPredictiveAlert(prediction);
    }

    return prediction;
  }

  // Identify likely threat based on behavioral pattern
  identifyLikelyThreat(pattern) {
    const { action, riskFactors, context } = pattern;
    
    if (action === 'url_scan' && riskFactors.some(rf => rf.includes('frequency'))) {
      return 'Potential automated/bot scanning activity';
    }
    
    if (action === 'file_download' && riskFactors.some(rf => rf.includes('timing'))) {
      return 'Possible drive-by download or malware installation';
    }
    
    if (action === 'app_install' && pattern.riskScore >= 60) {
      return 'Potential malicious app installation or social engineering';
    }
    
    if (action === 'message_received' && riskFactors.length >= 2) {
      return 'Possible targeted phishing or social engineering campaign';
    }

    return 'Anomalous security-sensitive behavior detected';
  }

  // Calculate confidence level for prediction
  calculateConfidenceLevel(pattern) {
    let confidence = 50; // Base confidence

    // More risk factors = higher confidence
    confidence += pattern.riskFactors.length * 10;

    // Historical data availability increases confidence
    const historicalCount = Array.from(this.behaviorPatterns.values())
      .filter(p => p.action === pattern.action).length;
    
    if (historicalCount >= 50) confidence += 20;
    else if (historicalCount >= 20) confidence += 10;

    // Context richness increases confidence
    const contextKeys = Object.keys(pattern.context).length;
    confidence += Math.min(15, contextKeys * 3);

    return Math.min(95, confidence);
  }

  // Generate security recommendations
  generateSecurityRecommendations(pattern) {
    const recommendations = [];
    
    if (pattern.action === 'url_scan') {
      recommendations.push('Enable automatic URL scanning for all browsers');
      recommendations.push('Consider using a VPN for additional protection');
    }
    
    if (pattern.action === 'file_download') {
      recommendations.push('Enable real-time file monitoring');
      recommendations.push('Scan all downloads before opening');
      recommendations.push('Consider using a dedicated downloads folder with monitoring');
    }
    
    if (pattern.riskScore >= this.riskThresholds.high) {
      recommendations.push('Enable two-factor authentication for all accounts');
      recommendations.push('Review recent account activities');
      recommendations.push('Consider changing passwords for sensitive accounts');
    }

    return recommendations;
  }

  // Generate preventive actions
  generatePreventiveActions(pattern) {
    const actions = [];

    if (pattern.riskScore >= this.riskThresholds.critical) {
      actions.push('Temporarily increase security monitoring sensitivity');
      actions.push('Enable enhanced threat detection for next 48 hours');
      actions.push('Require additional verification for high-risk actions');
    }

    if (pattern.action === 'message_received' && pattern.riskScore >= 60) {
      actions.push('Increase message scanning frequency to real-time');
      actions.push('Enable proactive link verification');
    }

    return actions;
  }

  // Send predictive security alert
  async sendPredictiveAlert(prediction) {
    const alert = {
      type: 'predictive_threat',
      title: '🔮 Security Threat Predicted',
      message: `Our AI detected unusual activity that may indicate: ${prediction.predictedThreat}`,
      details: {
        confidence: `${prediction.confidenceLevel}% confidence`,
        timeWindow: prediction.timeWindow,
        recommendations: prediction.recommendations.slice(0, 3)
      },
      priority: prediction.riskScore >= 80 ? 'high' : 'medium',
      timestamp: prediction.timestamp
    };

    // In a real implementation, this would trigger push notifications
    console.log('Predictive Security Alert:', alert);
    
    return alert;
  }

  // Utility functions
  calculateRiskLevel(score) {
    if (score >= this.riskThresholds.critical) return 'critical';
    if (score >= this.riskThresholds.high) return 'high';
    if (score >= this.riskThresholds.medium) return 'medium';
    if (score >= this.riskThresholds.low) return 'low';
    return 'minimal';
  }

  getTypicalHourlyFrequency(action) {
    const historical = Array.from(this.behaviorPatterns.values())
      .filter(p => p.action === action);
    
    if (historical.length === 0) return 1;
    
    // Calculate average frequency per hour over last 30 days
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentHistorical = historical.filter(p => p.timestamp >= thirtyDaysAgo);
    
    return Math.max(1, Math.ceil(recentHistorical.length / (30 * 24)));
  }

  isUnusualLocation(location) {
    // Simplified location analysis
    // In production, this would use proper geolocation and historical patterns
    return false;
  }

  // Get current threat predictions
  getCurrentPredictions() {
    return this.threatPredictions.slice(0, 10);
  }

  // Get user security score based on behavior
  getSecurityScore() {
    const recentPatterns = Array.from(this.behaviorPatterns.values())
      .filter(p => Date.now() - p.timestamp < 7 * 24 * 60 * 60 * 1000) // Last 7 days
      .slice(-50); // Last 50 actions

    if (recentPatterns.length === 0) return 85; // Default good score

    const avgRiskScore = recentPatterns.reduce((sum, p) => sum + p.riskScore, 0) / recentPatterns.length;
    return Math.max(10, Math.min(100, 100 - avgRiskScore));
  }

  // Storage functions
  async loadUserProfile() {
    try {
      const saved = await AsyncStorage.getItem('user_security_profile');
      if (saved) {
        this.userProfile = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  }

  async loadBehaviorPatterns() {
    try {
      const saved = await AsyncStorage.getItem('behavior_patterns');
      if (saved) {
        const patterns = JSON.parse(saved);
        this.behaviorPatterns = new Map(patterns);
      }
    } catch (error) {
      console.error('Failed to load behavior patterns:', error);
    }
  }

  async saveThreatPredictions() {
    try {
      await AsyncStorage.setItem(
        'threat_predictions',
        JSON.stringify(this.threatPredictions.slice(0, 50))
      );
    } catch (error) {
      console.error('Failed to save threat predictions:', error);
    }
  }

  startBehaviorAnalysis() {
    // Start periodic analysis of stored patterns
    setInterval(() => {
      this.performPeriodicAnalysis();
    }, 300000); // Every 5 minutes
  }

  async performPeriodicAnalysis() {
    // Analyze patterns for emerging threats
    const recentPatterns = Array.from(this.behaviorPatterns.values())
      .filter(p => Date.now() - p.timestamp < 3600000); // Last hour

    if (recentPatterns.length >= 5) {
      // Look for concerning patterns
      const highRiskPatterns = recentPatterns.filter(p => p.riskScore >= 40);
      
      if (highRiskPatterns.length >= 3) {
        await this.generateThreatPrediction({
          id: 'periodic_analysis',
          action: 'multiple_high_risk_actions',
          riskScore: 75,
          riskFactors: ['Multiple high-risk actions detected in short timeframe'],
          context: { patternCount: highRiskPatterns.length }
        });
      }
    }
  }

  // Clear all data
  async clearAllData() {
    this.behaviorPatterns.clear();
    this.threatPredictions = [];
    this.userProfile = null;
    
    await Promise.all([
      AsyncStorage.removeItem('user_security_profile'),
      AsyncStorage.removeItem('behavior_patterns'),
      AsyncStorage.removeItem('threat_predictions')
    ]);
  }
}

export default new PredictiveSecurityService();
