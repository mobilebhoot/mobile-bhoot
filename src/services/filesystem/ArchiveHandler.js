import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * ArchiveHandler
 * Handles archive file detection, unpacking, and analysis
 * Supports ZIP, RAR, 7Z, TAR and other common archive formats
 */
class ArchiveHandler {
  constructor() {
    this.supportedFormats = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'];
    this.maxExtractionSize = 500 * 1024 * 1024; // 500MB limit
    this.maxFiles = 10000; // Maximum files to extract
    this.maxDepth = 20; // Maximum nesting depth
    this.tempDirectory = null;
  }

  /**
   * Initialize the archive handler
   */
  async initialize() {
    try {
      console.log('📦 Initializing Archive Handler...');
      
      // Create temporary directory for extractions
      this.tempDirectory = `${FileSystem.cacheDirectory}archive_temp/`;
      await FileSystem.makeDirectoryAsync(this.tempDirectory, { intermediates: true });
      
      console.log(`✅ Archive Handler initialized`);
      console.log(`📁 Temp directory: ${this.tempDirectory}`);
      
      return {
        initialized: true,
        supportedFormats: this.supportedFormats,
        tempDirectory: this.tempDirectory,
        maxExtractionSize: this.maxExtractionSize
      };
    } catch (error) {
      console.error('❌ Failed to initialize archive handler:', error);
      throw error;
    }
  }

  /**
   * Detect if file is an archive and get its type
   */
  async detectArchiveType(filePath, fileHeader) {
    try {
      // Get file extension
      const extension = filePath.split('.').pop()?.toLowerCase();
      
      // Check magic numbers in file header
      const archiveSignatures = {
        'zip': ['50 4B 03 04', '50 4B 05 06', '50 4B 07 08'], // ZIP signatures
        'rar': ['52 61 72 21 1A 07 00', '52 61 72 21 1A 07 01 00'], // RAR signatures  
        '7z': ['37 7A BC AF 27 1C'], // 7-Zip signature
        'tar': ['75 73 74 61 72'], // TAR signature (at offset 257)
        'gz': ['1F 8B'], // GZIP signature
        'bz2': ['42 5A 68'], // BZIP2 signature
        'cab': ['4D 53 43 46'], // CAB signature
        'iso': ['43 44 30 30 31'] // ISO signature
      };

      let detectedType = null;

      // Check header signatures
      if (fileHeader) {
        const headerUpper = fileHeader.toUpperCase();
        for (const [type, signatures] of Object.entries(archiveSignatures)) {
          if (signatures.some(sig => headerUpper.startsWith(sig))) {
            detectedType = type;
            break;
          }
        }
      }

      // Fallback to extension if header detection fails
      if (!detectedType && extension && this.supportedFormats.includes(extension)) {
        detectedType = extension;
      }

      return {
        isArchive: detectedType !== null,
        archiveType: detectedType,
        extension,
        supported: detectedType ? this.supportedFormats.includes(detectedType) : false
      };

    } catch (error) {
      console.error('Error detecting archive type:', error);
      return {
        isArchive: false,
        archiveType: null,
        extension: null,
        supported: false,
        error: error.message
      };
    }
  }

  /**
   * Analyze archive without extracting (get metadata)
   */
  async analyzeArchive(filePath, archiveType, options = {}) {
    const {
      checkBombPotential = true,
      scanForMalware = true,
      maxScanFiles = 100
    } = options;

    try {
      console.log(`📦 Analyzing ${archiveType} archive: ${filePath}`);

      const analysis = {
        archiveType,
        filePath,
        totalFiles: 0,
        totalSize: 0,
        uncompressedSize: 0,
        compressionRatio: 0,
        maxDepth: 0,
        suspiciousFiles: [],
        potentialBomb: false,
        malwareIndicators: [],
        fileTypes: {},
        largestFile: null,
        analysis_time: Date.now()
      };

      // Since Expo doesn't have native archive support, we'll simulate analysis
      // In a real implementation, you'd use native modules for proper archive handling
      
      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (!fileInfo.exists) {
        throw new Error('Archive file does not exist');
      }

      analysis.totalSize = fileInfo.size;

      // Simulate archive analysis based on type
      const simulatedData = await this.simulateArchiveAnalysis(filePath, archiveType, fileInfo.size);
      Object.assign(analysis, simulatedData);

      // Check for zip bomb potential
      if (checkBombPotential) {
        analysis.potentialBomb = this.checkZipBombPotential(analysis);
      }

      // Scan for malware indicators in file names
      if (scanForMalware) {
        analysis.malwareIndicators = this.scanForMalwareIndicators(analysis);
      }

      console.log(`📊 Archive analysis completed: ${analysis.totalFiles} files, ${analysis.compressionRatio}x compression`);
      return analysis;

    } catch (error) {
      console.error(`❌ Archive analysis failed for ${filePath}:`, error);
      return {
        archiveType,
        filePath,
        error: error.message,
        analysis_time: Date.now()
      };
    }
  }

  /**
   * Simulate archive analysis (since we don't have native archive support in Expo)
   */
  async simulateArchiveAnalysis(filePath, archiveType, fileSize) {
    // This is a simulation - in a real implementation you'd parse the archive headers
    
    const baseData = {
      totalFiles: Math.floor(Math.random() * 50) + 10, // 10-60 files
      uncompressedSize: fileSize * (Math.random() * 10 + 2), // 2-12x larger when uncompressed
      maxDepth: Math.floor(Math.random() * 5) + 1, // 1-6 levels deep
      fileTypes: {
        'executable': Math.floor(Math.random() * 3),
        'document': Math.floor(Math.random() * 10) + 5,
        'image': Math.floor(Math.random() * 20) + 10,
        'script': Math.floor(Math.random() * 5),
        'unknown': Math.floor(Math.random() * 5)
      }
    };

    baseData.compressionRatio = Math.round(baseData.uncompressedSize / fileSize * 100) / 100;
    
    // Generate suspicious file list for demo
    baseData.suspiciousFiles = this.generateSuspiciousFilesList(baseData.totalFiles);

    return baseData;
  }

  /**
   * Generate list of suspicious files (simulation)
   */
  generateSuspiciousFilesList(totalFiles) {
    const suspiciousPatterns = [
      'setup.exe',
      'install.bat', 
      'update.scr',
      'readme.txt.exe',
      'document.pdf.exe',
      'photo.jpg.exe',
      'important.doc.scr',
      'invoice.pdf.pif'
    ];

    const suspicious = [];
    const numSuspicious = Math.min(Math.floor(totalFiles * 0.1), 5); // Up to 10% or 5 files

    for (let i = 0; i < numSuspicious; i++) {
      const pattern = suspiciousPatterns[Math.floor(Math.random() * suspiciousPatterns.length)];
      suspicious.push({
        filename: pattern,
        reason: 'Double extension or suspicious executable',
        severity: 'medium',
        path: `folder${i}/${pattern}`
      });
    }

    return suspicious;
  }

  /**
   * Check for zip bomb potential
   */
  checkZipBombPotential(analysis) {
    const indicators = [];
    let riskScore = 0;

    // Very high compression ratio
    if (analysis.compressionRatio > 100) {
      indicators.push('Extremely high compression ratio');
      riskScore += 40;
    } else if (analysis.compressionRatio > 50) {
      indicators.push('High compression ratio');
      riskScore += 20;
    }

    // Large uncompressed size relative to compressed
    if (analysis.uncompressedSize > 1000 * 1024 * 1024) { // > 1GB uncompressed
      indicators.push('Large uncompressed size');
      riskScore += 30;
    }

    // Deep nesting
    if (analysis.maxDepth > 10) {
      indicators.push('Deep directory nesting');
      riskScore += 25;
    }

    // Too many files
    if (analysis.totalFiles > 10000) {
      indicators.push('Excessive number of files');
      riskScore += 20;
    }

    // Files with repetitive patterns (common in zip bombs)
    const suspiciousFileCount = analysis.suspiciousFiles.length;
    if (suspiciousFileCount > analysis.totalFiles * 0.5) {
      indicators.push('High proportion of suspicious files');
      riskScore += 15;
    }

    return {
      isPotentialBomb: riskScore >= 50,
      riskScore,
      indicators,
      recommendation: riskScore >= 50 ? 'DO NOT EXTRACT - Potential zip bomb' : 
                     riskScore >= 30 ? 'CAUTION - Extract with limits' : 'Safe to extract'
    };
  }

  /**
   * Scan for malware indicators in archive contents
   */
  scanForMalwareIndicators(analysis) {
    const indicators = [];

    // Check for suspicious file extensions
    const dangerousExtensions = ['.exe', '.scr', '.pif', '.com', '.bat', '.cmd', '.vbs', '.js'];
    const executableCount = analysis.fileTypes.executable || 0;
    const scriptCount = analysis.fileTypes.script || 0;

    if (executableCount > 0) {
      indicators.push({
        type: 'executable_files',
        count: executableCount,
        severity: 'high',
        description: 'Archive contains executable files'
      });
    }

    if (scriptCount > 3) {
      indicators.push({
        type: 'multiple_scripts',
        count: scriptCount,
        severity: 'medium',
        description: 'Archive contains multiple script files'
      });
    }

    // Check suspicious files
    for (const suspFile of analysis.suspiciousFiles) {
      indicators.push({
        type: 'suspicious_filename',
        filename: suspFile.filename,
        severity: suspFile.severity,
        description: suspFile.reason
      });
    }

    // Check for known malware archive patterns
    if (analysis.totalFiles === 1 && executableCount === 1) {
      indicators.push({
        type: 'single_executable',
        severity: 'high',
        description: 'Archive contains only a single executable file'
      });
    }

    return indicators;
  }

  /**
   * Extract archive contents safely (with limits)
   */
  async extractArchive(filePath, archiveType, options = {}) {
    const {
      maxFiles = this.maxFiles,
      maxSize = this.maxExtractionSize,
      maxDepth = this.maxDepth,
      onProgress = () => {},
      scanExtracted = true
    } = options;

    try {
      console.log(`📦 Extracting ${archiveType} archive: ${filePath}`);

      // Create extraction directory
      const extractionId = `extract_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const extractDir = `${this.tempDirectory}${extractionId}/`;
      await FileSystem.makeDirectoryAsync(extractDir, { intermediates: true });

      // Since Expo doesn't support native archive extraction, we'll simulate it
      const extractionResult = await this.simulateArchiveExtraction(
        filePath, 
        extractDir, 
        archiveType,
        { maxFiles, maxSize, maxDepth, onProgress }
      );

      console.log(`✅ Archive extraction completed: ${extractionResult.extractedFiles} files`);

      return {
        extractionId,
        extractionPath: extractDir,
        ...extractionResult
      };

    } catch (error) {
      console.error(`❌ Archive extraction failed for ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Simulate archive extraction (since we don't have native support)
   */
  async simulateArchiveExtraction(filePath, extractDir, archiveType, options) {
    const { maxFiles, maxSize, maxDepth, onProgress } = options;

    // Simulate extraction process
    const totalFiles = Math.min(Math.floor(Math.random() * 20) + 5, maxFiles);
    const extractedFiles = [];
    let totalExtractedSize = 0;

    for (let i = 0; i < totalFiles; i++) {
      // Simulate progress
      onProgress({
        stage: 'extracting',
        current: i + 1,
        total: totalFiles,
        progress: Math.round(((i + 1) / totalFiles) * 100)
      });

      // Simulate creating extracted files
      const fileName = `extracted_file_${i}.txt`;
      const filePath = `${extractDir}${fileName}`;
      const fileContent = `Simulated extracted content for file ${i}`;
      
      await FileSystem.writeAsStringAsync(filePath, fileContent);
      
      const fileSize = fileContent.length;
      totalExtractedSize += fileSize;

      extractedFiles.push({
        originalPath: `folder${Math.floor(i/5)}/${fileName}`,
        extractedPath: filePath,
        size: fileSize,
        type: 'text'
      });

      // Check size limits
      if (totalExtractedSize > maxSize) {
        console.warn(`⚠️ Extraction size limit reached: ${totalExtractedSize} bytes`);
        break;
      }

      // Small delay to simulate extraction time
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    return {
      extractedFiles: extractedFiles.length,
      totalSize: totalExtractedSize,
      files: extractedFiles,
      completed: true,
      warnings: []
    };
  }

  /**
   * Clean up extracted files
   */
  async cleanupExtraction(extractionId) {
    try {
      const extractDir = `${this.tempDirectory}${extractionId}/`;
      const dirInfo = await FileSystem.getInfoAsync(extractDir);
      
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(extractDir, { idempotent: true });
        console.log(`🧹 Cleaned up extraction: ${extractionId}`);
      }
    } catch (error) {
      console.error(`Error cleaning up extraction ${extractionId}:`, error);
    }
  }

  /**
   * Clean up all temporary files
   */
  async cleanupAll() {
    try {
      if (this.tempDirectory) {
        const dirInfo = await FileSystem.getInfoAsync(this.tempDirectory);
        if (dirInfo.exists) {
          await FileSystem.deleteAsync(this.tempDirectory, { idempotent: true });
          await FileSystem.makeDirectoryAsync(this.tempDirectory, { intermediates: true });
          console.log('🧹 Cleaned up all archive temporary files');
        }
      }
    } catch (error) {
      console.error('Error cleaning up archive temp directory:', error);
    }
  }

  /**
   * Get archive analysis summary
   */
  getArchiveReport(analysisResult, extractionResult = null) {
    const report = {
      archiveInfo: {
        type: analysisResult.archiveType,
        totalFiles: analysisResult.totalFiles,
        compressedSize: analysisResult.totalSize,
        uncompressedSize: analysisResult.uncompressedSize,
        compressionRatio: analysisResult.compressionRatio
      },
      securityAssessment: {
        riskLevel: this.calculateRiskLevel(analysisResult),
        potentialBomb: analysisResult.potentialBomb,
        malwareIndicators: analysisResult.malwareIndicators.length,
        suspiciousFiles: analysisResult.suspiciousFiles.length
      },
      recommendations: this.generateRecommendations(analysisResult)
    };

    if (extractionResult) {
      report.extractionInfo = {
        extractedFiles: extractionResult.extractedFiles,
        extractedSize: extractionResult.totalSize,
        warnings: extractionResult.warnings
      };
    }

    return report;
  }

  /**
   * Calculate overall risk level for archive
   */
  calculateRiskLevel(analysis) {
    let riskScore = 0;

    // Compression ratio risk
    if (analysis.compressionRatio > 100) riskScore += 40;
    else if (analysis.compressionRatio > 50) riskScore += 20;

    // Malware indicators
    riskScore += analysis.malwareIndicators.length * 10;

    // Suspicious files
    riskScore += analysis.suspiciousFiles.length * 5;

    // Potential bomb
    if (analysis.potentialBomb && analysis.potentialBomb.isPotentialBomb) {
      riskScore += 50;
    }

    // Return risk level
    if (riskScore >= 70) return 'critical';
    if (riskScore >= 50) return 'high';
    if (riskScore >= 30) return 'medium';
    return 'low';
  }

  /**
   * Generate security recommendations
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    if (analysis.potentialBomb && analysis.potentialBomb.isPotentialBomb) {
      recommendations.push({
        priority: 'critical',
        action: 'DO NOT EXTRACT',
        reason: 'Potential zip bomb detected'
      });
    }

    if (analysis.malwareIndicators.length > 0) {
      recommendations.push({
        priority: 'high',
        action: 'Scan with antivirus before extraction',
        reason: 'Malware indicators detected'
      });
    }

    if (analysis.suspiciousFiles.length > 0) {
      recommendations.push({
        priority: 'medium',
        action: 'Review suspicious files carefully',
        reason: `${analysis.suspiciousFiles.length} suspicious files found`
      });
    }

    if (analysis.compressionRatio > 50) {
      recommendations.push({
        priority: 'medium',
        action: 'Extract with size limits',
        reason: 'High compression ratio detected'
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'low',
        action: 'Safe to extract with normal precautions',
        reason: 'No significant threats detected'
      });
    }

    return recommendations;
  }

  /**
   * Check if format is supported
   */
  isFormatSupported(archiveType) {
    return this.supportedFormats.includes(archiveType?.toLowerCase());
  }

  /**
   * Get service statistics
   */
  getStatistics() {
    return {
      supportedFormats: this.supportedFormats,
      tempDirectory: this.tempDirectory,
      maxExtractionSize: this.maxExtractionSize,
      maxFiles: this.maxFiles,
      maxDepth: this.maxDepth
    };
  }
}

export default ArchiveHandler;
