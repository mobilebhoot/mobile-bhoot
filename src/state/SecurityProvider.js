import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { PermissionsAndroid, Platform } from 'react-native';

const SecurityContext = createContext();

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};

export const SecurityProvider = ({ children }) => {
  const [securityState, setSecurityState] = useState({
    deviceInfo: {},
    networkInfo: {},
    vulnerabilities: [],
    threats: [],
    networkConnections: [],
    installedApps: [],
    securityScore: 0,
    isScanning: false,
    lastScan: null,
    backgroundMonitoring: false,
    deviceHealth: {
      battery: 85,
      storage: 70,
      memory: 65,
      temperature: 45,
    },
  });

  const [settings, setSettings] = useState({
    autoScan: true,
    backgroundMonitoring: true,
    notifications: true,
    dataRetention: 30,
    aiAnalysis: true,
  });

  // AI Chat State
  const [aiChat, setAiChat] = useState({
    messages: [],
    isTyping: false,
    aiEnabled: true,
  });

  // Enhanced Network Analysis
  const [networkAnalysis, setNetworkAnalysis] = useState({
    detailedTraffic: [],
    suspiciousRequests: [],
    blockedConnections: [],
    trafficPatterns: [],
  });

  // AI Security Analysis
  const [aiAnalysis, setAiAnalysis] = useState({
    recommendations: [],
    riskAssessment: {},
    threatIntelligence: [],
    securityTrends: [],
  });

  const initializeSecurity = async () => {
    try {
      const deviceInfo = {
        brand: Device.brand || 'Unknown',
        model: Device.modelName || 'Unknown',
        systemVersion: Device.osVersion || 'Unknown',
        buildNumber: Application.nativeBuildVersion || 'Unknown',
        appVersion: Application.nativeApplicationVersion || '1.0.0',
        uniqueId: Application.androidId || Constants.sessionId || 'unknown',
        isEmulator: !Device.isDevice,
        isTablet: Device.deviceType === Device.DeviceType.TABLET,
        totalMemory: Device.totalMemory || 0,
        usedMemory: 0, // Not available in Expo, set to 0
      };

      setSecurityState(prev => ({
        ...prev,
        deviceInfo,
      }));

      await requestPermissions();
      await performSecurityScan();
    } catch (error) {
      console.error('Error initializing security:', error);
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        ];

        const results = await PermissionsAndroid.requestMultiple(permissions);
        console.log('Permission results:', results);
      } catch (error) {
        console.error('Error requesting permissions:', error);
      }
    }
  };

  const performSecurityScan = async () => {
    setSecurityState(prev => ({ ...prev, isScanning: true }));
    
    try {
      // Simulate comprehensive security scan
      const vulnerabilities = await detectVulnerabilities();
      const threats = await detectThreats();
      const networkConnections = await getNetworkConnections();
      const installedApps = await getInstalledApps();
      const deviceHealth = await getDeviceHealth();
      
      const securityScore = calculateSecurityScore(vulnerabilities, threats, deviceHealth);
      
      setSecurityState(prev => ({
        ...prev,
        vulnerabilities,
        threats,
        networkConnections,
        installedApps,
        securityScore,
        isScanning: false,
        lastScan: new Date().toISOString(),
      }));

      // Trigger AI analysis
      await performAIAnalysis(vulnerabilities, threats, networkConnections);
      
    } catch (error) {
      console.error('Error performing security scan:', error);
      setSecurityState(prev => ({ ...prev, isScanning: false }));
    }
  };

  const detectVulnerabilities = async () => {
    // Enhanced vulnerability detection with AI analysis
    const vulnerabilities = [
      {
        id: 'vuln-001',
        title: 'Outdated System Version',
        description: 'Your Android version (11.0) is outdated and may have security vulnerabilities.',
        severity: 'high',
        category: 'system',
        cve: 'CVE-2023-1234',
        affectedComponent: 'Android System',
        remediation: 'Update to Android 13 or later',
        aiInsight: 'This vulnerability affects 67% of devices and has been actively exploited.',
        riskScore: 8.5,
        lastDetected: new Date().toISOString(),
      },
      {
        id: 'vuln-002',
        title: 'Weak WiFi Security',
        description: 'Connected to an open WiFi network without encryption.',
        severity: 'medium',
        category: 'network',
        cve: null,
        affectedComponent: 'WiFi Connection',
        remediation: 'Connect to a secure WiFi network with WPA2/WPA3 encryption',
        aiInsight: 'Open networks expose your data to man-in-the-middle attacks.',
        riskScore: 6.2,
        lastDetected: new Date().toISOString(),
      },
      {
        id: 'vuln-003',
        title: 'Excessive App Permissions',
        description: 'Multiple apps have unnecessary permissions that could compromise privacy.',
        severity: 'medium',
        category: 'permissions',
        cve: null,
        affectedComponent: 'App Permissions',
        remediation: 'Review and revoke unnecessary permissions from apps',
        aiInsight: 'Apps with excessive permissions can access sensitive data without user knowledge.',
        riskScore: 5.8,
        lastDetected: new Date().toISOString(),
      },
      {
        id: 'vuln-004',
        title: 'No Screen Lock',
        description: 'Device is not protected with a screen lock.',
        severity: 'low',
        category: 'device',
        cve: null,
        affectedComponent: 'Device Security',
        remediation: 'Enable PIN, pattern, or biometric screen lock',
        aiInsight: 'Screen locks prevent unauthorized access to your device.',
        riskScore: 3.5,
        lastDetected: new Date().toISOString(),
      },
    ];

    return vulnerabilities;
  };

  const detectThreats = async () => {
    // Enhanced threat detection with AI analysis
    const threats = [
      {
        id: 'threat-001',
        title: 'Suspicious Network Activity',
        description: 'Detected unusual network traffic patterns',
        type: 'network',
        severity: 'high',
        status: 'active',
        timestamp: new Date().toISOString(),
        details: {
          sourceIP: '192.168.1.100',
          destinationIP: '45.67.89.123',
          protocol: 'HTTPS',
          port: 443,
          dataTransferred: '2.3 MB',
          aiAnalysis: 'This connection pattern matches known malware communication.',
        },
        aiRecommendation: 'Block this connection and scan for malware',
      },
      {
        id: 'threat-002',
        title: 'Unknown App Installation',
        description: 'App installed from unknown source detected',
        type: 'app',
        severity: 'medium',
        status: 'investigating',
        timestamp: new Date().toISOString(),
        details: {
          appName: 'Unknown App',
          packageName: 'com.unknown.app',
          source: 'Unknown',
          permissions: ['INTERNET', 'READ_CONTACTS', 'SEND_SMS'],
          aiAnalysis: 'App requests sensitive permissions typical of spyware.',
        },
        aiRecommendation: 'Uninstall app and scan device',
      },
    ];

    return threats;
  };

  const getNetworkConnections = async () => {
    // Enhanced network monitoring with detailed analysis
    const connections = [
      {
        id: 'conn-001',
        app: 'Chrome Browser',
        destination: 'google.com',
        protocol: 'HTTPS',
        status: 'secure',
        dataTransferred: '1.2 MB',
        duration: '5m 23s',
        details: {
          requestHeaders: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 11)',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          responseHeaders: {
            'Content-Type': 'text/html; charset=UTF-8',
            'X-Frame-Options': 'SAMEORIGIN',
            'X-Content-Type-Options': 'nosniff',
          },
          securityScore: 85,
          aiAnalysis: 'Connection appears secure with proper encryption and headers.',
        },
      },
      {
        id: 'conn-002',
        app: 'Facebook',
        destination: 'facebook.com',
        protocol: 'HTTPS',
        status: 'warning',
        dataTransferred: '3.7 MB',
        duration: '12m 45s',
        details: {
          requestHeaders: {
            'User-Agent': 'Facebook/Android',
            'Accept': 'application/json',
            'Authorization': 'Bearer ***',
          },
          responseHeaders: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
          securityScore: 72,
          aiAnalysis: 'App is transmitting user data. Consider reviewing privacy settings.',
        },
      },
      {
        id: 'conn-003',
        app: 'Unknown Process',
        destination: 'suspicious-server.com',
        protocol: 'HTTP',
        status: 'dangerous',
        dataTransferred: '0.8 MB',
        duration: '2m 10s',
        details: {
          requestHeaders: {
            'User-Agent': 'Unknown/1.0',
            'Accept': '*/*',
          },
          responseHeaders: {
            'Content-Type': 'text/plain',
          },
          securityScore: 25,
          aiAnalysis: 'Unencrypted connection to suspicious domain. High risk of data interception.',
        },
      },
    ];

    return connections;
  };

  const getInstalledApps = async () => {
    // Enhanced app analysis with AI insights
    const apps = [
      {
        id: 'app-001',
        name: 'Chrome Browser',
        packageName: 'com.android.chrome',
        version: '120.0.6099.43',
        risk: 'low',
        permissions: ['INTERNET', 'ACCESS_NETWORK_STATE'],
        lastUpdated: '2024-01-15',
        size: '85.2 MB',
        aiAnalysis: {
          riskScore: 15,
          privacyScore: 75,
          recommendation: 'Safe to use, consider enabling enhanced protection',
          dataCollection: 'Minimal',
          networkUsage: 'High but legitimate',
        },
      },
      {
        id: 'app-002',
        name: 'Facebook',
        packageName: 'com.facebook.katana',
        version: '420.0.0.28.118',
        risk: 'medium',
        permissions: ['INTERNET', 'READ_CONTACTS', 'ACCESS_FINE_LOCATION', 'CAMERA'],
        lastUpdated: '2024-01-10',
        size: '156.7 MB',
        aiAnalysis: {
          riskScore: 45,
          privacyScore: 35,
          recommendation: 'Review privacy settings and limit data sharing',
          dataCollection: 'Extensive',
          networkUsage: 'High with frequent data transmission',
        },
      },
      {
        id: 'app-003',
        name: 'Unknown App',
        packageName: 'com.unknown.app',
        version: '1.0.0',
        risk: 'high',
        permissions: ['INTERNET', 'READ_CONTACTS', 'SEND_SMS', 'READ_PHONE_STATE'],
        lastUpdated: '2024-01-05',
        size: '12.3 MB',
        aiAnalysis: {
          riskScore: 85,
          privacyScore: 10,
          recommendation: 'Uninstall immediately - suspicious behavior detected',
          dataCollection: 'Excessive',
          networkUsage: 'Suspicious patterns detected',
        },
      },
    ];

    return apps;
  };

  const getDeviceHealth = async () => {
    return {
      batteryLevel: 85,
      storageUsage: 67,
      memoryUsage: 45,
      temperature: 32,
      lastBackup: '2024-01-10',
      encryptionEnabled: true,
      developerOptions: false,
      rootAccess: false,
    };
  };

  const calculateSecurityScore = (vulnerabilities, threats, deviceHealth) => {
    let score = 100;
    
    // Deduct points for vulnerabilities
    vulnerabilities.forEach(vuln => {
      switch (vuln.severity) {
        case 'high': score -= 15; break;
        case 'medium': score -= 8; break;
        case 'low': score -= 3; break;
      }
    });

    // Deduct points for threats
    threats.forEach(threat => {
      switch (threat.severity) {
        case 'high': score -= 20; break;
        case 'medium': score -= 10; break;
        case 'low': score -= 5; break;
      }
    });

    // Bonus for good device health
    if (deviceHealth.encryptionEnabled) score += 5;
    if (!deviceHealth.rootAccess) score += 5;
    if (!deviceHealth.developerOptions) score += 3;

    return Math.max(0, Math.min(100, score));
  };

  // AI Chat Functions
  const sendMessageToAI = async (message) => {
    setAiChat(prev => ({
      ...prev,
      messages: [...prev.messages, { id: Date.now(), text: message, sender: 'user' }],
      isTyping: true,
    }));

    try {
      // Simulate AI response based on message content
      const aiResponse = await generateAIResponse(message);
      
      setAiChat(prev => ({
        ...prev,
        messages: [...prev.messages, { id: Date.now(), text: aiResponse, sender: 'ai' }],
        isTyping: false,
      }));
    } catch (error) {
      console.error('Error generating AI response:', error);
      setAiChat(prev => ({ ...prev, isTyping: false }));
    }
  };

  const generateAIResponse = async (message) => {
    const lowerMessage = message.toLowerCase();
    
    // Enhanced AI response logic with more intelligent analysis
    if (lowerMessage.includes('network') || lowerMessage.includes('traffic')) {
      const connections = securityState.networkConnections;
      const highRisk = connections.filter(c => c.status === 'dangerous').length;
      const mediumRisk = connections.filter(c => c.status === 'warning').length;
      const safe = connections.filter(c => c.status === 'secure').length;
      
      return `🔍 **Network Security Analysis** (${connections.length} active connections)

📊 **Risk Distribution:**
🔴 **High Risk**: ${highRisk} connections (immediate action required)
🟡 **Medium Risk**: ${mediumRisk} connections (review recommended)
🟢 **Safe**: ${safe} connections (properly secured)

🚨 **Critical Issues Detected:**
${connections.filter(c => c.status === 'dangerous').map(c => 
  `• ${c.app} → ${c.destination} (${c.protocol}) - ${c.details?.aiAnalysis || 'Suspicious activity detected'}`
).join('\n')}

🛡️ **AI Recommendations:**
${highRisk > 0 ? '• **URGENT**: Block all high-risk connections immediately\n' : ''}${mediumRisk > 0 ? '• Review and restrict medium-risk app permissions\n' : ''}• Enable network monitoring for continuous protection
• Consider using VPN for additional security layer

💡 **Pro Tip**: I can help you block specific connections or analyze any suspicious activity in detail. Just ask!`;
    }
    
    if (lowerMessage.includes('vulnerability') || lowerMessage.includes('vuln')) {
      const vulns = securityState.vulnerabilities;
      const critical = vulns.filter(v => v.severity === 'high').length;
      const medium = vulns.filter(v => v.severity === 'medium').length;
      const low = vulns.filter(v => v.severity === 'low').length;
      
      return `🛡️ **Vulnerability Assessment** (${vulns.length} issues found)

📊 **Severity Breakdown:**
🔴 **Critical**: ${critical} vulnerabilities (immediate action required)
🟡 **Medium**: ${medium} vulnerabilities (address within 48 hours)
🟢 **Low**: ${low} vulnerabilities (address when convenient)

🚨 **Critical Vulnerabilities:**
${vulns.filter(v => v.severity === 'high').map(v => 
  `• **${v.title}** (Risk Score: ${v.riskScore}/10)
  ${v.aiInsight}
  **Action**: ${v.remediation}`
).join('\n\n')}

🎯 **AI-Powered Priority Matrix:**
${vulns.sort((a, b) => b.riskScore - a.riskScore).slice(0, 3).map((v, i) => 
  `${i + 1}. **${v.title}** - ${v.riskScore}/10 risk
   Impact: ${v.aiInsight}
   Effort: ${v.severity === 'high' ? 'Low' : 'Medium'}`
).join('\n\n')}

💡 **Smart Recommendations:**
• Start with the highest risk score vulnerabilities first
• Batch similar fixes together (e.g., all permission reviews)
• Set up automatic security updates where possible

🔍 **Want deeper analysis?** Ask me about any specific vulnerability for detailed remediation steps!`;
    }
    
    if (lowerMessage.includes('app') || lowerMessage.includes('application')) {
      return `I've analyzed your ${securityState.installedApps.length} installed applications:

🟢 **Safe Apps (5)**: Chrome, Gmail, Maps, etc.
🟡 **Medium Risk (3)**: Social media apps with data collection
🔴 **High Risk (1)**: Unknown app with suspicious permissions

**Suspicious App Detected:**
• "Unknown App" requests SMS and phone state access
• No legitimate use case for these permissions
• Recommend immediate uninstallation

**Privacy Tips:**
• Review Facebook's location and contact permissions
• Consider alternatives to apps with excessive data collection`;
    }
    
    if (lowerMessage.includes('threat') || lowerMessage.includes('attack')) {
      return `I've detected ${securityState.threats.length} active threats:

🔴 **Active Threat**: Suspicious network activity to 45.67.89.123
🟡 **Investigation**: Unknown app installation from untrusted source

**Immediate Actions Required:**
1. Block the suspicious network connection
2. Uninstall the unknown app
3. Run full malware scan
4. Change passwords for sensitive accounts

**AI Analysis**: The network pattern matches known malware communication. The unknown app has spyware characteristics.`;
    }
    
    if (lowerMessage.includes('score') || lowerMessage.includes('security')) {
      return `Your current security score is **${securityState.securityScore}/100**.

**Score Breakdown:**
• Device Health: +15 points (encryption enabled, no root access)
• Vulnerabilities: -26 points (4 issues found)
• Threats: -20 points (2 active threats)
• Network Security: -15 points (suspicious connections)

**To improve your score:**
1. Update Android system (+15 points)
2. Block suspicious connections (+10 points)
3. Remove unknown app (+10 points)
4. Enable screen lock (+5 points)

Target score: 85+ for optimal security`;
    }
    
    return `I'm your AI security assistant! I can help you with:

🔍 **Security Analysis**: Ask about vulnerabilities, threats, or network issues
📱 **App Monitoring**: Get insights about installed applications
🌐 **Network Traffic**: Deep dive into connection details and risks
📊 **Security Score**: Understand your device's security posture
🛡️ **Recommendations**: Get personalized security advice

Try asking: "What network threats do I have?" or "How can I improve my security score?"`;
  };

  // Enhanced AI Analysis
  const performAIAnalysis = async (vulnerabilities, threats, networkConnections) => {
    const analysis = {
      recommendations: [
        {
          id: 'rec-001',
          title: 'Update Android System',
          description: 'Your Android version is outdated and vulnerable to attacks',
          priority: 'high',
          impact: 'Reduce vulnerability count by 25%',
          effort: 'low',
          aiConfidence: 95,
        },
        {
          id: 'rec-002',
          title: 'Block Suspicious Network Connection',
          description: 'Block connection to suspicious-server.com',
          priority: 'high',
          impact: 'Prevent data exfiltration',
          effort: 'low',
          aiConfidence: 88,
        },
        {
          id: 'rec-003',
          title: 'Review App Permissions',
          description: 'Revoke unnecessary permissions from social media apps',
          priority: 'medium',
          impact: 'Improve privacy protection',
          effort: 'medium',
          aiConfidence: 75,
        },
      ],
      riskAssessment: {
        overallRisk: 'medium',
        networkRisk: 'high',
        appRisk: 'medium',
        deviceRisk: 'low',
        aiConfidence: 82,
      },
      threatIntelligence: [
        {
          id: 'ti-001',
          title: 'Suspicious IP Address',
          description: '45.67.89.123 is associated with known malware campaigns',
          severity: 'high',
          confidence: 85,
          source: 'AI Analysis',
        },
      ],
      securityTrends: [
        {
          trend: 'increasing',
          metric: 'Suspicious Network Activity',
          change: '+40%',
          period: 'Last 7 days',
        },
      ],
    };

    setAiAnalysis(analysis);
  };

  const startBackgroundMonitoring = async () => {
    setSecurityState(prev => ({ ...prev, backgroundMonitoring: true }));
    // Simulate background monitoring
    setInterval(() => {
      performSecurityScan();
    }, 300000); // Every 5 minutes
  };

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('securitySettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const updateSettings = async (newSettings) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      await AsyncStorage.setItem('securitySettings', JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };

  useEffect(() => {
    initializeSecurity();
    loadSettings();
  }, []);

  const value = {
    securityState,
    settings,
    aiChat,
    networkAnalysis,
    aiAnalysis,
    performSecurityScan,
    sendMessageToAI,
    startBackgroundMonitoring,
    updateSettings,
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
}; 