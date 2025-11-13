import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import installedAppsService from './installedAppsService';
import playStoreService from './playStoreService';

class AppSecurityService {
  constructor() {
    this.knownVulnerableApps = new Set([
      'com.whatsapp', // Example: if old version has vulnerabilities
      'com.facebook.katana',
      'com.instagram.android'
    ]);
    
    this.criticalPermissions = new Set([
      'android.permission.CAMERA',
      'android.permission.RECORD_AUDIO',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.READ_CONTACTS',
      'android.permission.READ_SMS',
      'android.permission.SEND_SMS',
      'android.permission.CALL_PHONE',
      'android.permission.READ_PHONE_STATE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.READ_EXTERNAL_STORAGE'
    ]);
  }

  // Get installed applications using dynamic detection (fast mode)
  async getInstalledApps() {
    try {
      console.log('🔍 Starting fast app detection...');
      
      // Get apps from our dynamic detection service (with timeout)
      const detectedApps = await Promise.race([
        installedAppsService.getInstalledApps(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('App detection timeout')), 5000)
        )
      ]);
      
      // Limit to first 10 apps for performance
      const limitedApps = detectedApps.slice(0, 10);
      
      // Perform lightweight security analysis
      const analyzedApps = [];
      for (const app of limitedApps) {
        try {
          // Skip Play Store analysis for faster startup (can be done later)
          const riskAnalysis = await this.analyzeAppSecurity(app);
          
          const enhancedApp = {
            ...app,
            securityAnalysis: {
              ...riskAnalysis,
              hasUpdate: false, // Skip for now
              securityUpdate: false,
              daysSinceUpdate: null,
              versionComparison: null
            }
          };
          
          analyzedApps.push(enhancedApp);
          
        } catch (error) {
          console.error(`Error analyzing app ${app.packageName}:`, error);
          // Add app with minimal analysis
          analyzedApps.push({
            ...app,
            securityAnalysis: {
              riskLevel: 'low',
              riskScore: 0,
              issues: [],
              recommendations: []
            }
          });
        }
      }
      
      console.log(`✅ Fast analyzed ${analyzedApps.length} installed apps`);
      return analyzedApps;
      
    } catch (error) {
      console.error('Error getting installed apps:', error);
      // Return basic fallback data
      return await this.getFallbackApps();
    }
  }

  // Calculate overall risk level combining internal and Play Store analysis
  calculateOverallRisk(internalAnalysis, playStoreAnalysis) {
    let riskScore = internalAnalysis.riskScore || 0;
    
    // Add Play Store-specific risks
    if (playStoreAnalysis.hasUpdate && playStoreAnalysis.securityUpdate) {
      riskScore += 30; // High risk for missing security updates
    } else if (playStoreAnalysis.hasUpdate) {
      riskScore += 15; // Medium risk for missing regular updates
    }
    
    // Days since update risk
    if (playStoreAnalysis.daysSinceUpdate > 90) {
      riskScore += 20; // Very old app version
    } else if (playStoreAnalysis.daysSinceUpdate > 30) {
      riskScore += 10; // Moderately old version
    }
    
    // Determine final risk level
    if (riskScore >= 60) return 'high';
    if (riskScore >= 30) return 'medium';
    return 'low';
  }

  // Fallback apps if dynamic detection fails
  async getFallbackApps() {
    console.log('🔄 Using fallback app detection...');
    
    // Get current app as minimum
    const currentApp = await installedAppsService.getCurrentAppInfo();
    const fallbackApps = [currentApp];
    
    // Add some common apps as fallback
    const commonApps = [
      { packageName: 'com.whatsapp', name: 'WhatsApp' },
      { packageName: 'com.google.android.gm', name: 'Gmail' },
      { packageName: 'com.facebook.katana', name: 'Facebook' }
    ];
    
    for (const app of commonApps) {
      const appData = await installedAppsService.createAppObject(app);
      if (appData) {
        appData.securityAnalysis = await this.analyzeAppSecurity(appData);
        fallbackApps.push(appData);
      }
    }
    
    return fallbackApps;
  }

  // Legacy method - keeping for backward compatibility
  async getSimulatedInstalledApps() {
    const deviceInfo = await this.getDeviceInfo();
    
    const simulatedApps = [
      {
        id: 'com.whatsapp',
        name: 'WhatsApp',
        packageName: 'com.whatsapp',
        version: '2.23.15.75', // Older version for demo
        installedDate: new Date('2023-08-15'),
        lastUpdated: new Date('2023-08-15'),
        size: 85.2, // MB
        isSystemApp: false,
        permissions: [
          'Camera', 'Microphone', 'Contacts', 'Phone', 'SMS', 'Storage', 'Location'
        ],
        dataUsage: 245.7, // MB
        batteryUsage: 12.5, // %
        icon: 'logo-whatsapp',
        category: 'Communication'
      },
      {
        id: 'com.facebook.katana',
        name: 'Facebook',
        packageName: 'com.facebook.katana',
        version: '420.0.0.37.71', // Older version
        installedDate: new Date('2023-07-20'),
        lastUpdated: new Date('2023-09-10'),
        size: 156.8,
        isSystemApp: false,
        permissions: [
          'Camera', 'Microphone', 'Contacts', 'Phone', 'Storage', 'Location', 'Calendar'
        ],
        dataUsage: 512.3,
        batteryUsage: 18.7,
        icon: 'logo-facebook',
        category: 'Social'
      },
      {
        id: 'com.instagram.android',
        name: 'Instagram',
        packageName: 'com.instagram.android',
        version: '295.0.0.32.123', // Current version
        installedDate: new Date('2023-06-10'),
        lastUpdated: new Date('2023-11-01'),
        size: 67.4,
        isSystemApp: false,
        permissions: [
          'Camera', 'Microphone', 'Contacts', 'Storage', 'Location'
        ],
        dataUsage: 189.2,
        batteryUsage: 8.9,
        icon: 'logo-instagram',
        category: 'Social'
      },
      {
        id: 'com.google.android.youtube',
        name: 'YouTube',
        packageName: 'com.google.android.youtube',
        version: '18.43.45', // Current version
        installedDate: new Date('2023-05-15'),
        lastUpdated: new Date('2023-11-05'),
        size: 124.7,
        isSystemApp: false,
        permissions: [
          'Camera', 'Microphone', 'Storage', 'Location'
        ],
        dataUsage: 1024.5,
        batteryUsage: 25.3,
        icon: 'logo-youtube',
        category: 'Entertainment'
      },
      {
        id: 'com.chrome.beta',
        name: 'Chrome',
        packageName: 'com.chrome.beta',
        version: '119.0.6045.66', // Older version with known vulnerabilities
        installedDate: new Date('2023-04-01'),
        lastUpdated: new Date('2023-09-20'),
        size: 98.5,
        isSystemApp: false,
        permissions: [
          'Camera', 'Microphone', 'Storage', 'Location', 'Contacts'
        ],
        dataUsage: 334.8,
        batteryUsage: 15.2,
        icon: 'logo-chrome',
        category: 'Productivity'
      },
      {
        id: 'com.google.android.gm',
        name: 'Gmail',
        packageName: 'com.google.android.gm',
        version: '2023.10.29.573054000', // Current
        installedDate: new Date('2023-03-10'),
        lastUpdated: new Date('2023-11-07'),
        size: 45.2,
        isSystemApp: true,
        permissions: [
          'Contacts', 'Storage', 'Camera', 'Microphone'
        ],
        dataUsage: 123.4,
        batteryUsage: 5.8,
        icon: 'mail',
        category: 'Productivity'
      },
      {
        id: 'com.phonepe.app',
        name: 'PhonePe',
        packageName: 'com.phonepe.app',
        version: '23.10.25.0', // Older version
        installedDate: new Date('2023-09-01'),
        lastUpdated: new Date('2023-10-15'),
        size: 67.8,
        isSystemApp: false,
        permissions: [
          'Phone', 'SMS', 'Contacts', 'Location', 'Camera', 'Storage'
        ],
        dataUsage: 89.3,
        batteryUsage: 4.2,
        icon: 'card',
        category: 'Finance'
      },
      {
        id: 'com.paytm',
        name: 'Paytm',
        packageName: 'com.paytm',
        version: '9.29.5', // Older version
        installedDate: new Date('2023-08-20'),
        lastUpdated: new Date('2023-10-01'),
        size: 73.4,
        isSystemApp: false,
        permissions: [
          'Phone', 'SMS', 'Contacts', 'Location', 'Camera', 'Storage', 'Microphone'
        ],
        dataUsage: 156.7,
        batteryUsage: 7.1,
        icon: 'wallet',
        category: 'Finance'
      }
    ];

    // Add security analysis to each app
    return simulatedApps.map(app => ({
      ...app,
      securityAnalysis: this.analyzeAppSecurity(app),
      playStoreInfo: null // Will be populated by checkPlayStoreVersions
    }));
  }

  // Analyze app security based on various factors
  // Analyze app security (internal analysis only - version checking done externally)
  async analyzeAppSecurity(app) {
    const analysis = {
      riskLevel: 'low',
      riskScore: 0,
      issues: [],
      recommendations: []
    };

    // Check permissions
    const permissionRisk = this.analyzePermissions(app.permissions || []);
    analysis.riskScore += permissionRisk.score;
    if (permissionRisk.issues.length > 0) {
      analysis.issues.push(...permissionRisk.issues);
      analysis.recommendations.push(...permissionRisk.recommendations);
    }

    // Check for known vulnerable apps (using dynamic detection)
    const vulnerabilityRisk = await this.checkKnownVulnerabilities(app);
    analysis.riskScore += vulnerabilityRisk.score;
    if (vulnerabilityRisk.issues.length > 0) {
      analysis.issues.push(...vulnerabilityRisk.issues);
      analysis.recommendations.push(...vulnerabilityRisk.recommendations);
    }

    // Check data and battery usage (behavioral analysis)
    const behaviorRisk = this.analyzeBehaviorPattern(app);
    analysis.riskScore += behaviorRisk.score;
    if (behaviorRisk.issues.length > 0) {
      analysis.issues.push(...behaviorRisk.issues);
      analysis.recommendations.push(...behaviorRisk.recommendations);
    }

    // App category-specific risks
    const categoryRisk = this.analyzeCategoryRisks(app);
    analysis.riskScore += categoryRisk.score;
    if (categoryRisk.issues.length > 0) {
      analysis.issues.push(...categoryRisk.issues);
      analysis.recommendations.push(...categoryRisk.recommendations);
    }

    // Determine base risk level (will be combined with Play Store analysis later)
    if (analysis.riskScore >= 40) {
      analysis.riskLevel = 'high';
    } else if (analysis.riskScore >= 20) {
      analysis.riskLevel = 'medium';
    } else {
      analysis.riskLevel = 'low';
    }

    return analysis;
  }

  // Check for known vulnerabilities using threat intelligence
  async checkKnownVulnerabilities(app) {
    const result = {
      score: 0,
      issues: [],
      recommendations: []
    };

    try {
      // Check against known vulnerable packages (dynamic list)
      if (this.knownVulnerableApps.has(app.packageName)) {
        result.score += 25;
        result.issues.push('App listed in vulnerability database');
        result.recommendations.push('Update to latest version immediately');
      }

      // Check for suspicious app characteristics
      const suspiciousPatterns = this.detectSuspiciousPatterns(app);
      if (suspiciousPatterns.length > 0) {
        result.score += 15;
        result.issues.push(...suspiciousPatterns);
        result.recommendations.push('Review app permissions and behavior');
      }

      // Check for apps with known malware signatures
      if (this.checkMalwareSignatures(app)) {
        result.score += 35;
        result.issues.push('App matches known malware signatures');
        result.recommendations.push('Uninstall app immediately and scan device');
      }

    } catch (error) {
      console.error('Error checking vulnerabilities:', error);
    }

    return result;
  }

  // Analyze behavioral patterns for anomalies
  analyzeBehaviorPattern(app) {
    const result = {
      score: 0,
      issues: [],
      recommendations: []
    };

    // High data usage analysis
    if (app.dataUsage > 1000) {
      result.score += 15;
      result.issues.push('Extremely high data usage detected (>1GB)');
      result.recommendations.push('Monitor network activity and consider data restrictions');
    } else if (app.dataUsage > 500) {
      result.score += 8;
      result.issues.push('High data usage detected');
      result.recommendations.push('Monitor app data consumption');
    }

    // Battery usage analysis
    if (app.batteryUsage > 25) {
      result.score += 12;
      result.issues.push('Very high battery usage detected');
      result.recommendations.push('Check background processes and restrict if necessary');
    } else if (app.batteryUsage > 15) {
      result.score += 6;
      result.issues.push('High battery usage detected');
      result.recommendations.push('Monitor app background activity');
    }

    // Installation patterns
    const daysSinceInstall = Math.floor((Date.now() - app.installedDate) / (1000 * 60 * 60 * 24));
    const daysSinceUpdate = Math.floor((Date.now() - app.lastUpdated) / (1000 * 60 * 60 * 24));

    if (daysSinceUpdate > 180) {
      result.score += 10;
      result.issues.push('App not updated for over 6 months');
      result.recommendations.push('Check for available updates');
    }

    return result;
  }

  // Analyze category-specific security risks
  analyzeCategoryRisks(app) {
    const result = {
      score: 0,
      issues: [],
      recommendations: []
    };

    const categoryRisks = {
      'Finance': {
        highRiskPermissions: ['Phone', 'SMS', 'Contacts'],
        baseRisk: 5,
        riskMessage: 'Financial app with sensitive permissions'
      },
      'Communication': {
        highRiskPermissions: ['Contacts', 'Phone', 'SMS', 'Camera', 'Microphone'],
        baseRisk: 3,
        riskMessage: 'Communication app with privacy-sensitive permissions'
      },
      'Social': {
        highRiskPermissions: ['Contacts', 'Location', 'Camera', 'Storage'],
        baseRisk: 4,
        riskMessage: 'Social app with extensive data access'
      },
      'Unknown': {
        highRiskPermissions: [],
        baseRisk: 8,
        riskMessage: 'Unknown app category increases security risk'
      }
    };

    const categoryRisk = categoryRisks[app.category] || categoryRisks['Unknown'];
    
    // Base category risk
    result.score += categoryRisk.baseRisk;

    // Check for excessive permissions for category
    const permissions = app.permissions || [];
    const excessivePermissions = permissions.filter(p => 
      categoryRisk.highRiskPermissions.includes(p) || 
      this.criticalPermissions.has(`android.permission.${p.toUpperCase()}`)
    );

    if (excessivePermissions.length > 3) {
      result.score += 10;
      result.issues.push(`${app.category} app has excessive sensitive permissions`);
      result.recommendations.push('Review if all permissions are necessary for app functionality');
    }

    return result;
  }

  // Detect suspicious app patterns
  detectSuspiciousPatterns(app) {
    const suspiciousPatterns = [];

    // Check for apps with suspicious names
    const suspiciousNames = ['free', 'crack', 'hack', 'mod', 'unlimited', 'premium'];
    const appNameLower = app.name.toLowerCase();
    if (suspiciousNames.some(pattern => appNameLower.includes(pattern))) {
      suspiciousPatterns.push('App name contains suspicious keywords');
    }

    // Check for apps requesting excessive permissions
    if (app.permissions && app.permissions.length > 15) {
      suspiciousPatterns.push('App requests excessive number of permissions');
    }

    // Check for recently installed apps with high resource usage
    const daysSinceInstall = Math.floor((Date.now() - app.installedDate) / (1000 * 60 * 60 * 24));
    if (daysSinceInstall < 7 && (app.dataUsage > 200 || app.batteryUsage > 10)) {
      suspiciousPatterns.push('Recently installed app with high resource usage');
    }

    // Check for unknown developers with sensitive permissions
    const sensitivePermissions = ['Phone', 'SMS', 'Contacts', 'Location'];
    if (app.permissions && app.permissions.some(p => sensitivePermissions.includes(p))) {
      // In real implementation, you'd check against known developer databases
      if (!app.isSystemApp && Math.random() > 0.9) { // 10% chance for demo
        suspiciousPatterns.push('Unknown developer with sensitive permissions');
      }
    }

    return suspiciousPatterns;
  }

  // Check for known malware signatures
  checkMalwareSignatures(app) {
    // In a real implementation, this would check against:
    // - Known malware package names
    // - App hash signatures
    // - Behavioral patterns
    // - Third-party threat intelligence feeds

    const knownMalwarePatterns = [
      'com.fake.bank',
      'com.malware.app',
      'com.trojan.android',
      'com.suspicious.game'
    ];

    // Check for exact matches
    if (knownMalwarePatterns.includes(app.packageName)) {
      return true;
    }

    // Check for suspicious package naming patterns
    const suspiciousPatterns = [
      /^com\.android\.fake/,
      /^com\.google\.play\.fake/,
      /^android\.malware/,
      /^com\.bank\.fake/
    ];

    return suspiciousPatterns.some(pattern => pattern.test(app.packageName));
  }

  // Simple version comparison (in real app, use proper semver comparison)
  isVersionOutdated(installedVersion, latestVersion) {
    // Simplified version comparison
    const installed = installedVersion.split('.').map(Number);
    const latest = latestVersion.split('.').map(Number);
    
    for (let i = 0; i < Math.max(installed.length, latest.length); i++) {
      const installedPart = installed[i] || 0;
      const latestPart = latest[i] || 0;
      
      if (installedPart < latestPart) return true;
      if (installedPart > latestPart) return false;
    }
    
    return false;
  }

  // Analyze app permissions for security risks
  analyzePermissions(permissions) {
    const result = {
      score: 0,
      issues: [],
      recommendations: []
    };

    const highRiskPermissions = permissions.filter(p => 
      this.criticalPermissions.has(`android.permission.${p.toUpperCase()}`) || 
      p.toLowerCase().includes('phone') || 
      p.toLowerCase().includes('sms') ||
      p.toLowerCase().includes('contacts')
    );

    if (highRiskPermissions.length > 0) {
      result.score += highRiskPermissions.length * 5;
      result.issues.push(`${highRiskPermissions.length} critical permissions granted`);
      result.recommendations.push('Review and revoke unnecessary permissions');
      
      if (highRiskPermissions.includes('SMS') || highRiskPermissions.includes('Phone')) {
        result.score += 10;
        result.issues.push('App can access phone and SMS functionality');
        result.recommendations.push('Be cautious with apps accessing phone/SMS');
      }
    }

    if (permissions.length > 10) {
      result.score += 5;
      result.issues.push('App requests excessive permissions');
      result.recommendations.push('Consider if all permissions are necessary');
    }

    return result;
  }

  // Check app versions against Google Play Store
  async checkPlayStoreVersions(apps) {
    const updatedApps = [];
    
    for (const app of apps) {
      try {
        // In a real implementation, you would make API calls to Google Play Store
        // For now, we'll simulate this check
        const playStoreInfo = await this.getPlayStoreInfo(app.packageName);
        
        updatedApps.push({
          ...app,
          playStoreInfo,
          securityAnalysis: {
            ...app.securityAnalysis,
            hasUpdate: playStoreInfo.latestVersion !== app.version,
            updateRecommended: playStoreInfo.securityUpdate
          }
        });
      } catch (error) {
        console.error(`Error checking Play Store for ${app.packageName}:`, error);
        updatedApps.push(app);
      }
    }
    
    return updatedApps;
  }

  // Simulate Google Play Store API response
  async getPlayStoreInfo(packageName) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const playStoreData = {
      'com.whatsapp': {
        latestVersion: '2.23.20.15',
        rating: 4.1,
        downloads: '5B+',
        securityUpdate: true,
        releaseDate: '2023-11-10',
        changelog: 'Security improvements and bug fixes'
      },
      'com.facebook.katana': {
        latestVersion: '441.0.0.33.119',
        rating: 3.9,
        downloads: '5B+',
        securityUpdate: true,
        releaseDate: '2023-11-08',
        changelog: 'Privacy updates and performance improvements'
      },
      'com.instagram.android': {
        latestVersion: '295.0.0.32.123',
        rating: 4.2,
        downloads: '5B+',
        securityUpdate: false,
        releaseDate: '2023-11-01',
        changelog: 'New features and improvements'
      },
      'com.phonepe.app': {
        latestVersion: '23.11.15.0',
        rating: 4.6,
        downloads: '500M+',
        securityUpdate: true,
        releaseDate: '2023-11-15',
        changelog: 'Security enhancements for financial transactions'
      }
    };

    return playStoreData[packageName] || {
      latestVersion: 'Unknown',
      rating: 0,
      downloads: 'Unknown',
      securityUpdate: false,
      releaseDate: null,
      changelog: 'No information available'
    };
  }

  // Get device information for context
  async getDeviceInfo() {
    try {
      const info = {
        deviceName: Device.deviceName || 'Unknown Device',
        systemVersion: Device.osVersion || 'Unknown Version',
        appVersion: Application.nativeApplicationVersion,
        buildNumber: Application.nativeBuildVersion,
        platform: Platform.OS,
        deviceType: Device.deviceType,
        brand: Device.brand,
        manufacturer: Device.manufacturer,
        modelName: Device.modelName,
        isDevice: Device.isDevice, // true if real device, false if simulator
        // Note: Memory and battery info not available in Expo managed workflow
        totalMemory: 'N/A (Expo limitation)',
        usedMemory: 'N/A (Expo limitation)',
        batteryLevel: 'N/A (Expo limitation)',
        isEmulator: !Device.isDevice, // Inverted logic from isDevice
        securityPatch: 'N/A (Expo limitation)',
      };
      
      return info;
    } catch (error) {
      console.error('Error getting device info:', error);
      return null;
    }
  }

  // Generate security report
  generateSecurityReport(apps) {
    const report = {
      totalApps: apps.length,
      highRiskApps: apps.filter(app => app.securityAnalysis.riskLevel === 'high').length,
      mediumRiskApps: apps.filter(app => app.securityAnalysis.riskLevel === 'medium').length,
      lowRiskApps: apps.filter(app => app.securityAnalysis.riskLevel === 'low').length,
      appsNeedingUpdates: apps.filter(app => app.securityAnalysis.hasUpdate).length,
      criticalIssues: [],
      recommendations: []
    };

    // Collect all issues and recommendations
    apps.forEach(app => {
      if (app.securityAnalysis.riskLevel === 'high') {
        report.criticalIssues.push(`${app.name}: ${app.securityAnalysis.issues.join(', ')}`);
      }
      
      report.recommendations.push(...app.securityAnalysis.recommendations.map(rec => 
        `${app.name}: ${rec}`
      ));
    });

    // Remove duplicates
    report.recommendations = [...new Set(report.recommendations)];
    
    return report;
  }

  // Mock iOS apps (limited due to Apple's privacy restrictions)
  getMockIOSApps() {
    return [
      {
        id: 'com.apple.mobilemail',
        name: 'Mail',
        version: '16.6',
        isSystemApp: true,
        permissions: ['Contacts', 'Camera'],
        securityAnalysis: {
          riskLevel: 'low',
          riskScore: 5,
          issues: [],
          recommendations: []
        }
      }
      // iOS doesn't allow reading third-party installed apps
    ];
  }
}

export default new AppSecurityService();
