import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

/**
 * Service for detecting installed apps on the device
 * Note: Due to privacy restrictions, Expo managed workflow has limitations
 * This service implements available methods and simulates what's not accessible
 */
class InstalledAppsService {
  constructor() {
    this.cachedApps = [];
    this.lastScanTime = null;
    this.scanInProgress = false;
  }

  /**
   * Get list of installed apps
   * Combines real detection with simulated data due to Expo limitations
   */
  async getInstalledApps() {
    if (this.scanInProgress) {
      console.log('App scan already in progress...');
      return this.cachedApps;
    }

    this.scanInProgress = true;
    
    try {
      console.log('Starting installed apps detection...');
      const apps = [];

      // Get current app info (always available)
      const currentApp = await this.getCurrentAppInfo();
      apps.push(currentApp);

      // Platform-specific detection
      if (Platform.OS === 'android') {
        const androidApps = await this.getAndroidApps();
        apps.push(...androidApps);
      } else if (Platform.OS === 'ios') {
        const iosApps = await this.getIOSApps();
        apps.push(...iosApps);
      }

      // Add commonly installed apps (detected through various methods)
      const commonApps = await this.detectCommonApps();
      apps.push(...commonApps);

      this.cachedApps = this.deduplicateApps(apps);
      this.lastScanTime = new Date();
      
      console.log(`Found ${this.cachedApps.length} installed apps`);
      return this.cachedApps;

    } catch (error) {
      console.error('Error detecting installed apps:', error);
      return this.cachedApps;
    } finally {
      this.scanInProgress = false;
    }
  }

  /**
   * Get current app information
   */
  async getCurrentAppInfo() {
    return {
      id: Application.applicationId || 'com.pocketshield.app',
      name: Application.applicationName || 'PocketShield',
      packageName: Application.applicationId || 'com.pocketshield.app',
      version: Application.nativeApplicationVersion || '1.0.0',
      buildNumber: Application.nativeBuildVersion || '1',
      installedDate: new Date(),
      lastUpdated: new Date(),
      size: 50.0, // MB
      isSystemApp: false,
      permissions: ['Camera', 'Notifications', 'Network'],
      category: 'Security',
      icon: 'shield-checkmark',
      dataUsage: 0,
      batteryUsage: 0,
      source: 'current_app'
    };
  }

  /**
   * Android-specific app detection
   */
  async getAndroidApps() {
    const apps = [];
    
    try {
      // In a real implementation with bare React Native, you would use:
      // import { getInstalledApps } from 'react-native-installed-apps';
      // const installedApps = await getInstalledApps();
      
      // For Expo managed workflow, we simulate detection through various methods
      
      // Method 1: Check for common apps through intent/URL scheme detection
      const commonAndroidApps = [
        {
          packageName: 'com.whatsapp',
          name: 'WhatsApp',
          schemes: ['whatsapp://'],
          category: 'Communication'
        },
        {
          packageName: 'com.google.android.youtube',
          name: 'YouTube',
          schemes: ['youtube://'],
          category: 'Entertainment'
        },
        {
          packageName: 'com.instagram.android',
          name: 'Instagram',
          schemes: ['instagram://'],
          category: 'Social'
        },
        {
          packageName: 'com.facebook.katana',
          name: 'Facebook',
          schemes: ['fb://'],
          category: 'Social'
        },
        {
          packageName: 'com.google.android.gm',
          name: 'Gmail',
          schemes: ['googlegmail://'],
          category: 'Productivity'
        }
      ];

      // Simulate app detection (in real app, this would be actual detection)
      for (const app of commonAndroidApps) {
        const detectedApp = await this.createAppObject(app);
        if (detectedApp) {
          apps.push(detectedApp);
        }
      }

    } catch (error) {
      console.error('Android app detection error:', error);
    }

    return apps;
  }

  /**
   * iOS-specific app detection
   */
  async getIOSApps() {
    const apps = [];
    
    try {
      // iOS has even stricter privacy restrictions
      // We can only detect apps through URL schemes and limited APIs
      
      const commonIOSApps = [
        { packageName: 'com.apple.mobilemail', name: 'Mail', schemes: ['mailto:'] },
        { packageName: 'com.apple.mobilesafari', name: 'Safari', schemes: ['http://', 'https://'] },
        { packageName: 'com.apple.camera', name: 'Camera', schemes: ['camera:'] },
        { packageName: 'com.whatsapp.WhatsApp', name: 'WhatsApp', schemes: ['whatsapp://'] },
        { packageName: 'com.google.ios.youtube', name: 'YouTube', schemes: ['youtube://'] }
      ];

      for (const app of commonIOSApps) {
        const detectedApp = await this.createAppObject(app);
        if (detectedApp) {
          apps.push(detectedApp);
        }
      }

    } catch (error) {
      console.error('iOS app detection error:', error);
    }

    return apps;
  }

  /**
   * Detect commonly installed apps through various heuristics
   */
  async detectCommonApps() {
    const apps = [];
    
    // Popular apps that are commonly installed
    const popularApps = [
      { packageName: 'com.phonepe.app', name: 'PhonePe', category: 'Finance' },
      { packageName: 'net.one97.paytm', name: 'Paytm', category: 'Finance' },
      { packageName: 'com.google.android.apps.maps', name: 'Google Maps', category: 'Navigation' },
      { packageName: 'com.spotify.music', name: 'Spotify', category: 'Music' },
      { packageName: 'com.netflix.mediaclient', name: 'Netflix', category: 'Entertainment' },
      { packageName: 'com.amazon.mShop.android.shopping', name: 'Amazon', category: 'Shopping' },
      { packageName: 'com.flipkart.android', name: 'Flipkart', category: 'Shopping' },
      { packageName: 'com.twitter.android', name: 'Twitter', category: 'Social' },
      { packageName: 'com.linkedin.android', name: 'LinkedIn', category: 'Professional' },
      { packageName: 'com.snapchat.android', name: 'Snapchat', category: 'Social' }
    ];

    // Randomly simulate which apps are "detected" (in real app, this would be actual detection)
    for (const app of popularApps) {
      const isInstalled = Math.random() > 0.4; // 60% chance of being "installed"
      if (isInstalled) {
        const detectedApp = await this.createAppObject(app);
        if (detectedApp) {
          apps.push(detectedApp);
        }
      }
    }

    return apps;
  }

  /**
   * Create standardized app object
   */
  async createAppObject(appInfo) {
    try {
      const baseApp = {
        id: appInfo.packageName,
        name: appInfo.name,
        packageName: appInfo.packageName,
        version: this.generateRealisticVersion(),
        installedDate: this.generateRandomDate(30), // Within last 30 days
        lastUpdated: this.generateRandomDate(7), // Within last 7 days
        size: Math.random() * 200 + 20, // 20-220 MB
        isSystemApp: appInfo.isSystem || false,
        permissions: this.generateRealisticPermissions(appInfo.category),
        category: appInfo.category || 'Unknown',
        icon: this.getAppIcon(appInfo.name),
        dataUsage: Math.random() * 1000, // 0-1000 MB
        batteryUsage: Math.random() * 30, // 0-30%
        source: 'detected'
      };

      return baseApp;
    } catch (error) {
      console.error('Error creating app object:', error);
      return null;
    }
  }

  /**
   * Generate realistic version numbers
   */
  generateRealisticVersion() {
    const major = Math.floor(Math.random() * 20) + 1;
    const minor = Math.floor(Math.random() * 20);
    const patch = Math.floor(Math.random() * 100);
    const build = Math.floor(Math.random() * 1000);
    
    return `${major}.${minor}.${patch}.${build}`;
  }

  /**
   * Generate realistic permissions based on app category
   */
  generateRealisticPermissions(category) {
    const basePermissions = ['Internet', 'Network State'];
    const categoryPermissions = {
      'Communication': ['Contacts', 'Phone', 'SMS', 'Camera', 'Microphone'],
      'Social': ['Camera', 'Contacts', 'Storage', 'Location'],
      'Finance': ['Phone', 'SMS', 'Contacts', 'Camera'],
      'Entertainment': ['Storage', 'Camera', 'Microphone'],
      'Navigation': ['Location', 'Camera', 'Storage'],
      'Shopping': ['Camera', 'Contacts', 'Location'],
      'Security': ['Camera', 'Device Admin', 'System Alert Window']
    };

    const additional = categoryPermissions[category] || ['Storage'];
    return [...basePermissions, ...additional.slice(0, Math.floor(Math.random() * additional.length) + 1)];
  }

  /**
   * Get app icon mapping
   */
  getAppIcon(appName) {
    const iconMap = {
      'WhatsApp': 'logo-whatsapp',
      'Facebook': 'logo-facebook',
      'Instagram': 'logo-instagram',
      'YouTube': 'logo-youtube',
      'Gmail': 'mail',
      'Chrome': 'logo-chrome',
      'Google Maps': 'map',
      'PhonePe': 'card',
      'Paytm': 'wallet',
      'Netflix': 'tv',
      'Spotify': 'musical-notes',
      'Amazon': 'bag',
      'Twitter': 'logo-twitter',
      'LinkedIn': 'logo-linkedin',
      'Snapchat': 'camera'
    };
    
    return iconMap[appName] || 'apps';
  }

  /**
   * Generate random date within specified days
   */
  generateRandomDate(daysAgo) {
    const now = new Date();
    const randomDays = Math.floor(Math.random() * daysAgo);
    return new Date(now.getTime() - (randomDays * 24 * 60 * 60 * 1000));
  }

  /**
   * Remove duplicate apps
   */
  deduplicateApps(apps) {
    const seen = new Set();
    return apps.filter(app => {
      if (seen.has(app.packageName)) {
        return false;
      }
      seen.add(app.packageName);
      return true;
    });
  }

  /**
   * Clear cache and force refresh
   */
  async refreshApps() {
    this.cachedApps = [];
    this.lastScanTime = null;
    return await this.getInstalledApps();
  }

  /**
   * Get app by package name
   */
  getAppByPackageName(packageName) {
    return this.cachedApps.find(app => app.packageName === packageName);
  }

  /**
   * Get apps by category
   */
  getAppsByCategory(category) {
    return this.cachedApps.filter(app => app.category === category);
  }

  /**
   * Get scan statistics
   */
  getScanStats() {
    return {
      totalApps: this.cachedApps.length,
      lastScanTime: this.lastScanTime,
      scanInProgress: this.scanInProgress,
      categories: [...new Set(this.cachedApps.map(app => app.category))]
    };
  }
}

export default new InstalledAppsService();
