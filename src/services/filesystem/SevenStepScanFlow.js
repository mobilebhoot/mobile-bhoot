/**
 * SevenStepScanFlow
 * Implements the exact 7-step security scan flow:
 * 1. Enumerate files (MediaStore + SAF)
 * 2. Type/size validation
 * 3. Archive unpacking (if applicable)
 * 4. Hash computation (SHA-256)
 * 5. YARA/signature match
 * 6. Reputation lookup
 * 7. Action and logging
 */

export default class SevenStepScanFlow {
  constructor(services) {
    this.mediaStoreSAFService = services.mediaStoreSAFService;
    this.fileHashService = services.fileHashService;
    this.yaraSignatureService = services.yaraSignatureService;
    this.archiveHandler = services.archiveHandler;
    this.reputationService = services.reputationService;
    this.db = services.db;
    
    this.currentScan = null;
  }

  /**
   * Execute the complete 7-step scan flow
   */
  async executeSevenStepScan(options = {}) {
    const sessionId = `7step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    console.log(`🔍 Starting 7-Step Security Scan: ${sessionId}`);
    
    try {
      this.currentScan = {
        sessionId,
        startTime,
        status: 'running',
        currentStep: 1,
        stats: {
          // Step counters
          filesEnumerated: 0,
          filesValidated: 0,
          archivesUnpacked: 0,
          hashesComputed: 0,
          yaraMatches: 0,
          reputationChecks: 0,
          actionsLogged: 0,
          // Security findings
          threatsFound: 0,
          suspiciousFiles: 0,
          cleanFiles: 0,
          // Performance
          totalProcessingTime: 0
        }
      };

      const onProgress = options.onProgress || (() => {});

      // 🔍 STEP 1: ENUMERATE FILES
      console.log('📋 STEP 1/7: Enumerate files via MediaStore and SAF');
      onProgress({
        step: 1,
        stage: 'enumerate',
        progress: 0,
        message: 'Scans all accessible files via MediaStore and SAF',
        details: 'Incremental resume via Room DB cursor checkpoints'
      });

      const enumerationResult = await this.mediaStoreSAFService.enumerateAllAccessibleFiles({
        mediaStoreLimit: options.mediaStoreLimit || 3000,
        requestSAF: options.requestSAF !== false,
        onProgress: (enumProgress) => {
          onProgress({
            step: 1,
            stage: 'enumerate',
            progress: Math.min(14, enumProgress.progress * 0.14),
            message: `${enumProgress.stage}: ${enumProgress.message}`,
            details: enumProgress.details || 'Scanning files...'
          });
        }
      });

      this.currentScan.stats.filesEnumerated = enumerationResult.files.length;
      console.log(`✅ Step 1 Complete: ${enumerationResult.files.length} files enumerated`);

      // Process each file through steps 2-7
      await this.processFilesThroughPipeline(enumerationResult.files, onProgress);

      // Complete scan
      this.currentScan.status = 'completed';
      this.currentScan.endTime = Date.now();
      this.currentScan.stats.totalProcessingTime = this.currentScan.endTime - this.currentScan.startTime;

      console.log('✅ 7-Step Security Scan Complete');
      console.log('📊 Final Statistics:', this.currentScan.stats);

      onProgress({
        step: 7,
        stage: 'complete',
        progress: 100,
        message: 'Security scan completed successfully',
        details: `Processed ${this.currentScan.stats.filesEnumerated} files`
      });

      return {
        sessionId,
        success: true,
        stats: this.currentScan.stats,
        duration: this.currentScan.endTime - this.currentScan.startTime,
        scanFlow: '7-step-comprehensive'
      };

    } catch (error) {
      console.error('❌ 7-Step Security Scan Failed:', error);
      
      if (this.currentScan) {
        this.currentScan.status = 'failed';
        this.currentScan.error = error.message;
      }

      throw error;
    }
  }

  /**
   * Process files through the 7-step security pipeline
   */
  async processFilesThroughPipeline(files, onProgress) {
    const totalFiles = files.length;
    let processedFiles = 0;

    console.log(`🔄 Processing ${totalFiles} files through 7-step pipeline...`);

    for (const file of files) {
      try {
        const fileProgress = processedFiles / totalFiles;
        
        // 📏 STEP 2: TYPE/SIZE VALIDATION
        onProgress({
          step: 2,
          stage: 'validate',
          progress: 15 + (fileProgress * 10),
          message: 'Type/size validation',
          details: file.filename
        });

        const validation = await this.validateFileTypeAndSize(file);
        if (!validation.valid) {
          console.log(`⏭️ Skipping ${file.filename}: ${validation.reason}`);
          processedFiles++;
          continue;
        }
        this.currentScan.stats.filesValidated++;

        // 📦 STEP 3: ARCHIVE UNPACKING (if applicable)
        let filesToAnalyze = [file];
        if (this.isArchiveFile(file.filename)) {
          onProgress({
            step: 3,
            stage: 'unpack',
            progress: 25 + (fileProgress * 15),
            message: 'Archive unpacking (if applicable)',
            details: file.filename
          });

          try {
            const unpackResult = await this.archiveHandler.unpackAndAnalyze(file.filePath, file);
            if (unpackResult.success && unpackResult.extractedFiles) {
              filesToAnalyze = [...filesToAnalyze, ...unpackResult.extractedFiles];
              this.currentScan.stats.archivesUnpacked++;
              console.log(`📦 Unpacked ${file.filename}: ${unpackResult.extractedFiles.length} files`);
            }
          } catch (error) {
            console.warn(`Archive unpacking failed for ${file.filename}:`, error.message);
          }
        }

        // Process each file (original + extracted)
        for (const analyzeFile of filesToAnalyze) {
          await this.analyzeIndividualFile(analyzeFile, fileProgress, onProgress);
        }

        processedFiles++;

      } catch (error) {
        console.error(`Error processing file ${file.filename}:`, error.message);
        processedFiles++;
      }
    }
  }

  /**
   * Analyze individual file through steps 4-7
   */
  async analyzeIndividualFile(file, overallProgress, onProgress) {
    try {
      // 🔐 STEP 4: HASH COMPUTATION (SHA-256)
      onProgress({
        step: 4,
        stage: 'hash',
        progress: 40 + (overallProgress * 15),
        message: 'Hash computation (SHA-256)',
        details: file.filename
      });

      const hashResult = await this.fileHashService.computeFileHash(
        file.filePath,
        'sha256',
        { onProgress: () => {} }
      );

      if (hashResult && !hashResult.error) {
        file.sha256Hash = hashResult;
        this.currentScan.stats.hashesComputed++;
      }

      // 🔍 STEP 5: YARA/SIGNATURE MATCH
      onProgress({
        step: 5,
        stage: 'yara',
        progress: 55 + (overallProgress * 15),
        message: 'YARA/signature match',
        details: file.filename
      });

      const yaraResult = await this.yaraSignatureService.scanFile(
        file.filePath,
        file,
        { onRuleMatch: () => {} }
      );

      if (yaraResult.matches && yaraResult.matches.length > 0) {
        file.yaraMatches = yaraResult.matches;
        this.currentScan.stats.yaraMatches += yaraResult.matches.length;
        this.currentScan.stats.threatsFound++;
        console.log(`🚨 YARA matches found in ${file.filename}: ${yaraResult.matches.length}`);
      }

      // 🌐 STEP 6: REPUTATION LOOKUP
      onProgress({
        step: 6,
        stage: 'reputation',
        progress: 70 + (overallProgress * 15),
        message: 'Reputation lookup',
        details: file.filename
      });

      if (file.sha256Hash) {
        try {
          const reputationResult = await this.reputationService.checkFileReputation(
            file.sha256Hash,
            file
          );

          if (reputationResult) {
            file.reputation = reputationResult;
            this.currentScan.stats.reputationChecks++;

            if (reputationResult.isMalicious) {
              this.currentScan.stats.threatsFound++;
              console.log(`🚨 Malicious file detected: ${file.filename}`);
            } else if (reputationResult.isSuspicious) {
              this.currentScan.stats.suspiciousFiles++;
              console.log(`⚠️ Suspicious file: ${file.filename}`);
            } else {
              this.currentScan.stats.cleanFiles++;
            }
          }
        } catch (error) {
          console.warn(`Reputation lookup failed for ${file.filename}:`, error.message);
        }
      }

      // 📝 STEP 7: ACTION AND LOGGING
      onProgress({
        step: 7,
        stage: 'action',
        progress: 85 + (overallProgress * 14),
        message: 'Action and logging',
        details: file.filename
      });

      await this.performActionAndLogging(file);
      this.currentScan.stats.actionsLogged++;

    } catch (error) {
      console.error(`Failed to analyze file ${file.filename}:`, error.message);
    }
  }

  /**
   * STEP 2: Validate file type and size for processing
   */
  async validateFileTypeAndSize(file) {
    const maxFileSize = 100 * 1024 * 1024; // 100MB
    const minFileSize = 1; // At least 1 byte

    // Size validation
    if (file.size > maxFileSize) {
      return { valid: false, reason: `File too large: ${Math.round(file.size / 1024 / 1024)}MB` };
    }

    if (file.size < minFileSize) {
      return { valid: false, reason: 'Empty file' };
    }

    // Type validation - skip system files
    const filename = file.filename || '';
    const skipPatterns = ['.tmp', '.temp', '.log', '.cache', '.lock'];
    
    for (const pattern of skipPatterns) {
      if (filename.includes(pattern)) {
        return { valid: false, reason: `System/temporary file: ${pattern}` };
      }
    }

    return { valid: true, reason: 'File passed validation' };
  }

  /**
   * Check if file is an archive that should be unpacked
   */
  isArchiveFile(filename) {
    const ext = (filename || '').split('.').pop()?.toLowerCase() || '';
    const archiveExtensions = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'apk', 'jar'];
    return archiveExtensions.includes(ext);
  }

  /**
   * STEP 7: Perform security actions and logging
   */
  async performActionAndLogging(file) {
    try {
      const threat = this.assessFileThreat(file);
      
      const logEntry = {
        sessionId: this.currentScan.sessionId,
        filePath: file.filePath,
        filename: file.filename,
        fileSize: file.size,
        sha256Hash: file.sha256Hash,
        threatLevel: threat.level,
        threatReasons: threat.reasons,
        yaraMatches: file.yaraMatches || [],
        reputation: file.reputation,
        timestamp: Date.now(),
        action: threat.action,
        source: file.source
      };

      // Log to database (if available)
      if (this.db) {
        try {
          await this.db.runAsync(
            `INSERT INTO scan_results 
             (session_id, file_path, filename, file_size, sha256_hash, threat_level, 
              threat_reasons, yara_matches, reputation, timestamp, action, source) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              logEntry.sessionId,
              logEntry.filePath,
              logEntry.filename,
              logEntry.fileSize,
              logEntry.sha256Hash,
              logEntry.threatLevel,
              JSON.stringify(logEntry.threatReasons),
              JSON.stringify(logEntry.yaraMatches),
              JSON.stringify(logEntry.reputation),
              logEntry.timestamp,
              logEntry.action,
              logEntry.source
            ]
          );
        } catch (dbError) {
          console.warn('Failed to log to database:', dbError.message);
        }
      }

      // Take security action
      switch (threat.action) {
        case 'quarantine':
          console.log(`🚨 QUARANTINE: ${file.filename} - ${threat.reasons.join(', ')}`);
          break;
        case 'alert':
          console.log(`⚠️ ALERT: ${file.filename} - ${threat.reasons.join(', ')}`);
          break;
        case 'monitor':
          console.log(`👁️ MONITOR: ${file.filename} - ${threat.reasons.join(', ')}`);
          break;
        default:
          // Clean file - no action needed
          break;
      }

      return { success: true, action: threat.action, threat };

    } catch (error) {
      console.error('Failed to perform action and logging:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Assess overall threat level of a file
   */
  assessFileThreat(file) {
    const reasons = [];
    let level = 'clean';
    let action = 'none';

    // Check YARA matches (highest priority)
    if (file.yaraMatches && file.yaraMatches.length > 0) {
      reasons.push(`YARA matches: ${file.yaraMatches.length}`);
      level = 'high';
      action = 'quarantine';
    }

    // Check reputation (high priority)
    if (file.reputation) {
      if (file.reputation.isMalicious) {
        reasons.push('Known malicious file');
        level = 'high';
        action = 'quarantine';
      } else if (file.reputation.isSuspicious) {
        reasons.push('Suspicious reputation');
        if (level === 'clean') {
          level = 'medium';
          action = 'alert';
        }
      }
    }

    // Check file characteristics
    const ext = (file.filename || '').split('.').pop()?.toLowerCase() || '';
    
    // Executable files from external sources
    if (['exe', 'scr', 'com', 'pif', 'bat', 'apk'].includes(ext) && file.source === 'saf') {
      reasons.push('Executable from external source');
      if (level === 'clean') {
        level = 'low';
        action = 'monitor';
      }
    }

    // Recently modified executables
    if (['apk', 'dex', 'so', 'exe', 'dll'].includes(ext)) {
      const dayMs = 24 * 60 * 60 * 1000;
      if (file.modificationTime && (Date.now() - file.modificationTime < dayMs)) {
        reasons.push('Recently modified executable');
        if (level === 'clean') {
          level = 'low';
          action = 'monitor';
        }
      }
    }

    return { level, reasons, action };
  }

  /**
   * Get current scan statistics
   */
  getStatistics() {
    return this.currentScan ? {
      ...this.currentScan.stats,
      currentStep: this.currentScan.currentStep,
      status: this.currentScan.status,
      sessionId: this.currentScan.sessionId
    } : null;
  }
}

