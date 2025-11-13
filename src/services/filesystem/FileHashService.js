import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

/**
 * FileHashService
 * Handles file hash computation (SHA-256), type validation, and file integrity checks
 */
class FileHashService {
  constructor() {
    this.isProcessing = false;
    this.supportedHashAlgorithms = ['sha256', 'md5', 'sha1'];
    this.maxFileSize = 100 * 1024 * 1024; // 100MB default limit for in-memory hashing
    this.chunkSize = 64 * 1024; // 64KB chunks for large file processing
  }

  /**
   * Initialize the hash service
   */
  async initialize() {
    try {
      console.log('🔐 Initializing File Hash Service...');
      
      // Test crypto capabilities
      const testHash = await this.computeStringHash('test', 'sha256');
      console.log(`✅ Crypto test passed: ${testHash.substring(0, 16)}...`);
      
      return {
        initialized: true,
        supportedAlgorithms: this.supportedHashAlgorithms,
        maxFileSize: this.maxFileSize,
        chunkSize: this.chunkSize
      };
    } catch (error) {
      console.error('❌ Failed to initialize hash service:', error);
      throw error;
    }
  }

  /**
   * Compute SHA-256 hash of a file
   */
  async computeFileHash(filePath, algorithm = 'sha256', options = {}) {
    const {
      maxSize = this.maxFileSize,
      onProgress = () => {},
      validateType = true
    } = options;

    try {
      console.log(`🔐 Computing ${algorithm} hash for: ${filePath}`);

      // Validate file exists and get info
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (!fileInfo.exists) {
        throw new Error(`File does not exist: ${filePath}`);
      }

      // Check file size limits
      if (fileInfo.size > maxSize) {
        console.warn(`⚠️ File too large for hashing: ${fileInfo.size} bytes`);
        return {
          hash: null,
          algorithm,
          fileSize: fileInfo.size,
          error: 'File too large',
          hashTime: 0
        };
      }

      const startTime = Date.now();

      // Validate file type if requested
      let fileTypeInfo = null;
      if (validateType) {
        fileTypeInfo = await this.validateFileType(filePath);
      }

      // Compute hash based on file size
      let hash;
      if (fileInfo.size <= this.chunkSize * 10) {
        // Small files: read entirely into memory
        hash = await this.computeSmallFileHash(filePath, algorithm, onProgress);
      } else {
        // Large files: process in chunks 
        hash = await this.computeLargeFileHash(filePath, algorithm, fileInfo.size, onProgress);
      }

      const hashTime = Date.now() - startTime;
      console.log(`✅ Hash computed in ${hashTime}ms: ${hash}`);

      return {
        hash,
        algorithm,
        fileSize: fileInfo.size,
        hashTime,
        fileTypeInfo,
        error: null
      };

    } catch (error) {
      console.error(`❌ Failed to compute hash for ${filePath}:`, error);
      return {
        hash: null,
        algorithm,
        fileSize: 0,
        hashTime: 0,
        error: error.message
      };
    }
  }

  /**
   * Compute hash for small files (read entirely into memory)
   */
  async computeSmallFileHash(filePath, algorithm, onProgress) {
    try {
      // Read file as base64
      const fileContent = await FileSystem.readAsStringAsync(filePath, {
        encoding: FileSystem.EncodingType.Base64
      });

      onProgress({ stage: 'reading', progress: 50 });

      // Convert base64 to ArrayBuffer for hashing
      const binaryString = atob(fileContent);
      const bytes = new Uint8Array(binaryString.length);
      
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      onProgress({ stage: 'hashing', progress: 75 });

      // Compute hash
      const hash = await Crypto.digestStringAsync(
        this.getCryptoAlgorithm(algorithm),
        fileContent,
        { encoding: Crypto.Encoding.BASE64 }
      );

      onProgress({ stage: 'complete', progress: 100 });
      return hash;

    } catch (error) {
      console.error('Error computing small file hash:', error);
      throw error;
    }
  }

  /**
   * Compute hash for large files (process in chunks)
   */
  async computeLargeFileHash(filePath, algorithm, fileSize, onProgress) {
    try {
      console.log(`🔐 Processing large file in chunks: ${fileSize} bytes`);

      // For large files, we'll use a simplified approach with Expo
      // In a native implementation, you'd process chunks iteratively
      
      const startTime = Date.now();
      let processedBytes = 0;
      const chunks = [];

      // Read file in chunks (simulated - Expo doesn't support true streaming)
      const numChunks = Math.ceil(fileSize / this.chunkSize);
      
      onProgress({ 
        stage: 'chunking', 
        progress: 10,
        processedBytes,
        totalBytes: fileSize,
        currentChunk: 0,
        totalChunks: numChunks
      });

      // For now, read the entire file (in production, you'd use native modules for chunked reading)
      const fileContent = await FileSystem.readAsStringAsync(filePath, {
        encoding: FileSystem.EncodingType.Base64
      });

      processedBytes = fileSize;
      onProgress({ 
        stage: 'hashing', 
        progress: 80,
        processedBytes,
        totalBytes: fileSize
      });

      // Compute hash
      const hash = await Crypto.digestStringAsync(
        this.getCryptoAlgorithm(algorithm),
        fileContent,
        { encoding: Crypto.Encoding.BASE64 }
      );

      onProgress({ 
        stage: 'complete', 
        progress: 100,
        processedBytes: fileSize,
        totalBytes: fileSize
      });

      const processingTime = Date.now() - startTime;
      console.log(`✅ Large file hash completed in ${processingTime}ms`);

      return hash;

    } catch (error) {
      console.error('Error computing large file hash:', error);
      throw error;
    }
  }

  /**
   * Compute hash for a string
   */
  async computeStringHash(content, algorithm = 'sha256') {
    try {
      return await Crypto.digestStringAsync(
        this.getCryptoAlgorithm(algorithm),
        content,
        { encoding: Crypto.Encoding.HEX }
      );
    } catch (error) {
      console.error('Error computing string hash:', error);
      throw error;
    }
  }

  /**
   * Validate file type and detect potential mismatches
   */
  async validateFileType(filePath) {
    try {
      const fileName = filePath.split('/').pop();
      const extension = fileName.split('.').pop()?.toLowerCase();
      
      // Read file header to detect actual file type
      const header = await this.readFileHeader(filePath, 32); // Read first 32 bytes
      const detectedType = this.detectFileTypeFromHeader(header);
      
      // Compare with extension
      const expectedType = this.getExpectedTypeFromExtension(extension);
      const mismatch = expectedType !== detectedType && detectedType !== 'unknown';

      return {
        fileName,
        extension,
        expectedType,
        detectedType,
        headerMismatch: mismatch,
        isSuspicious: mismatch && this.isSuspiciousMismatch(expectedType, detectedType),
        fileHeader: header
      };

    } catch (error) {
      console.error('Error validating file type:', error);
      return {
        fileName: filePath.split('/').pop(),
        extension: null,
        expectedType: 'unknown',
        detectedType: 'unknown',
        headerMismatch: false,
        isSuspicious: false,
        error: error.message
      };
    }
  }

  /**
   * Read file header bytes for type detection
   */
  async readFileHeader(filePath, numBytes = 32) {
    try {
      // Read as base64 and convert to hex for header analysis
      const base64Content = await FileSystem.readAsStringAsync(filePath, {
        encoding: FileSystem.EncodingType.Base64
      });

      // Convert base64 to binary and extract header
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
   * Detect file type from header bytes (magic numbers)
   */
  detectFileTypeFromHeader(header) {
    if (!header) return 'unknown';

    const headerUpper = header.toUpperCase();

    // Common file signatures
    const signatures = {
      'image': [
        'FF D8 FF',        // JPEG
        '89 50 4E 47',     // PNG
        '47 49 46 38',     // GIF
        '42 4D',           // BMP
        '52 49 46 46'      // WEBP (RIFF)
      ],
      'video': [
        '00 00 00 18 66 74 79 70',  // MP4
        '52 49 46 46',              // AVI (RIFF)
        '1A 45 DF A3'               // MKV
      ],
      'audio': [
        'FF FB',           // MP3
        '52 49 46 46',     // WAV (RIFF)
        '4F 67 67 53'      // OGG
      ],
      'archive': [
        '50 4B 03 04',     // ZIP
        '52 61 72 21',     // RAR
        '37 7A BC AF'      // 7Z
      ],
      'executable': [
        '50 4B 03 04',     // APK (ZIP-based)
        '4D 5A',           // EXE
        '7F 45 4C 46'      // ELF
      ],
      'document': [
        '25 50 44 46',     // PDF
        'D0 CF 11 E0',     // Microsoft Office
        '50 4B 03 04'      // Office Open XML
      ]
    };

    for (const [type, sigs] of Object.entries(signatures)) {
      for (const sig of sigs) {
        if (headerUpper.startsWith(sig)) {
          return type;
        }
      }
    }

    return 'unknown';
  }

  /**
   * Get expected file type from extension
   */
  getExpectedTypeFromExtension(extension) {
    if (!extension) return 'unknown';

    const extensionMap = {
      // Images
      'jpg': 'image', 'jpeg': 'image', 'png': 'image', 'gif': 'image', 'bmp': 'image', 'webp': 'image',
      // Videos  
      'mp4': 'video', 'avi': 'video', 'mkv': 'video', 'mov': 'video', 'wmv': 'video',
      // Audio
      'mp3': 'audio', 'wav': 'audio', 'ogg': 'audio', 'aac': 'audio', 'flac': 'audio',
      // Archives
      'zip': 'archive', 'rar': 'archive', '7z': 'archive', 'tar': 'archive',
      // Executables
      'apk': 'executable', 'exe': 'executable', 'deb': 'executable',
      // Documents
      'pdf': 'document', 'doc': 'document', 'docx': 'document', 'txt': 'document'
    };

    return extensionMap[extension.toLowerCase()] || 'unknown';
  }

  /**
   * Check if file type mismatch is suspicious
   */
  isSuspiciousMismatch(expectedType, detectedType) {
    // Executable files masquerading as other types are highly suspicious
    if (detectedType === 'executable' && expectedType !== 'executable') {
      return true;
    }

    // Archives masquerading as other types can be suspicious
    if (detectedType === 'archive' && !['archive', 'executable'].includes(expectedType)) {
      return true;
    }

    return false;
  }

  /**
   * Get Expo Crypto algorithm constant
   */
  getCryptoAlgorithm(algorithm) {
    const algorithmMap = {
      'sha256': Crypto.CryptoDigestAlgorithm.SHA256,
      'sha1': Crypto.CryptoDigestAlgorithm.SHA1,
      'md5': Crypto.CryptoDigestAlgorithm.MD5
    };

    return algorithmMap[algorithm.toLowerCase()] || Crypto.CryptoDigestAlgorithm.SHA256;
  }

  /**
   * Batch process multiple files for hashing
   */
  async batchProcessFiles(files, options = {}) {
    const {
      algorithm = 'sha256',
      maxConcurrent = 3,
      onProgress = () => {},
      onFileComplete = () => {}
    } = options;

    try {
      this.isProcessing = true;
      console.log(`🔐 Batch processing ${files.length} files for hashing...`);

      const results = [];
      let processed = 0;

      // Process files in batches to avoid overwhelming the system
      for (let i = 0; i < files.length; i += maxConcurrent) {
        if (!this.isProcessing) break;

        const batch = files.slice(i, i + maxConcurrent);
        const batchPromises = batch.map(async (file) => {
          try {
            const hashResult = await this.computeFileHash(file.filePath, algorithm, {
              onProgress: (progress) => {
                onProgress({
                  fileIndex: i + batch.indexOf(file),
                  fileName: file.fileName,
                  ...progress
                });
              }
            });

            const result = {
              ...file,
              ...hashResult,
              processedAt: Date.now()
            };

            onFileComplete(result);
            return result;

          } catch (error) {
            console.error(`Error processing file ${file.fileName}:`, error);
            return {
              ...file,
              hash: null,
              error: error.message,
              processedAt: Date.now()
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        processed += batchResults.length;

        onProgress({
          batch: Math.floor(i / maxConcurrent) + 1,
          totalBatches: Math.ceil(files.length / maxConcurrent),
          processed,
          total: files.length,
          stage: 'batch_complete'
        });
      }

      console.log(`✅ Batch processing completed: ${processed}/${files.length} files`);
      return results;

    } catch (error) {
      console.error('❌ Batch processing failed:', error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Verify file integrity by comparing hashes
   */
  async verifyFileIntegrity(filePath, expectedHash, algorithm = 'sha256') {
    try {
      console.log(`🔍 Verifying integrity of: ${filePath}`);

      const hashResult = await this.computeFileHash(filePath, algorithm);
      
      if (hashResult.error) {
        return {
          verified: false,
          error: hashResult.error,
          expectedHash,
          actualHash: null
        };
      }

      const verified = hashResult.hash?.toLowerCase() === expectedHash.toLowerCase();
      
      console.log(`${verified ? '✅' : '❌'} Integrity verification: ${verified ? 'PASSED' : 'FAILED'}`);

      return {
        verified,
        expectedHash,
        actualHash: hashResult.hash,
        algorithm,
        fileSize: hashResult.fileSize,
        hashTime: hashResult.hashTime
      };

    } catch (error) {
      console.error('Error verifying file integrity:', error);
      return {
        verified: false,
        error: error.message,
        expectedHash,
        actualHash: null
      };
    }
  }

  /**
   * Stop current processing
   */
  stopProcessing() {
    console.log('⏹️ Stopping file hash processing...');
    this.isProcessing = false;
  }

  /**
   * Check if currently processing
   */
  isCurrentlyProcessing() {
    return this.isProcessing;
  }

  /**
   * Get service statistics
   */
  getStatistics() {
    return {
      isProcessing: this.isProcessing,
      supportedAlgorithms: this.supportedHashAlgorithms,
      maxFileSize: this.maxFileSize,
      chunkSize: this.chunkSize,
      platform: Platform.OS
    };
  }
}

export default new FileHashService();
