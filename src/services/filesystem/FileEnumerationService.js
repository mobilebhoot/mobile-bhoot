import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import * as MediaLibrary from 'expo-media-library';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * FileEnumerationService
 * Handles file discovery using MediaStore and Storage Access Framework (SAF)
 * Compliant with Android scoped storage requirements
 */
class FileEnumerationService {
  constructor() {
    this.isScanning = false;
    this.currentSession = null;
    this.mediaStoreSupported = Platform.OS === 'android';
    this.mediaLibraryAccess = false;
    this.safSupported = Platform.OS === 'android' && Platform.Version >= 19;
  }

  /**
   * Initialize file enumeration with proper permissions
   */
  async initialize() {
    try {
      console.log('🔍 Initializing File Enumeration Service...');
      
      // Request media library permissions for MediaStore access (optional)
      try {
        const permissionResult = await MediaLibrary.requestPermissionsAsync(false);
        const mediaStatus = permissionResult?.status;
        
        if (mediaStatus !== 'granted') {
          console.warn('⚠️ Media library permission not granted - limited file access');
          this.mediaLibraryAccess = false;
        } else {
          console.log('✅ Media library access granted');
          this.mediaLibraryAccess = true;
        }
      } catch (error) {
        console.warn('⚠️ Media library permission request failed:', error.message);
        this.mediaLibraryAccess = false;
        // Continue without media library access
      }

      // Check for all files access permission (Android 11+)
      const hasAllFilesAccess = await this.checkAllFilesAccess();
      console.log(`📁 All files access: ${hasAllFilesAccess ? '✅ Granted' : '❌ Not granted'}`);

      this.isInitialized = true;
      console.log('✅ File Enumeration Service initialized successfully');

      return {
        initialized: true,
        mediaStoreSupported: this.mediaStoreSupported,
        safSupported: this.safSupported,
        mediaStoreAccess: this.mediaLibraryAccess,
        allFilesAccess: hasAllFilesAccess,
        supportedDirectories: this.supportedDirectories?.length || 0
      };
    } catch (error) {
      console.error('❌ Failed to initialize file enumeration:', error);
      throw error;
    }
  }

  /**
   * Check if we have MANAGE_EXTERNAL_STORAGE permission (Android 11+)
   */
  async checkAllFilesAccess() {
    try {
      if (Platform.OS !== 'android' || Platform.Version < 30) {
        return true; // Not applicable for older versions
      }

      // For demo purposes, we'll simulate this check
      // In a real implementation, you'd use native modules to check this permission
      const storedPermission = await AsyncStorage.getItem('all_files_access_granted');
      return storedPermission === 'true';
    } catch (error) {
      console.error('Error checking all files access:', error);
      return false;
    }
  }

  /**
   * Request all files access permission (Android 11+)
   */
  async requestAllFilesAccess() {
    try {
      if (Platform.OS !== 'android' || Platform.Version < 30) {
        return true;
      }

      // For demo purposes, we'll simulate this request
      // In a real implementation, you'd use Linking to open the system settings
      console.log('📱 Requesting all files access permission...');
      
      // Simulate user granting permission
      await AsyncStorage.setItem('all_files_access_granted', 'true');
      return true;
    } catch (error) {
      console.error('Error requesting all files access:', error);
      return false;
    }
  }

  /**
   * Enumerate files using MediaStore (Android scoped storage compliant)
   */
  async enumerateMediaStoreFiles(sessionId, options = {}) {
    const {
      mediaTypes = ['photo', 'video', 'audio'],
      batchSize = 100,
      resumeFrom = null,
      onProgress = () => {},
      onBatch = () => {}
    } = options;

    try {
      console.log(`📱 Starting MediaStore enumeration for session: ${sessionId}`);
      
      const files = [];
      let totalProcessed = 0;
      let hasNextPage = true;
      let after = resumeFrom;

      while (hasNextPage && this.isScanning) {
        for (const mediaType of mediaTypes) {
          try {
            const mediaOptions = {
              first: batchSize,
              mediaType: mediaType,
              sortBy: [MediaLibrary.SortBy.creationTime]
            };

            if (after) {
              mediaOptions.after = after;
            }

            const media = await MediaLibrary.getAssetsAsync(mediaOptions);
            
            for (const asset of media.assets) {
              if (!this.isScanning) break;

              const fileInfo = await this.processMediaStoreAsset(asset, sessionId);
              if (fileInfo) {
                files.push(fileInfo);
                totalProcessed++;

                // Report progress
                onProgress({
                  type: 'mediastore',
                  processed: totalProcessed,
                  currentFile: fileInfo.fileName,
                  sessionId
                });
              }
            }

            // Process batch
            if (files.length >= batchSize) {
              await onBatch(files.splice(0, batchSize));
            }

            // Update pagination
            hasNextPage = media.hasNextPage;
            after = media.endCursor;

            // Save checkpoint
            await this.saveEnumerationCheckpoint(sessionId, 'mediastore', {
              mediaType,
              after,
              totalProcessed
            });

          } catch (error) {
            console.error(`Error enumerating ${mediaType}:`, error);
          }
        }
      }

      // Process remaining files
      if (files.length > 0) {
        await onBatch(files);
      }

      console.log(`✅ MediaStore enumeration completed: ${totalProcessed} files`);
      return { totalProcessed, completed: true };

    } catch (error) {
      console.error('❌ MediaStore enumeration failed:', error);
      throw error;
    }
  }

  /**
   * Process individual MediaStore asset
   */
  async processMediaStoreAsset(asset, sessionId) {
    try {
      const fileInfo = await MediaLibrary.getAssetInfoAsync(asset);
      
      return {
        id: asset.id,
        fileName: asset.filename,
        filePath: fileInfo.localUri || fileInfo.uri,
        fileSize: fileInfo.fileSize || 0,
        fileType: this.getFileTypeFromAsset(asset),
        mimeType: asset.mediaType,
        creationTime: asset.creationTime,
        modificationTime: asset.modificationTime,
        isAccessible: true,
        source: 'mediastore',
        sessionId
      };
    } catch (error) {
      console.error('Error processing MediaStore asset:', error);
      return null;
    }
  }

  /**
   * Enumerate files using Storage Access Framework (SAF)
   */
  async enumerateDocumentFiles(sessionId, options = {}) {
    const {
      onProgress = () => {},
      onBatch = () => {},
      batchSize = 50
    } = options;

    try {
      console.log(`📁 Starting SAF document enumeration for session: ${sessionId}`);

      // Request user to select directories to scan
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
        copyToCacheDirectory: false
      });

      if (result.cancelled) {
        console.log('📁 User cancelled document selection');
        return { totalProcessed: 0, completed: false };
      }

      const files = [];
      let totalProcessed = 0;

      // Process selected documents/directories
      const assets = Array.isArray(result.assets) ? result.assets : [result];
      
      for (const asset of assets) {
        if (!this.isScanning) break;

        const fileInfo = await this.processDocumentAsset(asset, sessionId);
        if (fileInfo) {
          files.push(fileInfo);
          totalProcessed++;

          onProgress({
            type: 'saf',
            processed: totalProcessed,
            currentFile: fileInfo.fileName,
            sessionId
          });

          // Process batch
          if (files.length >= batchSize) {
            await onBatch(files.splice(0, batchSize));
          }
        }
      }

      // Process remaining files
      if (files.length > 0) {
        await onBatch(files);
      }

      console.log(`✅ SAF enumeration completed: ${totalProcessed} files`);
      return { totalProcessed, completed: true };

    } catch (error) {
      console.error('❌ SAF enumeration failed:', error);
      throw error;
    }
  }

  /**
   * Process individual document asset from SAF
   */
  async processDocumentAsset(asset, sessionId) {
    try {
      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(asset.uri);
      
      return {
        id: `saf_${Date.now()}_${Math.random()}`,
        fileName: asset.name,
        filePath: asset.uri,
        fileSize: asset.size || fileInfo.size || 0,
        fileType: this.getFileTypeFromName(asset.name),
        mimeType: asset.mimeType || this.getMimeTypeFromName(asset.name),
        creationTime: fileInfo.modificationTime,
        modificationTime: fileInfo.modificationTime,
        isAccessible: fileInfo.exists,
        source: 'saf',
        sessionId
      };
    } catch (error) {
      console.error('Error processing document asset:', error);
      return null;
    }
  }

  /**
   * Enumerate files from app-specific directories (always accessible)
   */
  async enumerateAppFiles(sessionId, options = {}) {
    const {
      onProgress = () => {},
      onBatch = () => {},
      batchSize = 100
    } = options;

    try {
      console.log(`📱 Starting app files enumeration for session: ${sessionId}`);

      const appDirectories = [
        FileSystem.documentDirectory,
        FileSystem.cacheDirectory,
        FileSystem.bundleDirectory
      ].filter(dir => dir);

      const files = [];
      let totalProcessed = 0;

      for (const directory of appDirectories) {
        if (!this.isScanning) break;

        const dirFiles = await this.enumerateDirectory(directory, sessionId, {
          recursive: true,
          maxDepth: 10
        });

        for (const fileInfo of dirFiles) {
          files.push(fileInfo);
          totalProcessed++;

          onProgress({
            type: 'app',
            processed: totalProcessed,
            currentFile: fileInfo.fileName,
            sessionId
          });

          // Process batch
          if (files.length >= batchSize) {
            await onBatch(files.splice(0, batchSize));
          }
        }
      }

      // Process remaining files
      if (files.length > 0) {
        await onBatch(files);
      }

      console.log(`✅ App files enumeration completed: ${totalProcessed} files`);
      return { totalProcessed, completed: true };

    } catch (error) {
      console.error('❌ App files enumeration failed:', error);
      throw error;
    }
  }

  /**
   * Recursively enumerate directory contents
   */
  async enumerateDirectory(directoryUri, sessionId, options = {}) {
    const { recursive = true, maxDepth = 5, currentDepth = 0 } = options;
    
    if (currentDepth >= maxDepth) {
      return [];
    }

    try {
      const dirInfo = await FileSystem.getInfoAsync(directoryUri);
      if (!dirInfo.exists || !dirInfo.isDirectory) {
        return [];
      }

      const contents = await FileSystem.readDirectoryAsync(directoryUri);
      const files = [];

      for (const item of contents) {
        if (!this.isScanning) break;

        const itemUri = `${directoryUri}${item}`;
        const itemInfo = await FileSystem.getInfoAsync(itemUri);

        if (itemInfo.isDirectory && recursive) {
          // Recursively process subdirectory
          const subFiles = await this.enumerateDirectory(itemUri + '/', sessionId, {
            recursive,
            maxDepth,
            currentDepth: currentDepth + 1
          });
          files.push(...subFiles);
        } else if (!itemInfo.isDirectory) {
          // Process file
          files.push({
            id: `app_${Date.now()}_${Math.random()}`,
            fileName: item,
            filePath: itemUri,
            fileSize: itemInfo.size || 0,
            fileType: this.getFileTypeFromName(item),
            mimeType: this.getMimeTypeFromName(item),
            creationTime: itemInfo.modificationTime,
            modificationTime: itemInfo.modificationTime,
            isAccessible: true,
            source: 'app',
            sessionId
          });
        }
      }

      return files;
    } catch (error) {
      console.error(`Error enumerating directory ${directoryUri}:`, error);
      return [];
    }
  }

  /**
   * Get file type from MediaStore asset
   */
  getFileTypeFromAsset(asset) {
    const typeMap = {
      'photo': 'image',
      'video': 'video',
      'audio': 'audio'
    };
    return typeMap[asset.mediaType] || 'unknown';
  }

  /**
   * Get file type from filename
   */
  getFileTypeFromName(fileName) {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    const typeMap = {
      // Images
      'jpg': 'image', 'jpeg': 'image', 'png': 'image', 'gif': 'image', 'bmp': 'image', 'webp': 'image',
      // Videos
      'mp4': 'video', 'avi': 'video', 'mkv': 'video', 'mov': 'video', 'wmv': 'video', '3gp': 'video',
      // Audio
      'mp3': 'audio', 'wav': 'audio', 'aac': 'audio', 'ogg': 'audio', 'flac': 'audio', 'm4a': 'audio',
      // Documents
      'pdf': 'document', 'doc': 'document', 'docx': 'document', 'txt': 'document', 'rtf': 'document',
      // Archives
      'zip': 'archive', 'rar': 'archive', '7z': 'archive', 'tar': 'archive', 'gz': 'archive',
      // Executables
      'apk': 'executable', 'exe': 'executable', 'deb': 'executable', 'rpm': 'executable',
      // Scripts
      'js': 'script', 'html': 'script', 'css': 'script', 'py': 'script', 'sh': 'script'
    };

    return typeMap[extension] || 'unknown';
  }

  /**
   * Get MIME type from filename
   */
  getMimeTypeFromName(fileName) {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    const mimeMap = {
      'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'gif': 'image/gif',
      'mp4': 'video/mp4', 'avi': 'video/x-msvideo', 'mov': 'video/quicktime',
      'mp3': 'audio/mpeg', 'wav': 'audio/wav', 'ogg': 'audio/ogg',
      'pdf': 'application/pdf', 'doc': 'application/msword', 'txt': 'text/plain',
      'zip': 'application/zip', 'rar': 'application/x-rar', 'apk': 'application/vnd.android.package-archive'
    };

    return mimeMap[extension] || 'application/octet-stream';
  }

  /**
   * Save enumeration checkpoint
   */
  async saveEnumerationCheckpoint(sessionId, type, data) {
    try {
      const checkpoint = {
        sessionId,
        type,
        timestamp: Date.now(),
        data
      };
      
      await AsyncStorage.setItem(
        `enumeration_checkpoint_${sessionId}_${type}`,
        JSON.stringify(checkpoint)
      );
    } catch (error) {
      console.error('Error saving enumeration checkpoint:', error);
    }
  }

  /**
   * Load enumeration checkpoint
   */
  async loadEnumerationCheckpoint(sessionId, type) {
    try {
      const stored = await AsyncStorage.getItem(`enumeration_checkpoint_${sessionId}_${type}`);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error loading enumeration checkpoint:', error);
      return null;
    }
  }

  /**
   * Start comprehensive file enumeration
   */
  async startEnumeration(sessionId, options = {}) {
    try {
      this.isScanning = true;
      this.currentSession = sessionId;

      const {
        includeMediaStore = true,
        includeSAF = false,
        includeAppFiles = true,
        onProgress = () => {},
        onBatch = () => {},
        onComplete = () => {}
      } = options;

      console.log(`🚀 Starting comprehensive file enumeration for session: ${sessionId}`);

      let totalFiles = 0;
      const results = {};

      // 1. Enumerate MediaStore files (photos, videos, audio)
      if (includeMediaStore && this.mediaStoreSupported) {
        console.log('📱 Phase 1: MediaStore enumeration...');
        const mediaResult = await this.enumerateMediaStoreFiles(sessionId, {
          onProgress,
          onBatch
        });
        results.mediaStore = mediaResult;
        totalFiles += mediaResult.totalProcessed;
      }

      // 2. Enumerate SAF documents (user-selected directories)
      if (includeSAF && this.safSupported) {
        console.log('📁 Phase 2: SAF document enumeration...');
        const safResult = await this.enumerateDocumentFiles(sessionId, {
          onProgress,
          onBatch
        });
        results.saf = safResult;
        totalFiles += safResult.totalProcessed;
      }

      // 3. Enumerate app-specific files
      if (includeAppFiles) {
        console.log('📱 Phase 3: App files enumeration...');
        const appResult = await this.enumerateAppFiles(sessionId, {
          onProgress,
          onBatch
        });
        results.app = appResult;
        totalFiles += appResult.totalProcessed;
      }

      console.log(`✅ File enumeration completed: ${totalFiles} total files discovered`);
      
      onComplete({
        sessionId,
        totalFiles,
        results,
        completed: true
      });

      return {
        sessionId,
        totalFiles,
        results,
        completed: true
      };

    } catch (error) {
      console.error('❌ File enumeration failed:', error);
      throw error;
    } finally {
      this.isScanning = false;
      this.currentSession = null;
    }
  }

  /**
   * Stop current enumeration
   */
  stopEnumeration() {
    console.log('⏹️ Stopping file enumeration...');
    this.isScanning = false;
  }

  /**
   * Check if currently enumerating
   */
  isEnumerating() {
    return this.isScanning;
  }

  /**
   * Get current session ID
   */
  getCurrentSession() {
    return this.currentSession;
  }
}

export default FileEnumerationService;
