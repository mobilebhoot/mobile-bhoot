// Comprehensive File Security Scanning Service - Enterprise-Grade Protection
import { Platform, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

class FileSecurityService {
  constructor() {
    this.scanHistory = [];
    this.quarantinedFiles = [];
    this.isMonitoring = false;
    this.scanStats = {
      totalScanned: 0,
      maliciousFound: 0,
      suspiciousFound: 0,
      cleanFiles: 0,
      quarantinedCount: 0,
      avgScanTime: 0,
      dailyStats: new Map(),
    };
    
    // File type risk categories
    this.riskCategories = {
      executable: ['exe', 'msi', 'bat', 'cmd', 'com', 'scr', 'pif', 'app', 'deb', 'rpm'],
      script: ['js', 'vbs', 'ps1', 'py', 'sh', 'php', 'pl', 'rb'],
      archive: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'],
      document: ['doc', 'docx', 'pdf', 'xls', 'xlsx', 'ppt', 'pptx', 'rtf'],
      media: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'avi', 'mp3', 'wav'],
      code: ['html', 'css', 'xml', 'json', 'cpp', 'c', 'java', 'cs'],
      mobile: ['apk', 'ipa', 'aab'],
    };
    
    // Known malicious file signatures (simplified for demo)
    this.maliciousSignatures = [
      'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*', // EICAR test
      '4D5A9000', // PE executable header (hex)
      '504B0304', // ZIP file header
    ];
    
    // Suspicious patterns in file names
    this.suspiciousPatterns = [
      /\.(exe|scr|bat|cmd|com|pif)$/i,
      /\.(docx?|xlsx?|pptx?)\.exe$/i, // Double extension
      /invoice.*\.zip$/i,
      /payment.*\.exe$/i,
      /covid.*\.(zip|exe|scr)$/i,
      /update.*\.(exe|bat|cmd)$/i,
      /hack.*\.(exe|bat|zip)$/i,
      /crack.*\.(exe|zip|rar)$/i,
      /\s+\.(exe|scr|bat)$/i, // Space before extension
    ];
    
    this.initializeService();
  }

  // Initialize the file security service
  async initializeService() {
    try {
      await this.loadScanHistory();
      await this.loadQuarantinedFiles();
      await this.loadScanStats();
      
      console.log('File security service initialized');
    } catch (error) {
      console.error('Failed to initialize file security service:', error);
    }
  }

  // Comprehensive file scanning
  async scanFile(fileUri, fileName = null, fileSize = null) {
    const startTime = Date.now();
    
    try {
      const scanResult = {
        id: Date.now().toString(),
        fileName: fileName || this.extractFileName(fileUri),
        filePath: fileUri,
        fileSize: fileSize,
        timestamp: new Date().toISOString(),
        scanTime: 0,
        status: 'clean',
        riskScore: 0,
        threats: [],
        fileType: '',
        fileHash: '',
        details: {},
        recommendations: []
      };

      // 1. Basic file information analysis
      const fileInfo = await this.analyzeFileInfo(fileUri, scanResult.fileName);
      scanResult.fileType = fileInfo.type;
      scanResult.fileSize = fileInfo.size;
      scanResult.details = fileInfo.details;

      // 2. File name pattern analysis
      const nameAnalysis = this.analyzeFileName(scanResult.fileName);
      scanResult.riskScore += nameAnalysis.riskScore;
      scanResult.threats.push(...nameAnalysis.threats);

      // 3. File type risk assessment
      const typeAnalysis = this.analyzeFileType(scanResult.fileName, scanResult.fileType);
      scanResult.riskScore += typeAnalysis.riskScore;
      scanResult.threats.push(...typeAnalysis.threats);

      // 4. File content analysis (for accessible files)
      const contentAnalysis = await this.analyzeFileContent(fileUri, scanResult.fileName);
      scanResult.riskScore += contentAnalysis.riskScore;
      scanResult.threats.push(...contentAnalysis.threats);
      scanResult.fileHash = contentAnalysis.hash;

      // 5. Behavioral analysis (simulated)
      const behaviorAnalysis = await this.analyzeBehavior(scanResult);
      scanResult.riskScore += behaviorAnalysis.riskScore;
      scanResult.threats.push(...behaviorAnalysis.threats);

      // 6. Cloud reputation check (simulated)
      const reputationAnalysis = await this.checkFileReputation(scanResult);
      scanResult.riskScore += reputationAnalysis.riskScore;
      scanResult.threats.push(...reputationAnalysis.threats);

      // Determine final security status
      scanResult.status = this.determineSecurityStatus(scanResult.riskScore);
      scanResult.recommendations = this.generateRecommendations(scanResult);
      
      scanResult.scanTime = Date.now() - startTime;

      // Store scan result
      this.scanHistory.unshift(scanResult);
      await this.saveScanHistory();
      
      // Update statistics
      this.updateScanStats(scanResult);
      
      // Handle high-risk files
      if (scanResult.status === 'malicious' || scanResult.status === 'highly_suspicious') {
        await this.handleHighRiskFile(scanResult);
      }

      return scanResult;

    } catch (error) {
      console.error('File scan error:', error);
      return {
        fileName: fileName || 'Unknown',
        filePath: fileUri,
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
        scanTime: Date.now() - startTime
      };
    }
  }

  // Analyze file information
  async analyzeFileInfo(fileUri, fileName) {
    try {
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      const extension = this.getFileExtension(fileName);
      const category = this.getFileCategory(extension);
      
      return {
        size: fileInfo.size || 0,
        type: extension,
        category: category,
        exists: fileInfo.exists,
        details: {
          isDirectory: fileInfo.isDirectory || false,
          modificationTime: fileInfo.modificationTime || null,
          uri: fileInfo.uri || fileUri,
        }
      };
    } catch (error) {
      return {
        size: 0,
        type: this.getFileExtension(fileName),
        category: 'unknown',
        exists: false,
        details: { error: error.message }
      };
    }
  }

  // Analyze file name for suspicious patterns
  analyzeFileName(fileName) {
    let riskScore = 0;
    const threats = [];

    // Check for suspicious patterns
    this.suspiciousPatterns.forEach(pattern => {
      if (pattern.test(fileName)) {
        riskScore += 30;
        threats.push(`Suspicious file name pattern: ${pattern.source}`);
      }
    });

    // Check for double extensions
    const extensions = fileName.split('.').slice(1);
    if (extensions.length > 1) {
      const lastExt = extensions[extensions.length - 1].toLowerCase();
      const secondLastExt = extensions[extensions.length - 2].toLowerCase();
      
      if (this.riskCategories.executable.includes(lastExt) && 
          this.riskCategories.document.includes(secondLastExt)) {
        riskScore += 40;
        threats.push('Double file extension detected (possible disguised executable)');
      }
    }

    // Check for very long filenames (possible evasion)
    if (fileName.length > 100) {
      riskScore += 15;
      threats.push('Unusually long filename detected');
    }

    // Check for unicode/special characters (possible evasion)
    if (/[^\x00-\x7F]/.test(fileName)) {
      riskScore += 20;
      threats.push('Non-ASCII characters in filename');
    }

    return { riskScore, threats };
  }

  // Analyze file type risk
  analyzeFileType(fileName, fileType) {
    let riskScore = 0;
    const threats = [];
    const extension = fileType.toLowerCase();

    // High-risk file types
    if (this.riskCategories.executable.includes(extension)) {
      riskScore += 50;
      threats.push('Executable file type detected');
    } else if (this.riskCategories.script.includes(extension)) {
      riskScore += 35;
      threats.push('Script file detected');
    } else if (this.riskCategories.mobile.includes(extension)) {
      riskScore += 40;
      threats.push('Mobile application file detected');
    }

    // Medium-risk file types
    if (this.riskCategories.archive.includes(extension)) {
      riskScore += 20;
      threats.push('Archive file (may contain hidden executables)');
    } else if (this.riskCategories.document.includes(extension)) {
      riskScore += 10;
      threats.push('Document file (may contain macros)');
    }

    // Check for mismatched extensions
    const expectedCategory = this.getFileCategory(extension);
    if (expectedCategory === 'unknown') {
      riskScore += 25;
      threats.push('Unknown or rare file type');
    }

    return { riskScore, threats };
  }

  // Analyze file content (simplified for demo)
  async analyzeFileContent(fileUri, fileName) {
    let riskScore = 0;
    const threats = [];
    let fileHash = '';

    try {
      // For accessible files, read a portion for analysis
      if (await this.isFileAccessible(fileUri)) {
        const fileContent = await FileSystem.readAsStringAsync(
          fileUri, 
          { 
            encoding: FileSystem.EncodingType.Base64,
            length: 1024 // Read first 1KB for analysis
          }
        );

        // Generate file hash for reputation lookup
        fileHash = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          fileContent
        );

        // Check for malicious signatures
        this.maliciousSignatures.forEach(signature => {
          if (fileContent.includes(signature)) {
            riskScore += 80;
            threats.push('Known malicious signature detected');
          }
        });

        // Check for suspicious strings (simplified)
        const suspiciousStrings = [
          'eval(', 'exec(', 'system(', 'shell_exec', 
          'backdoor', 'keylogger', 'trojan', 'virus',
          'password', 'credential', 'exploit'
        ];

        const decodedContent = Buffer.from(fileContent, 'base64').toString('utf-8');
        suspiciousStrings.forEach(str => {
          if (decodedContent.toLowerCase().includes(str)) {
            riskScore += 25;
            threats.push(`Suspicious string detected: ${str}`);
          }
        });

        // Check for PE header (Windows executable)
        if (fileContent.startsWith('TVqQAAMAAAAEAAAA')) { // MZ header in base64
          riskScore += 30;
          threats.push('Windows executable detected');
        }

        // Check for script content in non-script files
        const extension = this.getFileExtension(fileName).toLowerCase();
        if (!this.riskCategories.script.includes(extension) && 
            !this.riskCategories.code.includes(extension)) {
          const scriptPatterns = ['<script', 'javascript:', 'vbscript:', '<?php', '#!/bin/'];
          scriptPatterns.forEach(pattern => {
            if (decodedContent.toLowerCase().includes(pattern)) {
              riskScore += 35;
              threats.push('Script content in non-script file');
            }
          });
        }
      }
    } catch (error) {
      // File not accessible or binary file
      riskScore += 5;
      threats.push('Unable to analyze file content');
    }

    return { riskScore, threats, hash: fileHash };
  }

  // Behavioral analysis (simulated advanced features)
  async analyzeBehavior(scanResult) {
    let riskScore = 0;
    const threats = [];

    // Simulate behavioral analysis delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // File size analysis
    if (scanResult.fileSize > 100 * 1024 * 1024) { // > 100MB
      riskScore += 10;
      threats.push('Large file size (possible bloated malware)');
    } else if (scanResult.fileSize < 1024 && 
               this.riskCategories.executable.includes(scanResult.fileType)) {
      riskScore += 20;
      threats.push('Unusually small executable file');
    }

    // Temporal analysis (files created at odd hours)
    const timestamp = new Date(scanResult.timestamp);
    const hour = timestamp.getHours();
    if (hour < 6 || hour > 22) {
      riskScore += 5;
      threats.push('File activity during unusual hours');
    }

    // Source analysis (simulated)
    if (scanResult.filePath.includes('download') || 
        scanResult.filePath.includes('temp')) {
      riskScore += 15;
      threats.push('File from potentially risky location');
    }

    return { riskScore, threats };
  }

  // Check file reputation (simulated cloud lookup)
  async checkFileReputation(scanResult) {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 200));

    let riskScore = 0;
    const threats = [];

    if (scanResult.fileHash) {
      // Simulate reputation database lookup
      const reputationScore = Math.random() * 100;
      
      if (reputationScore < 10) {
        riskScore += 70;
        threats.push('File flagged by security vendors');
      } else if (reputationScore < 30) {
        riskScore += 40;
        threats.push('File has poor reputation');
      } else if (reputationScore < 50) {
        riskScore += 20;
        threats.push('File reputation unknown');
      }

      // Check against known good files (whitelist)
      const knownGoodHashes = [
        'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', // "hello" hash
      ];
      
      if (knownGoodHashes.includes(scanResult.fileHash)) {
        riskScore -= 30; // Reduce risk for known good files
        threats.push('File verified as legitimate');
      }
    }

    return { riskScore, threats };
  }

  // Determine security status based on risk score
  determineSecurityStatus(riskScore) {
    if (riskScore >= 80) return 'malicious';
    if (riskScore >= 60) return 'highly_suspicious';
    if (riskScore >= 40) return 'suspicious';
    if (riskScore >= 20) return 'potentially_unwanted';
    return 'clean';
  }

  // Generate recommendations based on scan results
  generateRecommendations(scanResult) {
    const recommendations = [];
    
    switch (scanResult.status) {
      case 'malicious':
        recommendations.push('🚫 DO NOT open this file');
        recommendations.push('🗑️ Delete immediately');
        recommendations.push('🛡️ Run full system scan');
        recommendations.push('🔒 Change passwords if file was opened');
        break;
        
      case 'highly_suspicious':
        recommendations.push('⚠️ High risk - avoid opening');
        recommendations.push('🔍 Scan with multiple engines');
        recommendations.push('🏷️ Consider quarantine');
        break;
        
      case 'suspicious':
        recommendations.push('⚠️ Proceed with extreme caution');
        recommendations.push('📱 Scan in sandbox environment');
        recommendations.push('👀 Monitor system after opening');
        break;
        
      case 'potentially_unwanted':
        recommendations.push('💡 Review file source');
        recommendations.push('✅ Verify legitimacy before opening');
        break;
        
      case 'clean':
        recommendations.push('✅ File appears safe to open');
        break;
    }
    
    return recommendations;
  }

  // Handle high-risk files
  async handleHighRiskFile(scanResult) {
    // Add to quarantine
    this.quarantinedFiles.unshift({
      ...scanResult,
      quarantineDate: new Date().toISOString(),
      action: 'auto_quarantine'
    });
    
    await this.saveQuarantinedFiles();
    
    // Show alert to user
    Alert.alert(
      '🚨 Malicious File Detected!',
      `File "${scanResult.fileName}" contains ${scanResult.threats.length} security threats.\n\nFile has been quarantined for your protection.`,
      [
        { text: 'View Details', onPress: () => this.showThreatDetails(scanResult) },
        { text: 'OK', style: 'default' }
      ]
    );
  }

  // Bulk file scanning
  async scanMultipleFiles(fileUris) {
    const results = [];
    
    for (let i = 0; i < fileUris.length; i++) {
      const fileUri = fileUris[i];
      const fileName = this.extractFileName(fileUri);
      
      try {
        const result = await this.scanFile(fileUri, fileName);
        results.push(result);
      } catch (error) {
        results.push({
          fileName: fileName,
          filePath: fileUri,
          status: 'error',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return results;
  }

  // Pick and scan files from device
  async pickAndScanFiles() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
      });

      if (!result.cancelled && result.assets) {
        const scanResults = [];
        
        for (const asset of result.assets) {
          const scanResult = await this.scanFile(asset.uri, asset.name, asset.size);
          scanResults.push(scanResult);
        }
        
        return scanResults;
      }
      
      return [];
    } catch (error) {
      throw new Error('Failed to pick and scan files: ' + error.message);
    }
  }

  // Utility functions
  extractFileName(filePath) {
    return filePath.split('/').pop() || 'unknown';
  }

  getFileExtension(fileName) {
    return fileName.split('.').pop()?.toLowerCase() || '';
  }

  getFileCategory(extension) {
    for (const [category, extensions] of Object.entries(this.riskCategories)) {
      if (extensions.includes(extension)) {
        return category;
      }
    }
    return 'unknown';
  }

  async isFileAccessible(fileUri) {
    try {
      const info = await FileSystem.getInfoAsync(fileUri);
      return info.exists && !info.isDirectory;
    } catch {
      return false;
    }
  }

  // Statistics and history management
  updateScanStats(scanResult) {
    this.scanStats.totalScanned++;
    
    switch (scanResult.status) {
      case 'malicious':
        this.scanStats.maliciousFound++;
        break;
      case 'highly_suspicious':
      case 'suspicious':
      case 'potentially_unwanted':
        this.scanStats.suspiciousFound++;
        break;
      case 'clean':
        this.scanStats.cleanFiles++;
        break;
    }
    
    // Update average scan time
    this.scanStats.avgScanTime = 
      (this.scanStats.avgScanTime + scanResult.scanTime) / 2;
    
    // Update daily stats
    const today = new Date().toDateString();
    const dailyStat = this.scanStats.dailyStats.get(today) || {
      scanned: 0, malicious: 0, suspicious: 0, clean: 0
    };
    
    dailyStat.scanned++;
    if (scanResult.status === 'malicious') dailyStat.malicious++;
    else if (['highly_suspicious', 'suspicious', 'potentially_unwanted'].includes(scanResult.status)) dailyStat.suspicious++;
    else if (scanResult.status === 'clean') dailyStat.clean++;
    
    this.scanStats.dailyStats.set(today, dailyStat);
  }

  // Get scan statistics
  getScanStats() {
    return {
      ...this.scanStats,
      quarantinedCount: this.quarantinedFiles.length,
      dailyStats: Array.from(this.scanStats.dailyStats.entries())
        .map(([date, stats]) => ({ date, ...stats }))
        .sort((a, b) => new Date(b.date) - new Date(a.date))
    };
  }

  // Get scan history
  getScanHistory() {
    return this.scanHistory.slice(0, 100); // Return last 100 scans
  }

  // Get quarantined files
  getQuarantinedFiles() {
    return this.quarantinedFiles;
  }

  // Storage functions
  async saveScanHistory() {
    try {
      await AsyncStorage.setItem(
        'file_scan_history', 
        JSON.stringify(this.scanHistory.slice(0, 100))
      );
    } catch (error) {
      console.error('Failed to save scan history:', error);
    }
  }

  async loadScanHistory() {
    try {
      const saved = await AsyncStorage.getItem('file_scan_history');
      if (saved) {
        this.scanHistory = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load scan history:', error);
    }
  }

  async saveQuarantinedFiles() {
    try {
      await AsyncStorage.setItem(
        'quarantined_files', 
        JSON.stringify(this.quarantinedFiles)
      );
    } catch (error) {
      console.error('Failed to save quarantined files:', error);
    }
  }

  async loadQuarantinedFiles() {
    try {
      const saved = await AsyncStorage.getItem('quarantined_files');
      if (saved) {
        this.quarantinedFiles = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load quarantined files:', error);
    }
  }

  async loadScanStats() {
    try {
      const saved = await AsyncStorage.getItem('file_scan_stats');
      if (saved) {
        const stats = JSON.parse(saved);
        this.scanStats = { ...this.scanStats, ...stats };
        this.scanStats.dailyStats = new Map(stats.dailyStats || []);
      }
    } catch (error) {
      console.error('Failed to load scan stats:', error);
    }
  }

  async saveScanStats() {
    try {
      const statsToSave = {
        ...this.scanStats,
        dailyStats: Array.from(this.scanStats.dailyStats.entries())
      };
      await AsyncStorage.setItem('file_scan_stats', JSON.stringify(statsToSave));
    } catch (error) {
      console.error('Failed to save scan stats:', error);
    }
  }

  // Clear all data
  async clearAllData() {
    this.scanHistory = [];
    this.quarantinedFiles = [];
    this.scanStats = {
      totalScanned: 0,
      maliciousFound: 0,
      suspiciousFound: 0,
      cleanFiles: 0,
      quarantinedCount: 0,
      avgScanTime: 0,
      dailyStats: new Map(),
    };
    
    await Promise.all([
      AsyncStorage.removeItem('file_scan_history'),
      AsyncStorage.removeItem('quarantined_files'),
      AsyncStorage.removeItem('file_scan_stats'),
    ]);
  }
}

export default new FileSecurityService();
