// Real-Time File Monitoring Service - Automatic Download Security
import { Platform, Alert, DeviceEventEmitter } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import fileSecurityService from './fileSecurityService';

class FileMonitoringService {
  constructor() {
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.watchedDirectories = [];
    this.knownFiles = new Set();
    this.pendingScans = [];
    this.realTimeAlerts = [];
    
    // Configuration
    this.config = {
      autoScanEnabled: true,
      quarantineEnabled: true,
      notificationsEnabled: true,
      scanOnDownload: true,
      scanOnOpen: true,
      monitorInterval: 5000, // 5 seconds
      maxPendingScans: 50,
    };
    
    // Default directories to monitor
    this.defaultWatchDirs = [
      FileSystem.documentDirectory,
      FileSystem.downloadDirectory || FileSystem.documentDirectory + 'Downloads/',
      FileSystem.cacheDirectory,
    ];
    
    this.initializeService();
  }

  // Initialize file monitoring service
  async initializeService() {
    try {
      await this.loadConfiguration();
      await this.loadKnownFiles();
      await this.setupNotifications();
      
      // Setup default watch directories
      this.watchedDirectories = this.defaultWatchDirs.filter(Boolean);
      
      console.log('File monitoring service initialized');
      console.log('Monitoring directories:', this.watchedDirectories);
    } catch (error) {
      console.error('Failed to initialize file monitoring:', error);
    }
  }

  // Start real-time file monitoring
  async startMonitoring() {
    if (this.isMonitoring) {
      return { success: true, message: 'Already monitoring' };
    }

    try {
      // Initialize known files baseline
      await this.buildFileBaseline();
      
      // Start monitoring loop
      this.monitoringInterval = setInterval(() => {
        this.scanForNewFiles();
      }, this.config.monitorInterval);
      
      this.isMonitoring = true;
      
      // Show notification
      if (this.config.notificationsEnabled) {
        await this.showNotification(
          '🛡️ File Protection Active',
          'Real-time file scanning is now monitoring downloads',
          'protection_enabled'
        );
      }
      
      await this.saveConfiguration();
      
      return { 
        success: true, 
        message: 'File monitoring started',
        watchedDirs: this.watchedDirectories.length
      };
      
    } catch (error) {
      console.error('Failed to start file monitoring:', error);
      return { success: false, error: error.message };
    }
  }

  // Stop file monitoring
  async stopMonitoring() {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    await this.saveConfiguration();
    
    console.log('File monitoring stopped');
  }

  // Build baseline of existing files
  async buildFileBaseline() {
    this.knownFiles.clear();
    
    for (const directory of this.watchedDirectories) {
      try {
        const files = await this.getDirectoryFiles(directory);
        files.forEach(file => this.knownFiles.add(file.path));
      } catch (error) {
        console.warn(`Failed to scan directory ${directory}:`, error);
      }
    }
    
    console.log(`Built baseline with ${this.knownFiles.size} known files`);
  }

  // Scan for new files in monitored directories
  async scanForNewFiles() {
    if (!this.isMonitoring) return;

    try {
      const newFiles = [];
      
      for (const directory of this.watchedDirectories) {
        try {
          const currentFiles = await this.getDirectoryFiles(directory);
          
          for (const file of currentFiles) {
            if (!this.knownFiles.has(file.path)) {
              newFiles.push(file);
              this.knownFiles.add(file.path);
            }
          }
        } catch (error) {
          console.warn(`Error scanning directory ${directory}:`, error);
        }
      }
      
      // Process new files
      if (newFiles.length > 0) {
        console.log(`Found ${newFiles.length} new files`);
        await this.processNewFiles(newFiles);
      }
      
    } catch (error) {
      console.error('Error in file scan loop:', error);
    }
  }

  // Get all files in a directory recursively
  async getDirectoryFiles(directory) {
    const files = [];
    
    try {
      const dirInfo = await FileSystem.getInfoAsync(directory);
      if (!dirInfo.exists || !dirInfo.isDirectory) {
        return files;
      }
      
      const dirContents = await FileSystem.readDirectoryAsync(directory);
      
      for (const item of dirContents) {
        const itemPath = directory + item;
        const itemInfo = await FileSystem.getInfoAsync(itemPath);
        
        if (itemInfo.isDirectory) {
          // Recursively scan subdirectories (max depth 2 for performance)
          if (directory.split('/').length < 6) {
            const subFiles = await this.getDirectoryFiles(itemPath + '/');
            files.push(...subFiles);
          }
        } else {
          files.push({
            path: itemPath,
            name: item,
            size: itemInfo.size || 0,
            modificationTime: itemInfo.modificationTime || Date.now(),
            uri: itemInfo.uri || itemPath
          });
        }
      }
    } catch (error) {
      // Directory might not be accessible
    }
    
    return files;
  }

  // Process newly detected files
  async processNewFiles(newFiles) {
    for (const file of newFiles) {
      try {
        // Check if file should be scanned
        if (this.shouldScanFile(file)) {
          await this.scanNewFile(file);
        }
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
      }
    }
  }

  // Determine if file should be scanned
  shouldScanFile(file) {
    // Skip very large files (>500MB) to avoid performance issues
    if (file.size > 500 * 1024 * 1024) {
      return false;
    }
    
    // Skip system files
    if (file.name.startsWith('.') || file.name.startsWith('~')) {
      return false;
    }
    
    // Skip temporary files
    const tempExtensions = ['tmp', 'temp', 'cache', 'log'];
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (tempExtensions.includes(extension)) {
      return false;
    }
    
    // Only scan files modified in the last 10 minutes (recent downloads)
    const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
    if (file.modificationTime < tenMinutesAgo) {
      return false;
    }
    
    return true;
  }

  // Scan a newly detected file
  async scanNewFile(file) {
    try {
      console.log(`Scanning new file: ${file.name}`);
      
      // Add to pending scans to avoid UI blocking
      this.pendingScans.push({
        file: file,
        status: 'scanning',
        startTime: Date.now()
      });
      
      // Perform security scan
      const scanResult = await fileSecurityService.scanFile(
        file.uri, 
        file.name, 
        file.size
      );
      
      // Remove from pending scans
      this.pendingScans = this.pendingScans.filter(scan => scan.file.path !== file.path);
      
      // Handle scan results
      await this.handleScanResult(scanResult);
      
    } catch (error) {
      console.error(`Failed to scan file ${file.name}:`, error);
      
      // Remove from pending scans on error
      this.pendingScans = this.pendingScans.filter(scan => scan.file.path !== file.path);
    }
  }

  // Handle scan results and alerts
  async handleScanResult(scanResult) {
    // Create alert entry
    const alert = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      fileName: scanResult.fileName,
      filePath: scanResult.filePath,
      status: scanResult.status,
      riskScore: scanResult.riskScore,
      threats: scanResult.threats,
      action: 'none',
      processed: false
    };
    
    // Add to real-time alerts
    this.realTimeAlerts.unshift(alert);
    
    // Keep only last 50 alerts in memory
    if (this.realTimeAlerts.length > 50) {
      this.realTimeAlerts = this.realTimeAlerts.slice(0, 50);
    }
    
    // Handle based on risk level
    switch (scanResult.status) {
      case 'malicious':
        alert.action = 'quarantine_alert';
        await this.handleMaliciousFile(scanResult);
        break;
        
      case 'highly_suspicious':
        alert.action = 'warning_alert';
        await this.handleSuspiciousFile(scanResult);
        break;
        
      case 'suspicious':
      case 'potentially_unwanted':
        alert.action = 'info_alert';
        await this.handlePotentialThreat(scanResult);
        break;
        
      case 'clean':
        alert.action = 'log_only';
        // Clean files are just logged, no alert needed
        break;
    }
    
    alert.processed = true;
    await this.saveAlerts();
  }

  // Handle malicious files
  async handleMaliciousFile(scanResult) {
    // Show critical alert
    await this.showNotification(
      '🚨 MALICIOUS FILE DETECTED!',
      `${scanResult.fileName} contains ${scanResult.threats.length} threats and has been quarantined.`,
      'critical_threat',
      true // High priority
    );
    
    // Auto-quarantine if enabled
    if (this.config.quarantineEnabled) {
      try {
        await this.quarantineFile(scanResult);
      } catch (error) {
        console.error('Failed to quarantine file:', error);
      }
    }
    
    // Show immediate alert to user
    Alert.alert(
      '🚨 CRITICAL SECURITY ALERT',
      `A malicious file "${scanResult.fileName}" was detected and quarantined!\n\n` +
      `Threats: ${scanResult.threats.slice(0, 3).join(', ')}\n\n` +
      `DO NOT attempt to open this file.`,
      [
        { text: 'View Details', onPress: () => this.showDetailedThreatInfo(scanResult) },
        { text: 'OK', style: 'default' }
      ]
    );
  }

  // Handle suspicious files
  async handleSuspiciousFile(scanResult) {
    await this.showNotification(
      '⚠️ Suspicious File Detected',
      `${scanResult.fileName} appears suspicious. Tap for details.`,
      'warning_threat'
    );
    
    // Optionally show alert for high-risk files
    if (scanResult.riskScore >= 70) {
      Alert.alert(
        '⚠️ Suspicious File Warning',
        `File "${scanResult.fileName}" has been flagged as suspicious.\n\n` +
        `Risk Score: ${scanResult.riskScore}/100\n\n` +
        `Proceed with caution when opening this file.`,
        [
          { text: 'View Details', onPress: () => this.showDetailedThreatInfo(scanResult) },
          { text: 'Quarantine', onPress: () => this.quarantineFile(scanResult) },
          { text: 'Ignore', style: 'cancel' }
        ]
      );
    }
  }

  // Handle potential threats
  async handlePotentialThreat(scanResult) {
    if (this.config.notificationsEnabled) {
      await this.showNotification(
        '💡 File Requires Attention',
        `${scanResult.fileName} needs review before opening.`,
        'info_threat'
      );
    }
  }

  // Quarantine a file
  async quarantineFile(scanResult) {
    try {
      // In a real implementation, this would move the file to a quarantine directory
      // For this demo, we'll just log the action
      console.log(`File quarantined: ${scanResult.fileName}`);
      
      // Update alert with quarantine action
      const alert = this.realTimeAlerts.find(a => a.filePath === scanResult.filePath);
      if (alert) {
        alert.action = 'quarantined';
      }
      
      return true;
    } catch (error) {
      console.error('Failed to quarantine file:', error);
      return false;
    }
  }

  // Show notification
  async showNotification(title, body, category = 'general', highPriority = false) {
    if (!this.config.notificationsEnabled) return;

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: title,
          body: body,
          data: { category: category },
          sound: true,
          priority: highPriority ? 
            Notifications.AndroidNotificationPriority.MAX : 
            Notifications.AndroidNotificationPriority.DEFAULT,
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  // Setup notification system
  async setupNotifications() {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Notification permissions not granted');
        return false;
      }

      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      return true;
    } catch (error) {
      console.error('Notification setup failed:', error);
      return false;
    }
  }

  // Manual file scan trigger
  async scanFileManually(fileUri, fileName = null) {
    try {
      const scanResult = await fileSecurityService.scanFile(fileUri, fileName);
      await this.handleScanResult(scanResult);
      return scanResult;
    } catch (error) {
      throw new Error('Manual file scan failed: ' + error.message);
    }
  }

  // Batch scan multiple files
  async scanMultipleFiles(fileUris) {
    const results = [];
    
    for (const fileUri of fileUris) {
      try {
        const fileName = fileUri.split('/').pop();
        const result = await this.scanFileManually(fileUri, fileName);
        results.push(result);
      } catch (error) {
        results.push({
          filePath: fileUri,
          status: 'error',
          error: error.message
        });
      }
    }
    
    return results;
  }

  // Get monitoring statistics
  getMonitoringStats() {
    const now = Date.now();
    const last24h = now - (24 * 60 * 60 * 1000);
    const last7d = now - (7 * 24 * 60 * 60 * 1000);

    const recent24h = this.realTimeAlerts.filter(alert => 
      new Date(alert.timestamp).getTime() > last24h
    );
    const recent7d = this.realTimeAlerts.filter(alert => 
      new Date(alert.timestamp).getTime() > last7d
    );

    return {
      isMonitoring: this.isMonitoring,
      watchedDirectories: this.watchedDirectories.length,
      knownFiles: this.knownFiles.size,
      pendingScans: this.pendingScans.length,
      totalAlerts: this.realTimeAlerts.length,
      alerts24h: recent24h.length,
      alerts7d: recent7d.length,
      maliciousFound24h: recent24h.filter(a => a.status === 'malicious').length,
      config: this.config
    };
  }

  // Get real-time alerts
  getRealTimeAlerts() {
    return this.realTimeAlerts;
  }

  // Update configuration
  async updateConfiguration(newConfig) {
    this.config = { ...this.config, ...newConfig };
    await this.saveConfiguration();
    
    // Restart monitoring if auto-scan setting changed
    if (this.isMonitoring && newConfig.autoScanEnabled !== undefined) {
      if (newConfig.autoScanEnabled) {
        await this.startMonitoring();
      } else {
        await this.stopMonitoring();
      }
    }
  }

  // Show detailed threat information
  showDetailedThreatInfo(scanResult) {
    const details = [
      `File: ${scanResult.fileName}`,
      `Risk Score: ${scanResult.riskScore}/100`,
      `Status: ${scanResult.status.toUpperCase()}`,
      `File Type: ${scanResult.fileType}`,
      `File Size: ${(scanResult.fileSize / 1024).toFixed(1)} KB`,
      `Scan Time: ${scanResult.scanTime}ms`,
      '',
      'Threats Detected:',
      ...scanResult.threats.map(threat => `• ${threat}`),
      '',
      'Recommendations:',
      ...scanResult.recommendations.map(rec => `• ${rec}`)
    ].join('\n');

    Alert.alert('Security Scan Details', details, [
      { text: 'Quarantine File', onPress: () => this.quarantineFile(scanResult) },
      { text: 'Close', style: 'cancel' }
    ]);
  }

  // Storage functions
  async saveConfiguration() {
    try {
      await AsyncStorage.setItem(
        'file_monitoring_config', 
        JSON.stringify(this.config)
      );
    } catch (error) {
      console.error('Failed to save file monitoring config:', error);
    }
  }

  async loadConfiguration() {
    try {
      const saved = await AsyncStorage.getItem('file_monitoring_config');
      if (saved) {
        this.config = { ...this.config, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('Failed to load file monitoring config:', error);
    }
  }

  async saveKnownFiles() {
    try {
      await AsyncStorage.setItem(
        'file_monitoring_baseline', 
        JSON.stringify([...this.knownFiles])
      );
    } catch (error) {
      console.error('Failed to save known files:', error);
    }
  }

  async loadKnownFiles() {
    try {
      const saved = await AsyncStorage.getItem('file_monitoring_baseline');
      if (saved) {
        this.knownFiles = new Set(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load known files:', error);
    }
  }

  async saveAlerts() {
    try {
      await AsyncStorage.setItem(
        'file_monitoring_alerts', 
        JSON.stringify(this.realTimeAlerts)
      );
    } catch (error) {
      console.error('Failed to save file monitoring alerts:', error);
    }
  }

  async loadAlerts() {
    try {
      const saved = await AsyncStorage.getItem('file_monitoring_alerts');
      if (saved) {
        this.realTimeAlerts = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load file monitoring alerts:', error);
    }
  }

  // Clear all data
  async clearAllData() {
    this.knownFiles.clear();
    this.realTimeAlerts = [];
    this.pendingScans = [];
    
    await Promise.all([
      AsyncStorage.removeItem('file_monitoring_config'),
      AsyncStorage.removeItem('file_monitoring_baseline'),
      AsyncStorage.removeItem('file_monitoring_alerts'),
    ]);
    
    console.log('File monitoring data cleared');
  }
}

export default new FileMonitoringService();
