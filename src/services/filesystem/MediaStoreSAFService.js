import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import * as MediaLibrary from 'expo-media-library';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * MediaStoreSAFService
 * Implements comprehensive file access using MediaStore and Storage Access Framework (SAF)
 * Provides scoped storage compliant file enumeration for Android 11+
 */
export default class MediaStoreSAFService {
  constructor() {
    this.isInitialized = false;
    this.mediaLibraryPermission = null;
    this.safAccessGranted = false;
    this.accessibleDirectories = [];
    this.enumerationCache = new Map();
  }

  /**
   * Initialize MediaStore and SAF access
   */
  async initialize() {
    try {
      console.log('🗂️ Initializing MediaStore and SAF Service...');
      
      if (Platform.OS !== 'android') {
        console.log('⚠️ MediaStore/SAF only available on Android');
        return { initialized: false, reason: 'Android only' };
      }

      // Request MediaLibrary permissions (graceful fallback)
      try {
        const permissionResult = await MediaLibrary.requestPermissionsAsync(false);
        const status = permissionResult?.status || 'denied';
        this.mediaLibraryPermission = status;
        console.log(`📱 MediaLibrary permission: ${status}`);
      } catch (error) {
        console.warn('⚠️ MediaLibrary permission request failed:', error.message);
        this.mediaLibraryPermission = 'denied';
      }

      this.isInitialized = true;
      console.log('✅ MediaStore/SAF Service initialized');
      
      return { 
        initialized: true, 
        mediaLibraryAccess: this.mediaLibraryPermission === 'granted',
        safSupported: true 
      };
    } catch (error) {
      console.error('❌ MediaStore/SAF initialization failed:', error);
      throw error;
    }
  }

  /**
   * STEP 1: Enumerate ALL accessible files via MediaStore and SAF
   * This is the comprehensive file discovery phase
   */
  async enumerateAllAccessibleFiles(options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const allFiles = [];
    const startTime = Date.now();
    const onProgress = options.onProgress || (() => {});

    try {
      console.log('🔍 STEP 1: Starting comprehensive file enumeration...');
      onProgress({ stage: 'init', progress: 0, message: 'Initializing file enumeration' });

      // Phase 1A: MediaStore Files (Scoped Storage Compliant)
      onProgress({ stage: 'mediastore', progress: 10, message: 'Scanning MediaStore files' });
      const mediaStoreFiles = await this.getMediaStoreFiles(options);
      allFiles.push(...mediaStoreFiles);
      console.log(`📱 MediaStore: ${mediaStoreFiles.length} files`);

      // Phase 1B: App's Private Directories (Always Accessible)
      onProgress({ stage: 'app_dirs', progress: 30, message: 'Scanning app directories' });
      const appFiles = await this.getAppDirectoryFiles();
      allFiles.push(...appFiles);
      console.log(`📁 App directories: ${appFiles.length} files`);

      // Phase 1C: SAF Access (User-granted external storage)
      let safFiles = [];
      if (options.requestSAF !== false) {
        onProgress({ stage: 'saf', progress: 50, message: 'Requesting Storage Access Framework' });
        safFiles = await this.getSAFAccessibleFiles(options);
        allFiles.push(...safFiles);
        console.log(`🗂️ SAF: ${safFiles.length} files`);
      }

      // Phase 1D: Deduplication and Processing
      onProgress({ stage: 'processing', progress: 80, message: 'Processing and deduplicating files' });
      const uniqueFiles = this.deduplicateAndEnrichFiles(allFiles);
      
      const scanTime = Date.now() - startTime;
      onProgress({ stage: 'complete', progress: 100, message: `Found ${uniqueFiles.length} unique files` });

      console.log(`✅ File enumeration complete:`);
      console.log(`   📊 Total unique files: ${uniqueFiles.length}`);
      console.log(`   ⏱️ Enumeration time: ${scanTime}ms`);
      console.log(`   📱 MediaStore: ${mediaStoreFiles.length}`);
      console.log(`   📁 App dirs: ${appFiles.length}`);

      return {
        files: uniqueFiles,
        stats: {
          totalFiles: uniqueFiles.length,
          mediaStoreFiles: mediaStoreFiles.length,
          appDirectoryFiles: appFiles.length,
          safFiles: safFiles.length,
          enumerationTimeMs: scanTime,
          sources: ['mediastore', 'app_directories', 'saf']
        }
      };

    } catch (error) {
      console.error('❌ File enumeration failed:', error);
      throw error;
    }
  }

  /**
   * Get files from MediaStore (all media types)
   */
  async getMediaStoreFiles(options = {}) {
    if (this.mediaLibraryPermission !== 'granted') {
      console.log('⚠️ MediaLibrary permission not granted - skipping MediaStore');
      return [];
    }

    try {
      const allFiles = [];
      const mediaTypes = [
        MediaLibrary.MediaType.photo,
        MediaLibrary.MediaType.video,
        MediaLibrary.MediaType.audio,
      ];

      for (const mediaType of mediaTypes) {
        try {
          let hasNextPage = true;
          let endCursor = null;
          let fileCount = 0;
          const maxFiles = options.mediaStoreLimit || 2000;

          while (hasNextPage && fileCount < maxFiles) {
            const batchSize = Math.min(200, maxFiles - fileCount);
            
            const media = await MediaLibrary.getAssetsAsync({
              first: batchSize,
              after: endCursor,
              mediaType: mediaType,
              sortBy: MediaLibrary.SortBy.modificationTime,
            });

            for (const asset of media.assets) {
              try {
                const fileInfo = await FileSystem.getInfoAsync(asset.uri);
                
                if (fileInfo.exists && fileInfo.size > 0) {
                  allFiles.push({
                    id: `media_${asset.id}`,
                    uri: asset.uri,
                    filePath: asset.uri,
                    filename: asset.filename || `media_${asset.id}`,
                    size: fileInfo.size,
                    mediaType: asset.mediaType,
                    creationTime: asset.creationTime,
                    modificationTime: asset.modificationTime,
                    width: asset.width,
                    height: asset.height,
                    duration: asset.duration,
                    source: 'mediastore',
                    isDirectory: false,
                    scannable: this.isFileScannableForSecurity(asset.filename, fileInfo.size)
                  });
                  fileCount++;
                }
              } catch (error) {
                console.warn(`Failed to process MediaStore asset: ${asset.filename}`, error.message);
              }
            }

            hasNextPage = media.hasNextPage;
            endCursor = media.endCursor;
          }

          console.log(`📱 MediaStore ${mediaType}: ${fileCount} files`);
        } catch (error) {
          console.warn(`Failed to scan MediaStore ${mediaType}:`, error.message);
        }
      }

      return allFiles;
    } catch (error) {
      console.error('Failed to get MediaStore files:', error);
      return [];
    }
  }

  /**
   * Get files from app's private directories
   */
  async getAppDirectoryFiles() {
    try {
      const appDirs = [
        FileSystem.documentDirectory,
        FileSystem.cacheDirectory,
      ];

      const allFiles = [];

      for (const dir of appDirs.filter(Boolean)) {
        try {
          const files = await this.scanDirectoryRecursive(dir, 'app_directory');
          allFiles.push(...files);
        } catch (error) {
          console.warn(`Failed to scan app directory ${dir}:`, error.message);
        }
      }

      return allFiles;
    } catch (error) {
      console.error('Failed to get app directory files:', error);
      return [];
    }
  }

  /**
   * Get files via Storage Access Framework (SAF)
   */
  async getSAFAccessibleFiles(options = {}) {
    try {
      console.log('🗂️ Requesting SAF access...');
      
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
        copyToCacheDirectory: false,
      });

      if (result.type === 'success') {
        const safFiles = Array.isArray(result) ? result : [result];
        
        return safFiles.map((file, index) => ({
          id: `saf_${Date.now()}_${index}`,
          uri: file.uri,
          filePath: file.uri,
          filename: file.name,
          size: file.size || 0,
          mimeType: file.mimeType,
          source: 'saf',
          isDirectory: false,
          scannable: this.isFileScannableForSecurity(file.name, file.size || 0)
        }));
      }

      return [];
    } catch (error) {
      console.warn('SAF access failed:', error.message);
      return [];
    }
  }

  /**
   * Scan directory recursively
   */
  async scanDirectoryRecursive(dirPath, source = 'filesystem', maxDepth = 3, currentDepth = 0) {
    if (currentDepth >= maxDepth) {
      return [];
    }

    try {
      const dirInfo = await FileSystem.getInfoAsync(dirPath);
      if (!dirInfo.exists || !dirInfo.isDirectory) {
        return [];
      }

      const items = await FileSystem.readDirectoryAsync(dirPath);
      const allFiles = [];

      for (const item of items) {
        try {
          const itemPath = `${dirPath}/${item}`;
          const itemInfo = await FileSystem.getInfoAsync(itemPath);

          if (itemInfo.isDirectory) {
            // Recursively scan subdirectory
            const subFiles = await this.scanDirectoryRecursive(itemPath, source, maxDepth, currentDepth + 1);
            allFiles.push(...subFiles);
          } else {
            // Add file
            allFiles.push({
              id: `${source}_${Date.now()}_${Math.random()}`,
              uri: itemPath,
              filePath: itemPath,
              filename: item,
              size: itemInfo.size || 0,
              modificationTime: itemInfo.modificationTime,
              source: source,
              isDirectory: false,
              scannable: this.isFileScannableForSecurity(item, itemInfo.size || 0)
            });
          }
        } catch (error) {
          console.warn(`Failed to process item ${item}:`, error.message);
        }
      }

      return allFiles;
    } catch (error) {
      console.warn(`Failed to scan directory ${dirPath}:`, error.message);
      return [];
    }
  }

  /**
   * Deduplicate files and enrich with metadata
   */
  deduplicateAndEnrichFiles(files) {
    const seen = new Set();
    const uniqueFiles = [];

    for (const file of files) {
      const key = file.uri || file.filePath;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);

      // Enrich with security-relevant metadata
      const enrichedFile = {
        ...file,
        fileExtension: this.getFileExtension(file.filename || ''),
        mimeType: file.mimeType || this.guessMimeType(file.filename || ''),
        isExecutable: this.isExecutableFile(file.filename || ''),
        isArchive: this.isArchiveFile(file.filename || ''),
        riskLevel: this.assessInitialRiskLevel(file),
        timestamp: Date.now()
      };

      uniqueFiles.push(enrichedFile);
    }

    return uniqueFiles;
  }

  /**
   * Check if file should be scanned for security (based on type and size)
   */
  isFileScannableForSecurity(filename, size) {
    const maxSize = 100 * 1024 * 1024; // 100MB
    const minSize = 1;

    if (size > maxSize || size < minSize) {
      return false;
    }

    const ext = this.getFileExtension(filename).toLowerCase();
    const scannableExtensions = [
      // Executables and packages
      'apk', 'dex', 'jar', 'exe', 'dll', 'so', 'bin',
      // Archives
      'zip', 'rar', '7z', 'tar', 'gz', 'bz2',
      // Documents
      'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
      // Media files (can contain malicious metadata)
      'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg',
      'mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv',
      'mp3', 'wav', 'flac', 'aac', 'ogg',
      // Text and scripts
      'txt', 'html', 'htm', 'xml', 'json', 'js', 'py', 'sh'
    ];

    return scannableExtensions.includes(ext) || !ext; // Include files without extensions
  }

  /**
   * Get file extension
   */
  getFileExtension(filename) {
    const lastDot = filename.lastIndexOf('.');
    return lastDot === -1 ? '' : filename.substring(lastDot + 1);
  }

  /**
   * Guess MIME type from filename
   */
  guessMimeType(filename) {
    const ext = this.getFileExtension(filename).toLowerCase();
    const mimeMap = {
      'apk': 'application/vnd.android.package-archive',
      'pdf': 'application/pdf',
      'zip': 'application/zip',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'mp4': 'video/mp4',
      'mp3': 'audio/mpeg',
      'txt': 'text/plain',
    };
    return mimeMap[ext] || 'application/octet-stream';
  }

  /**
   * Check if file is executable
   */
  isExecutableFile(filename) {
    const ext = this.getFileExtension(filename).toLowerCase();
    const executableExtensions = ['apk', 'dex', 'exe', 'dll', 'so', 'bin', 'jar'];
    return executableExtensions.includes(ext);
  }

  /**
   * Check if file is an archive
   */
  isArchiveFile(filename) {
    const ext = this.getFileExtension(filename).toLowerCase();
    const archiveExtensions = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'apk', 'jar'];
    return archiveExtensions.includes(ext);
  }

  /**
   * Assess initial risk level based on file characteristics
   */
  assessInitialRiskLevel(file) {
    let risk = 0;

    // Executable files are inherently riskier
    if (this.isExecutableFile(file.filename || '')) {
      risk += 3;
    }

    // Files from external sources (SAF) are riskier
    if (file.source === 'saf') {
      risk += 2;
    }

    // Very large files might be suspicious
    if (file.size > 50 * 1024 * 1024) { // 50MB+
      risk += 1;
    }

    // Recently modified files
    const dayMs = 24 * 60 * 60 * 1000;
    if (file.modificationTime && (Date.now() - file.modificationTime < dayMs)) {
      risk += 1;
    }

    if (risk >= 4) return 'high';
    if (risk >= 2) return 'medium';
    return 'low';
  }

  /**
   * Get service statistics
   */
  getStatistics() {
    return {
      isInitialized: this.isInitialized,
      mediaLibraryPermission: this.mediaLibraryPermission,
      safAccessGranted: this.safAccessGranted,
      accessibleDirectories: this.accessibleDirectories.length,
      cacheSize: this.enumerationCache.size
    };
  }
}
