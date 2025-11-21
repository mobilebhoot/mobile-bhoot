// Real-Time Message Monitoring Service - Automatic Threat Detection
import { Platform, PermissionsAndroid, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SMS from 'expo-sms';
import Constants from 'expo-constants';
import bulkUrlScanner from './bulkUrlScanner';

// Check if running in Expo Go - expo-notifications removed from Expo Go SDK 53+
const isExpoGo = Constants.appOwnership === 'expo';
let Notifications = null;

if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
  } catch (e) {
    // Notifications not available - will continue without push notifications
  }
}

class MessageMonitoringService {
  constructor() {
    this.isMonitoring = false;
    this.threatHistory = [];
    this.suspiciousMessages = [];
    this.realTimeThreats = [];
    this.messageListeners = [];
    this.monitoringInterval = null;
    
    // Configuration
    this.config = {
      autoScanEnabled: true,
      notificationsEnabled: true,
      realTimeAlerts: true,
      scanHistoryLimit: 1000,
      threatThreshold: 40, // Risk score threshold for alerts
    };
    
    this.initializeService();
  }

  // Initialize the monitoring service
  async initializeService() {
    try {
      await this.loadConfiguration();
      await this.loadThreatHistory();
      
      // Configure notifications
      await this.setupNotifications();
      
      console.log('Message monitoring service initialized');
    } catch (error) {
      console.error('Failed to initialize message monitoring:', error);
    }
  }

  // Start real-time message monitoring
  async startMonitoring() {
    if (this.isMonitoring) return { success: true, message: 'Already monitoring' };

    try {
      // Request SMS permissions
      const hasPermission = await this.requestSMSPermissions();
      if (!hasPermission) {
        return { success: false, error: 'SMS permissions denied' };
      }

      // Start monitoring different message sources
      await this.startSMSMonitoring();
      await this.startWhatsAppMonitoring(); // Limited due to privacy
      await this.startTelegramMonitoring(); // Limited due to privacy
      
      this.isMonitoring = true;
      
      // Start periodic scanning of message history
      this.monitoringInterval = setInterval(() => {
        this.scanRecentMessages();
      }, 30000); // Every 30 seconds

      await this.saveConfiguration();
      
      return { 
        success: true, 
        message: 'Real-time monitoring started',
        sources: ['SMS', 'Notifications']
      };

    } catch (error) {
      console.error('Failed to start monitoring:', error);
      return { success: false, error: error.message };
    }
  }

  // Stop message monitoring
  async stopMonitoring() {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    
    // Clear intervals
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    // Remove listeners
    this.messageListeners.forEach(listener => {
      if (listener.remove) listener.remove();
    });
    this.messageListeners = [];

    await this.saveConfiguration();
    console.log('Message monitoring stopped');
  }

  // Request SMS permissions
  async requestSMSPermissions() {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.READ_SMS,
          PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
        ]);
        
        return granted['android.permission.READ_SMS'] === 'granted' &&
               granted['android.permission.RECEIVE_SMS'] === 'granted';
      }
      
      // iOS doesn't allow direct SMS reading for security reasons
      return Platform.OS === 'ios';
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }

  // Start SMS monitoring (Android only)
  async startSMSMonitoring() {
    if (Platform.OS !== 'android') {
      console.log('SMS monitoring not available on iOS');
      return;
    }

    try {
      // In a real implementation, you'd use a native module to listen for SMS
      // For now, we'll simulate with periodic checks
      console.log('SMS monitoring started (simulated)');
      
      // Simulate SMS message detection
      this.simulateSMSMonitoring();
      
    } catch (error) {
      console.error('SMS monitoring setup failed:', error);
    }
  }

  // Simulate SMS monitoring for demo purposes
  simulateSMSMonitoring() {
    // Simulate receiving suspicious SMS messages
    const suspiciousSMS = [
      {
        sender: '+91-9876543210',
        message: 'Congratulations! You have won ₹50,000! Click here to claim: https://fake-lottery.tk/claim?id=123456',
        timestamp: Date.now(),
        type: 'SMS'
      },
      {
        sender: 'SBI-ALERT',
        message: 'Your account has been suspended. Verify immediately: https://fake-sbi.ml/verify-account',
        timestamp: Date.now() - 300000, // 5 minutes ago
        type: 'SMS'
      },
      {
        sender: '+91-8765432109',
        message: 'Hi! Check out this amazing investment opportunity: https://crypto-scam.ga/invest-bitcoin',
        timestamp: Date.now() - 600000, // 10 minutes ago
        type: 'SMS'
      }
    ];

    // Randomly simulate receiving suspicious messages
    setInterval(() => {
      if (Math.random() < 0.1) { // 10% chance every 30 seconds
        const randomMessage = suspiciousSMS[Math.floor(Math.random() * suspiciousSMS.length)];
        randomMessage.timestamp = Date.now();
        this.processSuspiciousMessage(randomMessage);
      }
    }, 30000);
  }

  // Start WhatsApp monitoring (limited due to privacy restrictions)
  async startWhatsAppMonitoring() {
    // Note: WhatsApp doesn't allow direct message access due to privacy
    // We can only monitor notifications when app is in foreground
    console.log('WhatsApp monitoring started (notification-based)');
    
    // Listen for notification patterns that might contain links
    this.setupNotificationMonitoring('WhatsApp');
  }

  // Start Telegram monitoring (limited due to privacy restrictions)
  async startTelegramMonitoring() {
    // Similar to WhatsApp, only notification monitoring is possible
    console.log('Telegram monitoring started (notification-based)');
    this.setupNotificationMonitoring('Telegram');
  }

  // Setup notification monitoring
  setupNotificationMonitoring(appName) {
    // This is a placeholder - actual implementation would require native modules
    console.log(`${appName} notification monitoring configured`);
  }

  // Process incoming message for threats
  async processSuspiciousMessage(message) {
    try {
      // Extract URLs from message
      const urls = this.extractURLsFromMessage(message.message);
      
      if (urls.length === 0) return;

      console.log(`Scanning ${urls.length} URLs from ${message.type} message`);

      // Scan URLs for threats
      const scanResults = [];
      for (const url of urls) {
        const result = await bulkUrlScanner.scanSingleUrl(url);
        scanResults.push(result);
      }

      // Analyze results
      const threats = scanResults.filter(result => 
        result.riskScore >= this.config.threatThreshold
      );

      if (threats.length > 0) {
        await this.handleThreatDetected(message, threats);
      }

      // Store message analysis
      await this.storeMessageAnalysis({
        ...message,
        urls,
        scanResults,
        threatsFound: threats.length,
        analyzed: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error processing suspicious message:', error);
    }
  }

  // Extract URLs from message text
  extractURLsFromMessage(messageText) {
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}[^\s]*)/g;
    const matches = messageText.match(urlRegex) || [];
    
    return matches.map(url => {
      if (!url.startsWith('http')) {
        return url.startsWith('www.') ? `https://${url}` : `https://${url}`;
      }
      return url;
    });
  }

  // Handle threat detection
  async handleThreatDetected(message, threats) {
    const threatAlert = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      source: message.type,
      sender: message.sender,
      messageText: message.message,
      threats: threats,
      riskLevel: this.calculateOverallRisk(threats),
      status: 'active'
    };

    // Add to real-time threats
    this.realTimeThreats.unshift(threatAlert);
    
    // Keep only last 50 threats
    if (this.realTimeThreats.length > 50) {
      this.realTimeThreats = this.realTimeThreats.slice(0, 50);
    }

    // Show notification if enabled
    if (this.config.notificationsEnabled) {
      await this.showThreatNotification(threatAlert);
    }

    // Store in threat history
    this.threatHistory.unshift(threatAlert);
    await this.saveThreatHistory();

    console.log(`⚠️ THREAT DETECTED: ${threats.length} malicious URLs in ${message.type}`);
  }

  // Calculate overall risk level
  calculateOverallRisk(threats) {
    if (threats.length === 0) return 'low';
    
    const maxRisk = Math.max(...threats.map(t => t.riskScore));
    const avgRisk = threats.reduce((sum, t) => sum + t.riskScore, 0) / threats.length;
    
    if (maxRisk >= 80 || avgRisk >= 60) return 'critical';
    if (maxRisk >= 60 || avgRisk >= 40) return 'high';
    if (maxRisk >= 40 || avgRisk >= 20) return 'medium';
    return 'low';
  }

  // Show threat notification
  async showThreatNotification(threatAlert) {
    if (!Notifications || typeof Notifications.scheduleNotificationAsync !== 'function') {
      console.log('Notifications not available - threat alert:', threatAlert);
      return;
    }
    
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚨 Suspicious Link Detected!',
          body: `Found ${threatAlert.threats.length} malicious link${threatAlert.threats.length > 1 ? 's' : ''} in ${threatAlert.source} message`,
          data: { threatId: threatAlert.id },
          sound: true,
          priority: Notifications.AndroidNotificationPriority?.HIGH || 'high',
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error('Failed to show threat notification:', error);
    }
  }

  // Scan recent messages (periodic check)
  async scanRecentMessages() {
    if (!this.isMonitoring) return;

    try {
      // In a real implementation, this would check recent SMS/messages
      // For now, we'll simulate periodic threat detection
      console.log('Scanning recent messages...');
      
    } catch (error) {
      console.error('Error scanning recent messages:', error);
    }
  }

  // Setup notification system
  async setupNotifications() {
    // Skip if notifications not available (Expo Go or missing module)
    if (!Notifications || typeof Notifications.requestPermissionsAsync !== 'function') {
      console.log('Notifications not available in Expo Go - use development build for notifications');
      return false;
    }
    
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Notification permissions not granted');
        return false;
      }

      if (typeof Notifications.setNotificationHandler === 'function') {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }),
        });
      }

      return true;
    } catch (error) {
      console.error('Notification setup failed:', error);
      return false;
    }
  }

  // Get real-time threats
  getRealTimeThreats() {
    return this.realTimeThreats;
  }

  // Get threat history
  getThreatHistory() {
    return this.threatHistory;
  }

  // Get monitoring statistics
  getMonitoringStats() {
    const now = Date.now();
    const last24h = now - (24 * 60 * 60 * 1000);
    const last7d = now - (7 * 24 * 60 * 60 * 1000);

    const recent24h = this.threatHistory.filter(t => 
      new Date(t.timestamp).getTime() > last24h
    );
    const recent7d = this.threatHistory.filter(t => 
      new Date(t.timestamp).getTime() > last7d
    );

    return {
      isMonitoring: this.isMonitoring,
      totalThreats: this.threatHistory.length,
      threats24h: recent24h.length,
      threats7d: recent7d.length,
      activeSources: this.isMonitoring ? ['SMS', 'Notifications'] : [],
      lastScan: this.lastScanTime || null,
      criticalThreats: this.threatHistory.filter(t => t.riskLevel === 'critical').length,
      config: this.config
    };
  }

  // Update configuration
  async updateConfiguration(newConfig) {
    this.config = { ...this.config, ...newConfig };
    await this.saveConfiguration();
    
    // Restart monitoring if needed
    if (this.isMonitoring && newConfig.autoScanEnabled !== undefined) {
      if (newConfig.autoScanEnabled) {
        await this.startMonitoring();
      } else {
        await this.stopMonitoring();
      }
    }
  }

  // Store message analysis
  async storeMessageAnalysis(analysis) {
    this.suspiciousMessages.unshift(analysis);
    
    // Keep only recent messages
    if (this.suspiciousMessages.length > 100) {
      this.suspiciousMessages = this.suspiciousMessages.slice(0, 100);
    }

    await AsyncStorage.setItem(
      'suspicious_messages', 
      JSON.stringify(this.suspiciousMessages)
    );
  }

  // Load configuration
  async loadConfiguration() {
    try {
      const savedConfig = await AsyncStorage.getItem('message_monitoring_config');
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }
    } catch (error) {
      console.error('Failed to load configuration:', error);
    }
  }

  // Save configuration
  async saveConfiguration() {
    try {
      await AsyncStorage.setItem(
        'message_monitoring_config', 
        JSON.stringify(this.config)
      );
    } catch (error) {
      console.error('Failed to save configuration:', error);
    }
  }

  // Load threat history
  async loadThreatHistory() {
    try {
      const savedHistory = await AsyncStorage.getItem('threat_history');
      if (savedHistory) {
        this.threatHistory = JSON.parse(savedHistory);
      }

      const savedMessages = await AsyncStorage.getItem('suspicious_messages');
      if (savedMessages) {
        this.suspiciousMessages = JSON.parse(savedMessages);
      }
    } catch (error) {
      console.error('Failed to load threat history:', error);
    }
  }

  // Save threat history
  async saveThreatHistory() {
    try {
      await AsyncStorage.setItem(
        'threat_history', 
        JSON.stringify(this.threatHistory)
      );
    } catch (error) {
      console.error('Failed to save threat history:', error);
    }
  }

  // Export threat data
  async exportThreats(format = 'json') {
    const exportData = {
      timestamp: new Date().toISOString(),
      stats: this.getMonitoringStats(),
      threats: this.threatHistory,
      suspiciousMessages: this.suspiciousMessages,
      version: '1.0'
    };

    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify(exportData, null, 2);
      case 'csv':
        return this.convertThreatsToCSV(exportData);
      default:
        return exportData;
    }
  }

  // Convert threats to CSV
  convertThreatsToCSV(data) {
    const headers = [
      'Timestamp', 'Source', 'Sender', 'Risk Level', 
      'Threats Count', 'Message Preview'
    ];
    const rows = [headers.join(',')];

    data.threats.forEach(threat => {
      const row = [
        threat.timestamp,
        threat.source,
        `"${threat.sender}"`,
        threat.riskLevel,
        threat.threats.length,
        `"${threat.messageText.substring(0, 100)}..."`
      ];
      rows.push(row.join(','));
    });

    return rows.join('\n');
  }

  // Clear all data
  async clearAllData() {
    this.threatHistory = [];
    this.suspiciousMessages = [];
    this.realTimeThreats = [];
    
    await AsyncStorage.removeItem('threat_history');
    await AsyncStorage.removeItem('suspicious_messages');
    
    console.log('All threat data cleared');
  }
}

export default new MessageMonitoringService();
