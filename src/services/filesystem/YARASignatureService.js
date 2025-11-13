import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * YARASignatureService
 * YARA-style signature matching and threat detection engine
 * Detects malware, PUA, adware, and suspicious patterns in files
 */
class YARASignatureService {
  constructor() {
    this.rules = new Map();
    this.isInitialized = false;
    this.stats = {
      totalRules: 0,
      activeRules: 0,
      lastUpdate: null,
      matchesFound: 0
    };
  }

  /**
   * Initialize the YARA signature service
   */
  async initialize() {
    try {
      console.log('🔍 Initializing YARA Signature Service...');
      
      // Load built-in signature rules
      await this.loadBuiltinRules();
      
      // Load custom rules from storage
      await this.loadCustomRules();
      
      this.isInitialized = true;
      console.log(`✅ YARA Service initialized with ${this.stats.totalRules} rules`);
      
      return {
        initialized: true,
        totalRules: this.stats.totalRules,
        activeRules: this.stats.activeRules
      };
    } catch (error) {
      console.error('❌ Failed to initialize YARA service:', error);
      throw error;
    }
  }

  /**
   * Load built-in signature rules
   */
  async loadBuiltinRules() {
    const builtinRules = [
      // Android Malware Signatures
      {
        ruleName: 'android_malware_generic',
        category: 'malware',
        severity: 'high',
        description: 'Generic Android malware patterns',
        filePatterns: ['*.apk', '*.dex'],
        hexSignatures: [
          '50 4B 03 04', // APK header
          'DE AD BE EF'  // DEX magic
        ],
        stringPatterns: [
          'android.permission.SEND_SMS',
          'android.permission.READ_SMS', 
          'android.permission.RECEIVE_SMS'
        ],
        conditions: {
          minMatches: 2,
          maxFileSize: 100 * 1024 * 1024 // 100MB
        }
      },

      // Suspicious APK Patterns
      {
        ruleName: 'suspicious_apk_permissions',
        category: 'suspicious',
        severity: 'medium',
        description: 'APK with suspicious permission combinations',
        filePatterns: ['*.apk'],
        stringPatterns: [
          'android.permission.CAMERA',
          'android.permission.RECORD_AUDIO',
          'android.permission.ACCESS_FINE_LOCATION',
          'android.permission.READ_CONTACTS',
          'android.permission.CALL_PHONE'
        ],
        conditions: {
          minMatches: 4,
          requireAll: false
        }
      },

      // Cryptocurrency Miner
      {
        ruleName: 'crypto_miner',
        category: 'malware',
        severity: 'high',
        description: 'Cryptocurrency mining malware',
        stringPatterns: [
          'stratum+tcp://',
          'xmrig',
          'cpuminer',
          'cryptonight',
          'monero',
          'pool.supportxmr.com',
          'randomx'
        ],
        conditions: {
          minMatches: 2
        }
      },

      // Banking Trojan
      {
        ruleName: 'banking_trojan',
        category: 'malware',
        severity: 'critical',
        description: 'Banking trojan indicators',
        stringPatterns: [
          'overlay_attack',
          'accessibility_service',
          'device_admin',
          'sms_intercept',
          'bank_app_list',
          'keylog',
          'screen_capture'
        ],
        filePatterns: ['*.apk'],
        conditions: {
          minMatches: 3
        }
      },

      // Adware
      {
        ruleName: 'adware_generic',
        category: 'adware',
        severity: 'medium',
        description: 'Generic adware patterns',
        stringPatterns: [
          'aggressive_ads',
          'popup_ads',
          'notification_spam',
          'ad_fraud',
          'click_fraud',
          'admob_abuse'
        ],
        conditions: {
          minMatches: 2
        }
      },

      // PUA (Potentially Unwanted Application)
      {
        ruleName: 'pua_fake_antivirus',
        category: 'pua',
        severity: 'medium',
        description: 'Fake antivirus application',
        stringPatterns: [
          'fake_scan_results',
          'premium_upgrade',
          'virus_detected_fake',
          'security_threat_fake',
          'immediate_action_required'
        ],
        filePatterns: ['*.apk'],
        conditions: {
          minMatches: 2
        }
      },

      // Suspicious Script Files
      {
        ruleName: 'suspicious_script',
        category: 'suspicious',
        severity: 'medium',
        description: 'Suspicious script file patterns',
        filePatterns: ['*.js', '*.sh', '*.py', '*.bat'],
        stringPatterns: [
          'eval(',
          'exec(',
          'shell_exec',
          'system(',
          'base64_decode',
          'document.write',
          'unescape',
          'fromCharCode'
        ],
        conditions: {
          minMatches: 3
        }
      },

      // Archive Bomb
      {
        ruleName: 'archive_bomb',
        category: 'malware',
        severity: 'high',
        description: 'Potential zip/archive bomb',
        filePatterns: ['*.zip', '*.rar', '*.7z'],
        conditions: {
          maxCompressionRatio: 100, // Suspiciously high compression
          maxNestedLevels: 10
        }
      },

      // Phishing Assets
      {
        ruleName: 'phishing_assets',
        category: 'phishing',
        severity: 'high',
        description: 'Phishing-related assets and pages',
        filePatterns: ['*.html', '*.htm', '*.php'],
        stringPatterns: [
          'login-form',
          'password-field',
          'credit-card-input',
          'paypal-fake',
          'bank-login-fake',
          'verify-account-fake'
        ],
        conditions: {
          minMatches: 2
        }
      },

      // Suspicious Media Files
      {
        ruleName: 'suspicious_media',
        category: 'suspicious',
        severity: 'low',
        description: 'Media files with suspicious properties',
        filePatterns: ['*.jpg', '*.png', '*.mp4', '*.mp3'],
        conditions: {
          checkSteganography: true,
          unusualSize: true
        }
      }
    ];

    // Add built-in rules to the rules map
    for (const rule of builtinRules) {
      this.addRule(rule);
    }

    console.log(`📋 Loaded ${builtinRules.length} built-in signature rules`);
  }

  /**
   * Load custom rules from AsyncStorage
   */
  async loadCustomRules() {
    try {
      const customRulesJson = await AsyncStorage.getItem('yara_custom_rules');
      if (customRulesJson) {
        const customRules = JSON.parse(customRulesJson);
        for (const rule of customRules) {
          this.addRule(rule);
        }
        console.log(`📋 Loaded ${customRules.length} custom signature rules`);
      }
    } catch (error) {
      console.error('Error loading custom rules:', error);
    }
  }

  /**
   * Add a signature rule
   */
  addRule(rule) {
    const processedRule = {
      ...rule,
      id: rule.ruleName,
      isActive: rule.isActive !== false,
      createdAt: rule.createdAt || Date.now(),
      lastUsed: null,
      matchCount: 0
    };

    this.rules.set(rule.ruleName, processedRule);
    this.stats.totalRules = this.rules.size;
    this.stats.activeRules = Array.from(this.rules.values()).filter(r => r.isActive).length;
  }

  /**
   * Scan file against all active signature rules
   */
  async scanFile(filePath, fileInfo, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const {
      maxFileSize = 50 * 1024 * 1024, // 50MB limit
      skipLargeFiles = true,
      onRuleMatch = () => {}
    } = options;

    try {
      console.log(`🔍 YARA scanning: ${filePath}`);

      // Check file size limits
      if (fileInfo.fileSize > maxFileSize && skipLargeFiles) {
        console.log(`⚠️ Skipping large file: ${fileInfo.fileSize} bytes`);
        return {
          filePath,
          matches: [],
          skipped: true,
          reason: 'File too large',
          scanTime: 0
        };
      }

      const startTime = Date.now();
      const matches = [];

      // Get applicable rules for this file
      const applicableRules = this.getApplicableRules(fileInfo);
      console.log(`📋 Testing ${applicableRules.length} applicable rules`);

      // Read file content for string/hex pattern matching
      let fileContent = null;
      let fileHeader = null;

      try {
        // Read file header for quick checks
        fileHeader = await this.readFileHeader(filePath, 512);
        
        // For pattern matching, read more of the file (or all if small)
        const readSize = Math.min(fileInfo.fileSize, 1024 * 1024); // Max 1MB for pattern matching
        fileContent = await this.readFileContent(filePath, readSize);
      } catch (error) {
        console.error('Error reading file for scanning:', error);
        return {
          filePath,
          matches: [],
          error: error.message,
          scanTime: Date.now() - startTime
        };
      }

      // Test each applicable rule
      for (const rule of applicableRules) {
        try {
          const match = await this.testRule(rule, fileContent, fileHeader, fileInfo);
          if (match) {
            matches.push(match);
            this.stats.matchesFound++;
            rule.matchCount++;
            rule.lastUsed = Date.now();
            
            onRuleMatch({
              filePath,
              rule: rule.ruleName,
              match
            });

            console.log(`🚨 Rule match: ${rule.ruleName} (${rule.severity})`);
          }
        } catch (error) {
          console.error(`Error testing rule ${rule.ruleName}:`, error);
        }
      }

      const scanTime = Date.now() - startTime;
      const result = {
        filePath,
        matches,
        totalRulesTested: applicableRules.length,
        scanTime,
        error: null
      };

      if (matches.length > 0) {
        console.log(`🚨 YARA scan found ${matches.length} matches in ${scanTime}ms`);
      } else {
        console.log(`✅ YARA scan clean in ${scanTime}ms`);
      }

      return result;

    } catch (error) {
      console.error(`❌ YARA scan failed for ${filePath}:`, error);
      return {
        filePath,
        matches: [],
        error: error.message,
        scanTime: 0
      };
    }
  }

  /**
   * Get rules applicable to a specific file
   */
  getApplicableRules(fileInfo) {
    const applicableRules = [];

    for (const rule of this.rules.values()) {
      if (!rule.isActive) continue;

      // Check file pattern match
      if (rule.filePatterns && rule.filePatterns.length > 0) {
        const matchesPattern = rule.filePatterns.some(pattern => 
          this.matchesFilePattern(fileInfo.fileName, pattern)
        );
        if (!matchesPattern) continue;
      }

      // Check file size constraints
      if (rule.conditions) {
        if (rule.conditions.maxFileSize && fileInfo.fileSize > rule.conditions.maxFileSize) {
          continue;
        }
        if (rule.conditions.minFileSize && fileInfo.fileSize < rule.conditions.minFileSize) {
          continue;
        }
      }

      // Check file type
      if (rule.fileTypes && rule.fileTypes.length > 0) {
        if (!rule.fileTypes.includes(fileInfo.fileType)) {
          continue;
        }
      }

      applicableRules.push(rule);
    }

    return applicableRules;
  }

  /**
   * Test a specific rule against file content
   */
  async testRule(rule, fileContent, fileHeader, fileInfo) {
    try {
      const matches = {
        hexMatches: [],
        stringMatches: [],
        patternMatches: []
      };

      let totalMatches = 0;

      // Test hex signatures
      if (rule.hexSignatures && rule.hexSignatures.length > 0) {
        for (const hexSig of rule.hexSignatures) {
          if (this.matchesHexSignature(fileHeader, hexSig)) {
            matches.hexMatches.push(hexSig);
            totalMatches++;
          }
        }
      }

      // Test string patterns
      if (rule.stringPatterns && rule.stringPatterns.length > 0) {
        for (const stringPattern of rule.stringPatterns) {
          if (this.matchesStringPattern(fileContent, stringPattern)) {
            matches.stringMatches.push(stringPattern);
            totalMatches++;
          }
        }
      }

      // Check if rule conditions are met
      const conditions = rule.conditions || {};
      const minMatches = conditions.minMatches || 1;
      
      if (totalMatches >= minMatches) {
        return {
          ruleName: rule.ruleName,
          category: rule.category,
          severity: rule.severity,
          description: rule.description,
          matches,
          totalMatches,
          confidence: this.calculateConfidence(totalMatches, rule),
          timestamp: Date.now()
        };
      }

      return null;

    } catch (error) {
      console.error(`Error testing rule ${rule.ruleName}:`, error);
      return null;
    }
  }

  /**
   * Check if filename matches a pattern
   */
  matchesFilePattern(fileName, pattern) {
    // Convert shell-style pattern to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(fileName);
  }

  /**
   * Check if hex signature matches file header
   */
  matchesHexSignature(fileHeader, hexSignature) {
    if (!fileHeader) return false;
    
    const cleanHex = hexSignature.replace(/\s+/g, '').toUpperCase();
    const cleanHeader = fileHeader.replace(/\s+/g, '').toUpperCase();
    
    return cleanHeader.includes(cleanHex);
  }

  /**
   * Check if string pattern matches file content
   */
  matchesStringPattern(fileContent, stringPattern) {
    if (!fileContent) return false;

    // Handle regex patterns
    if (stringPattern.startsWith('/') && stringPattern.endsWith('/')) {
      try {
        const regexStr = stringPattern.slice(1, -1);
        const regex = new RegExp(regexStr, 'i');
        return regex.test(fileContent);
      } catch (error) {
        console.error('Invalid regex pattern:', stringPattern);
        return false;
      }
    }

    // Simple string search (case-insensitive)
    return fileContent.toLowerCase().includes(stringPattern.toLowerCase());
  }

  /**
   * Calculate confidence score for a match
   */
  calculateConfidence(totalMatches, rule) {
    const baseConfidence = Math.min(totalMatches * 25, 100);
    
    // Adjust based on severity
    const severityMultiplier = {
      'low': 0.7,
      'medium': 0.85,
      'high': 1.0,
      'critical': 1.2
    };

    const multiplier = severityMultiplier[rule.severity] || 1.0;
    return Math.min(Math.round(baseConfidence * multiplier), 100);
  }

  /**
   * Read file header bytes
   */
  async readFileHeader(filePath, numBytes = 512) {
    try {
      const base64Content = await FileSystem.readAsStringAsync(filePath, {
        encoding: FileSystem.EncodingType.Base64
      });

      const binaryString = atob(base64Content);
      const headerBytes = [];
      
      for (let i = 0; i < Math.min(numBytes, binaryString.length); i++) {
        headerBytes.push(binaryString.charCodeAt(i).toString(16).padStart(2, '0'));
      }

      return headerBytes.join(' ').toUpperCase();
    } catch (error) {
      console.error('Error reading file header:', error);
      return '';
    }
  }

  /**
   * Read file content for pattern matching
   */
  async readFileContent(filePath, maxBytes = 1024 * 1024) {
    try {
      // For pattern matching, we need the actual text content
      // First try to read as UTF-8 text
      try {
        const textContent = await FileSystem.readAsStringAsync(filePath, {
          encoding: FileSystem.EncodingType.UTF8
        });
        
        // Limit content size for performance
        return textContent.substring(0, maxBytes);
      } catch (textError) {
        // If UTF-8 fails, read as base64 and convert
        const base64Content = await FileSystem.readAsStringAsync(filePath, {
          encoding: FileSystem.EncodingType.Base64
        });
        
        const binaryString = atob(base64Content);
        return binaryString.substring(0, maxBytes);
      }
    } catch (error) {
      console.error('Error reading file content:', error);
      return '';
    }
  }

  /**
   * Batch scan multiple files
   */
  async batchScanFiles(files, options = {}) {
    const {
      maxConcurrent = 3,
      onProgress = () => {},
      onFileComplete = () => {}
    } = options;

    try {
      console.log(`🔍 YARA batch scanning ${files.length} files...`);

      const results = [];
      let processed = 0;

      // Process files in batches
      for (let i = 0; i < files.length; i += maxConcurrent) {
        const batch = files.slice(i, i + maxConcurrent);
        
        const batchPromises = batch.map(async (file) => {
          const scanResult = await this.scanFile(file.filePath, file, options);
          
          const result = {
            ...file,
            yaraResult: scanResult,
            processedAt: Date.now()
          };

          onFileComplete(result);
          return result;
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        processed += batchResults.length;

        onProgress({
          processed,
          total: files.length,
          currentBatch: Math.floor(i / maxConcurrent) + 1,
          totalBatches: Math.ceil(files.length / maxConcurrent)
        });
      }

      const threatsFound = results.filter(r => r.yaraResult.matches.length > 0).length;
      console.log(`✅ YARA batch scan completed: ${threatsFound} threats found in ${processed} files`);

      return {
        results,
        summary: {
          totalFiles: files.length,
          threatsFound,
          cleanFiles: files.length - threatsFound
        }
      };

    } catch (error) {
      console.error('❌ YARA batch scan failed:', error);
      throw error;
    }
  }

  /**
   * Get service statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      isInitialized: this.isInitialized,
      rulesBreakdown: this.getRulesBreakdown()
    };
  }

  /**
   * Get breakdown of rules by category and severity
   */
  getRulesBreakdown() {
    const breakdown = {
      byCategory: {},
      bySeverity: {},
      active: 0,
      inactive: 0
    };

    for (const rule of this.rules.values()) {
      // By category
      breakdown.byCategory[rule.category] = (breakdown.byCategory[rule.category] || 0) + 1;
      
      // By severity
      breakdown.bySeverity[rule.severity] = (breakdown.bySeverity[rule.severity] || 0) + 1;
      
      // Active/inactive
      if (rule.isActive) {
        breakdown.active++;
      } else {
        breakdown.inactive++;
      }
    }

    return breakdown;
  }

  /**
   * Update rule status
   */
  updateRule(ruleName, updates) {
    const rule = this.rules.get(ruleName);
    if (rule) {
      Object.assign(rule, updates);
      this.stats.activeRules = Array.from(this.rules.values()).filter(r => r.isActive).length;
      return true;
    }
    return false;
  }

  /**
   * Save custom rules to storage
   */
  async saveCustomRules() {
    try {
      const customRules = Array.from(this.rules.values()).filter(rule => rule.isCustom);
      await AsyncStorage.setItem('yara_custom_rules', JSON.stringify(customRules));
      console.log(`💾 Saved ${customRules.length} custom YARA rules`);
    } catch (error) {
      console.error('Error saving custom rules:', error);
    }
  }
}

export default new YARASignatureService();
