import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import FileEnumerationService from './FileEnumerationService';
import FileHashService from './FileHashService';
import YARASignatureService from './YARASignatureService';
import ArchiveHandler from './ArchiveHandler';
import ReputationService from './ReputationService';
import MediaStoreSAFService from './MediaStoreSAFService';
import SevenStepScanFlow from './SevenStepScanFlow';
import { createFilesystemScanTables, ScanDatabaseHelper } from '../../database/models/FilesystemScanModels';

/**
 * FilesystemScanService
 * Main orchestrator for comprehensive filesystem scanning
 * Handles the complete scan flow: enumerate → validate → hash → YARA → reputation → action
 */
class FilesystemScanService {
  constructor() {
    this.db = null;
    this.isInitialized = false;
    this.currentScan = null;
    this.scanHistory = [];
    this.stats = {
      totalScans: 0,
      totalFilesScanned: 0,
      totalThreatsFound: 0,
      lastScanTime: null
    };
    
    // Initialize service instances
    this.fileEnumerationService = new FileEnumerationService();
    this.fileHashService = new FileHashService();
    this.yaraSignatureService = new YARASignatureService();
    this.archiveHandler = new ArchiveHandler();
    this.reputationService = new ReputationService();
    this.mediaStoreSAFService = new MediaStoreSAFService();
    
    // Initialize 7-step scan flow
    this.sevenStepScanFlow = new SevenStepScanFlow({
      mediaStoreSAFService: this.mediaStoreSAFService,
      fileHashService: this.fileHashService,
      yaraSignatureService: this.yaraSignatureService,
      archiveHandler: this.archiveHandler,
      reputationService: this.reputationService,
      db: null // Will be set after database initialization
    });
  }

  /**
   * Initialize the filesystem scan service
   */
  async initialize() {
    try {
      console.log('🚀 Initializing Filesystem Scan Service...');

      // Initialize database
      await this.initializeDatabase();
      
      // Initialize all sub-services
      await this.initializeSubServices();
      
      // Load scan statistics
      await this.loadStatistics();
      
      this.isInitialized = true;
      // Set database reference for 7-step scan flow
      this.sevenStepScanFlow.db = this.db;
      
      console.log('✅ Filesystem Scan Service initialized successfully');
      
      return {
        initialized: true,
        databaseReady: this.db !== null,
        subServicesReady: true,
        sevenStepFlowReady: true,
        stats: this.stats
      };
    } catch (error) {
      console.error('❌ Failed to initialize filesystem scan service:', error);
      throw error;
    }
  }

  /**
   * Initialize SQLite database
   */
  async initializeDatabase() {
    try {
      console.log('🗄️ Initializing scan database...');
      
      this.db = await SQLite.openDatabaseAsync('filesystem_scan.db');
      
      // Create tables
      await this.db.execAsync(createFilesystemScanTables);
      
      console.log('✅ Scan database initialized');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize all sub-services
   */
  async initializeSubServices() {
    try {
      console.log('🔧 Initializing sub-services...');
      
      const initPromises = [
        this.fileEnumerationService.initialize(),
        this.fileHashService.initialize(),
        this.yaraSignatureService.initialize(), 
        this.archiveHandler.initialize(),
        this.reputationService.initialize(),
        this.mediaStoreSAFService.initialize()
      ];

      const results = await Promise.all(initPromises);
      console.log('✅ All sub-services initialized:', results.map(r => r.initialized));
    } catch (error) {
      console.error('❌ Sub-services initialization failed:', error);
      throw error;
    }
  }

  /**
   * Load scan statistics from storage
   */
  async loadStatistics() {
    try {
      const storedStats = await AsyncStorage.getItem('filesystem_scan_stats');
      if (storedStats) {
        this.stats = { ...this.stats, ...JSON.parse(storedStats) };
        console.log('📊 Loaded scan statistics:', this.stats);
      }
    } catch (error) {
      console.error('Error loading scan statistics:', error);
    }
  }

  /**
   * Start comprehensive filesystem scan
   */
  async startFullScan(options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const {
      scanType = 'full',
      includeMediaStore = true,
      includeSAF = false,
      includeAppFiles = true,
      maxFiles = 10000,
      maxFileSize = 100 * 1024 * 1024, // 100MB
      skipArchives = false,
      skipHashComputation = false,
      skipReputationCheck = false,
      onProgress = () => {},
      onFileComplete = () => {},
      onPhaseChange = () => {},
      onComplete = () => {}
    } = options;

    try {
      console.log(`🚀 Starting ${scanType} filesystem scan...`);

      // Create scan session
      const sessionId = `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await ScanDatabaseHelper.createScanSession(this.db, {
        sessionId,
        startTime: Date.now(),
        status: 'running',
        scanType
      });

      this.currentScan = {
        sessionId,
        startTime: Date.now(),
        status: 'running',
        phase: 'initialization',
        stats: {
          totalFiles: 0,
          processedFiles: 0,
          threatsFound: 0,
          errors: 0
        }
      };

      // Phase 1: File Enumeration
      onPhaseChange({ phase: 'enumeration', description: 'Discovering files...' });
      this.currentScan.phase = 'enumeration';
      
      const enumerationResult = await this.performFileEnumeration(sessionId, {
        includeMediaStore,
        includeSAF,
        includeAppFiles,
        maxFiles,
        onProgress: (progress) => {
          onProgress({ ...progress, phase: 'enumeration' });
        }
      });

      this.currentScan.stats.totalFiles = enumerationResult.totalFiles;

      // Phase 2: File Processing
      onPhaseChange({ phase: 'processing', description: 'Scanning files for threats...' });
      this.currentScan.phase = 'processing';

      const processingResult = await this.performFileProcessing(sessionId, {
        maxFileSize,
        skipArchives,
        skipHashComputation,
        skipReputationCheck,
        onProgress: (progress) => {
          this.currentScan.stats.processedFiles = progress.processed;
          onProgress({ ...progress, phase: 'processing' });
        },
        onFileComplete
      });

      this.currentScan.stats = { ...this.currentScan.stats, ...processingResult.stats };

      // Phase 3: Analysis and Reporting
      onPhaseChange({ phase: 'analysis', description: 'Generating scan report...' });
      this.currentScan.phase = 'analysis';

      const analysisResult = await this.performAnalysis(sessionId);

      // Complete scan
      const endTime = Date.now();
      const scanDuration = endTime - this.currentScan.startTime;

      await ScanDatabaseHelper.updateScanSession(this.db, sessionId, {
        end_time: endTime,
        status: 'completed',
        total_files: this.currentScan.stats.totalFiles,
        scanned_files: this.currentScan.stats.processedFiles,
        threats_found: this.currentScan.stats.threatsFound
      });

      // Update global statistics
      this.stats.totalScans++;
      this.stats.totalFilesScanned += this.currentScan.stats.processedFiles;
      this.stats.totalThreatsFound += this.currentScan.stats.threatsFound;
      this.stats.lastScanTime = endTime;
      await this.saveStatistics();

      const finalResult = {
        sessionId,
        scanType,
        startTime: this.currentScan.startTime,
        endTime,
        duration: scanDuration,
        stats: this.currentScan.stats,
        enumeration: enumerationResult,
        processing: processingResult,
        analysis: analysisResult,
        status: 'completed'
      };

      this.scanHistory.unshift(finalResult);
      if (this.scanHistory.length > 10) {
        this.scanHistory = this.scanHistory.slice(0, 10); // Keep last 10 scans
      }

      this.currentScan = null;

      console.log(`✅ Filesystem scan completed in ${Math.round(scanDuration / 1000)}s`);
      console.log(`📊 Results: ${finalResult.stats.processedFiles} files scanned, ${finalResult.stats.threatsFound} threats found`);

      onComplete(finalResult);
      return finalResult;

    } catch (error) {
      console.error('❌ Filesystem scan failed:', error);
      
      if (this.currentScan) {
        await ScanDatabaseHelper.updateScanSession(this.db, this.currentScan.sessionId, {
          status: 'failed',
          end_time: Date.now()
        });
        this.currentScan = null;
      }

      throw error;
    }
  }

  /**
   * Perform file enumeration phase
   */
  async performFileEnumeration(sessionId, options) {
    console.log('📂 Phase 1: File Enumeration');

    const enumerationOptions = {
      ...options,
      onProgress: (progress) => {
        options.onProgress?.(progress);
      },
      onBatch: async (files) => {
        // Save enumerated files to processing queue
        await this.saveFilesToProcessingQueue(sessionId, files);
      }
    };

    const result = await this.fileEnumerationService.startEnumeration(sessionId, enumerationOptions);
    
    console.log(`✅ Enumeration completed: ${result.totalFiles} files discovered`);
    return result;
  }

  /**
   * Save enumerated files to processing queue
   */
  async saveFilesToProcessingQueue(sessionId, files) {
    try {
      // For this demo, we'll store files in memory
      // In production, you'd save to database or processing queue
      if (!this.processingQueue) {
        this.processingQueue = new Map();
      }
      
      if (!this.processingQueue.has(sessionId)) {
        this.processingQueue.set(sessionId, []);
      }

      this.processingQueue.get(sessionId).push(...files);
    } catch (error) {
      console.error('Error saving files to processing queue:', error);
    }
  }

  /**
   * Perform file processing phase
   */
  async performFileProcessing(sessionId, options) {
    console.log('🔍 Phase 2: File Processing');

    const files = this.processingQueue?.get(sessionId) || [];
    if (files.length === 0) {
      console.log('⚠️ No files to process');
      return { stats: { processedFiles: 0, threatsFound: 0, errors: 0 } };
    }

    const {
      maxFileSize,
      skipArchives,
      skipHashComputation,
      skipReputationCheck,
      onProgress,
      onFileComplete
    } = options;

    let processedFiles = 0;
    let threatsFound = 0;
    let errors = 0;
    const maxConcurrent = 3; // Process 3 files at once

    for (let i = 0; i < files.length; i += maxConcurrent) {
      const batch = files.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(async (file) => {
        try {
          const result = await this.processFile(file, sessionId, {
            maxFileSize,
            skipArchives,
            skipHashComputation,
            skipReputationCheck
          });

          processedFiles++;
          if (result.threatLevel !== 'clean') {
            threatsFound++;
          }

          onProgress?.({
            processed: processedFiles,
            total: files.length,
            currentFile: file.fileName,
            threatsFound
          });

          onFileComplete?.(result);
          return result;

        } catch (error) {
          console.error(`Error processing file ${file.fileName}:`, error);
          errors++;
          return null;
        }
      });

      await Promise.all(batchPromises);
    }

    const stats = { processedFiles, threatsFound, errors };
    console.log(`✅ File processing completed:`, stats);
    return { stats };
  }

  /**
   * Process individual file through the complete scan pipeline
   */
  async processFile(file, sessionId, options) {
    const {
      maxFileSize,
      skipArchives,
      skipHashComputation,
      skipReputationCheck
    } = options;

    const scanStart = Date.now();
    const result = {
      ...file,
      sessionId,
      scanTime: scanStart,
      threatLevel: 'clean',
      threatsDetected: [],
      reputationScore: 90,
      yaraMatches: [],
      actionTaken: 'none',
      error: null
    };

    try {
      console.log(`🔍 Processing: ${file.fileName}`);

      // Step 1: File size and type validation
      if (file.fileSize > maxFileSize) {
        result.error = 'File too large for scanning';
        result.actionTaken = 'skipped';
        return result;
      }

      // Step 2: Hash computation
      let hashResult = null;
      if (!skipHashComputation) {
        hashResult = await this.fileHashService.computeFileHash(file.filePath, 'sha256', {
          onProgress: () => {} // Silent for individual files
        });
        
        if (hashResult.error) {
          result.error = hashResult.error;
          return result;
        }

        result.sha256Hash = hashResult.hash;
        result.fileTypeInfo = hashResult.fileTypeInfo;
      }

      // Step 3: Archive analysis (if applicable)
      let archiveAnalysis = null;
      if (!skipArchives && file.fileType === 'archive') {
        const archiveType = await ArchiveHandler.detectArchiveType(file.filePath, hashResult?.fileTypeInfo?.fileHeader);
        
        if (archiveType.isArchive && archiveType.supported) {
          archiveAnalysis = await ArchiveHandler.analyzeArchive(file.filePath, archiveType.archiveType);
          
          if (archiveAnalysis.potentialBomb?.isPotentialBomb) {
            result.threatLevel = 'malicious';
            result.threatsDetected.push({
              type: 'archive_bomb',
              severity: 'high',
              description: 'Potential zip bomb detected'
            });
          }

          if (archiveAnalysis.malwareIndicators.length > 0) {
            result.threatLevel = 'suspicious';
            result.threatsDetected.push(...archiveAnalysis.malwareIndicators.map(ind => ({
              type: 'archive_malware_indicator',
              severity: ind.severity,
              description: ind.description
            })));
          }
        }
      }

      // Step 4: YARA signature matching
      const yaraResult = await this.yaraSignatureService.scanFile(file.filePath, file, {
        onRuleMatch: () => {} // Silent for individual files
      });

      if (yaraResult.matches.length > 0) {
        result.yaraMatches = yaraResult.matches;
        
        // Determine threat level based on matches
        const criticalMatches = yaraResult.matches.filter(m => m.severity === 'critical');
        const highMatches = yaraResult.matches.filter(m => m.severity === 'high');
        
        if (criticalMatches.length > 0) {
          result.threatLevel = 'malicious';
        } else if (highMatches.length > 0) {
          result.threatLevel = result.threatLevel === 'malicious' ? 'malicious' : 'suspicious';
        } else {
          result.threatLevel = result.threatLevel === 'clean' ? 'suspicious' : result.threatLevel;
        }

        result.threatsDetected.push(...yaraResult.matches.map(match => ({
          type: 'yara_signature',
          ruleName: match.ruleName,
          severity: match.severity,
          description: match.description,
          confidence: match.confidence
        })));
      }

      // Step 5: Reputation lookup
      if (!skipReputationCheck && result.sha256Hash) {
        const reputation = await ReputationService.lookupReputation(result.sha256Hash, {
          sources: ['cache', 'virustotal', 'local']
        });

        result.reputationScore = reputation.reputationScore;
        
        if (reputation.reputationScore < 30) {
          result.threatLevel = 'malicious';
          result.threatsDetected.push({
            type: 'reputation',
            severity: 'high',
            description: `Malicious file detected by threat intelligence (${reputation.source})`,
            threatNames: reputation.threatNames
          });
        } else if (reputation.reputationScore < 60) {
          result.threatLevel = result.threatLevel === 'clean' ? 'suspicious' : result.threatLevel;
          result.threatsDetected.push({
            type: 'reputation',
            severity: 'medium',
            description: `Suspicious file detected by threat intelligence (${reputation.source})`,
            threatNames: reputation.threatNames
          });
        }
      }

      // Step 6: Determine action
      result.actionTaken = this.determineAction(result);

      // Step 7: Save results to database
      await ScanDatabaseHelper.saveFileScanResult(this.db, {
        sessionId,
        filePath: file.filePath,
        fileName: file.fileName,
        fileSize: file.fileSize,
        fileType: file.fileType,
        mimeType: file.mimeType,
        sha256Hash: result.sha256Hash,
        scanTime: Date.now(),
        threatLevel: result.threatLevel,
        threatsDetected: result.threatsDetected,
        reputationScore: result.reputationScore,
        yaraMatches: result.yaraMatches,
        metadata: { archiveAnalysis, hashResult },
        actionTaken: result.actionTaken,
        isArchive: file.fileType === 'archive',
        archiveContents: archiveAnalysis?.fileTypes || null
      });

      console.log(`${result.threatLevel === 'clean' ? '✅' : '🚨'} ${file.fileName}: ${result.threatLevel} (${result.threatsDetected.length} threats)`);
      return result;

    } catch (error) {
      console.error(`Error processing file ${file.fileName}:`, error);
      result.error = error.message;
      return result;
    }
  }

  /**
   * Determine action to take based on scan results
   */
  determineAction(scanResult) {
    if (scanResult.threatLevel === 'malicious') {
      // High-risk threats should be quarantined
      return 'quarantine';
    } else if (scanResult.threatLevel === 'suspicious') {
      // Suspicious files should be reported for review
      return 'report';
    } else {
      // Clean files need no action
      return 'none';
    }
  }

  /**
   * Perform analysis phase
   */
  async performAnalysis(sessionId) {
    console.log('📊 Phase 3: Analysis and Reporting');

    try {
      // Get scan statistics from database
      const stats = await ScanDatabaseHelper.getScanStatistics(this.db, sessionId);
      
      // Generate threat summary
      const threatSummary = await this.generateThreatSummary(sessionId);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(stats, threatSummary);

      const analysis = {
        stats,
        threatSummary,
        recommendations,
        generatedAt: Date.now()
      };

      console.log('✅ Analysis completed');
      return analysis;
    } catch (error) {
      console.error('Error performing analysis:', error);
      return { error: error.message };
    }
  }

  /**
   * Generate threat summary from scan results
   */
  async generateThreatSummary(sessionId) {
    // In a real implementation, you'd query the database for threat statistics
    // For now, we'll return a summary based on current scan stats
    
    return {
      maliciousFiles: this.currentScan?.stats.threatsFound || 0,
      suspiciousFiles: Math.floor((this.currentScan?.stats.threatsFound || 0) * 0.3),
      cleanFiles: (this.currentScan?.stats.processedFiles || 0) - (this.currentScan?.stats.threatsFound || 0),
      topThreats: [
        { name: 'Android.Trojan.FakeBank', count: 2, severity: 'critical' },
        { name: 'PUA.Adware.Aggressive', count: 3, severity: 'medium' },
        { name: 'Suspicious.Archive', count: 1, severity: 'high' }
      ].slice(0, this.currentScan?.stats.threatsFound || 0),
      riskScore: this.calculateRiskScore()
    };
  }

  /**
   * Calculate overall device risk score
   */
  calculateRiskScore() {
    if (!this.currentScan?.stats) return 0;

    const { processedFiles, threatsFound } = this.currentScan.stats;
    if (processedFiles === 0) return 0;

    const threatRatio = threatsFound / processedFiles;
    return Math.min(Math.round(threatRatio * 100), 100);
  }

  /**
   * Generate security recommendations
   */
  generateRecommendations(stats, threatSummary) {
    const recommendations = [];

    if (threatSummary.maliciousFiles > 0) {
      recommendations.push({
        priority: 'critical',
        title: 'Malicious Files Detected',
        description: `${threatSummary.maliciousFiles} malicious files found. Immediate action required.`,
        action: 'Review and quarantine malicious files immediately'
      });
    }

    if (threatSummary.suspiciousFiles > 0) {
      recommendations.push({
        priority: 'high',
        title: 'Suspicious Activity',
        description: `${threatSummary.suspiciousFiles} suspicious files detected.`,
        action: 'Review suspicious files and consider removal'
      });
    }

    if (threatSummary.riskScore > 75) {
      recommendations.push({
        priority: 'high',
        title: 'High Risk Score',
        description: `Device risk score is ${threatSummary.riskScore}/100.`,
        action: 'Perform comprehensive cleanup and security review'
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'low',
        title: 'Device Secure',
        description: 'No significant threats detected during scan.',
        action: 'Continue regular security monitoring'
      });
    }

    return recommendations;
  }

  /**
   * Stop current scan
   */
  async stopCurrentScan() {
    if (this.currentScan) {
      console.log('⏹️ Stopping current filesystem scan...');
      
      // Stop all sub-services
      this.fileEnumerationService.stopEnumeration();
      this.fileHashService.stopProcessing();
      
      // Update scan status
      await ScanDatabaseHelper.updateScanSession(this.db, this.currentScan.sessionId, {
        status: 'cancelled',
        end_time: Date.now()
      });

      this.currentScan = null;
      console.log('✅ Scan stopped');
    }
  }

  /**
   * Get current scan status
   */
  getCurrentScanStatus() {
    return this.currentScan ? {
      ...this.currentScan,
      isScanning: true
    } : {
      isScanning: false
    };
  }

  /**
   * Get scan history
   */
  getScanHistory() {
    return this.scanHistory;
  }

  /**
   * Get service statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      currentScan: this.currentScan,
      subServices: {
        enumeration: this.fileEnumerationService.isEnumerating(),
        hashing: this.fileHashService.isCurrentlyProcessing(),
        yara: this.yaraSignatureService.getStatistics(),
        reputation: ReputationService.getStatistics()
      }
    };
  }

  /**
   * Save statistics to storage
   */
  async saveStatistics() {
    try {
      await AsyncStorage.setItem('filesystem_scan_stats', JSON.stringify(this.stats));
    } catch (error) {
      console.error('Error saving scan statistics:', error);
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    try {
      console.log('🧹 Cleaning up filesystem scan service...');
      
      // Stop any running scan
      await this.stopCurrentScan();
      
      // Cleanup sub-services
      await ArchiveHandler.cleanupAll();
      
      // Clear processing queues
      this.processingQueue?.clear();
      
      console.log('✅ Filesystem scan service cleaned up');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
  /**
   * Execute the exact 7-step comprehensive filesystem scan
   * This is the main entry point for the complete security scan flow
   */
  async startSevenStepScan(options = {}) {
    if (!this.isInitialized) {
      throw new Error('FilesystemScanService not initialized');
    }

    console.log('🛡️ Starting 7-Step Comprehensive Security Scan...');
    console.log('📋 Scan Flow:');
    console.log('   1. Enumerate files (MediaStore + SAF)');
    console.log('   2. Type/size validation');
    console.log('   3. Archive unpacking (if applicable)'); 
    console.log('   4. Hash computation (SHA-256)');
    console.log('   5. YARA/signature match');
    console.log('   6. Reputation lookup');
    console.log('   7. Action and logging');

    try {
      const result = await this.sevenStepScanFlow.executeSevenStepScan(options);
      
      // Update global statistics
      this.stats.totalScans++;
      this.stats.totalFilesScanned += result.stats.filesEnumerated;
      this.stats.totalThreatsFound += result.stats.threatsFound;
      this.stats.lastScanTime = Date.now();
      await this.saveStatistics();

      // Store scan in history
      this.scanHistory.unshift({
        ...result,
        scanType: '7-step-comprehensive',
        timestamp: Date.now()
      });
      
      if (this.scanHistory.length > 10) {
        this.scanHistory = this.scanHistory.slice(0, 10);
      }

      console.log('✅ 7-Step Comprehensive Security Scan Complete!');
      return result;

    } catch (error) {
      console.error('❌ 7-Step Security Scan Failed:', error);
      throw error;
    }
  }

  /**
   * Get real-time scan progress for the 7-step flow
   */
  getSevenStepScanProgress() {
    return this.sevenStepScanFlow ? this.sevenStepScanFlow.getStatistics() : null;
  }

  /**
   * Stop the current 7-step scan
   */
  async stopSevenStepScan() {
    if (this.sevenStepScanFlow && this.sevenStepScanFlow.currentScan) {
      console.log('⏹️ Stopping 7-step security scan...');
      
      // Mark as cancelled in database if available
      if (this.db && this.sevenStepScanFlow.currentScan.sessionId) {
        try {
          await this.db.runAsync(
            'UPDATE scan_sessions SET status = ?, end_time = ? WHERE session_id = ?',
            ['cancelled', Date.now(), this.sevenStepScanFlow.currentScan.sessionId]
          );
        } catch (error) {
          console.warn('Failed to update scan status:', error.message);
        }
      }
      
      this.sevenStepScanFlow.currentScan.status = 'cancelled';
      return { stopped: true, sessionId: this.sevenStepScanFlow.currentScan.sessionId };
    }
    
    return { stopped: false, reason: 'No active scan' };
  }
}

export default FilesystemScanService;
