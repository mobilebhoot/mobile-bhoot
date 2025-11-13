// Cloud Threat Intelligence Service - Real-time Global Threat Synchronization
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

class CloudThreatIntelligenceService {
  constructor() {
    this.threatFeeds = new Map();
    this.globalThreatDatabase = new Map();
    this.localThreatCache = new Map();
    this.syncStatus = {
      lastSync: null,
      isConnected: false,
      pendingUpdates: 0,
      syncErrors: 0
    };
    
    this.config = {
      syncInterval: 300000, // 5 minutes
      batchSize: 100,
      maxRetries: 3,
      offlineMode: false,
      apiEndpoint: 'https://api.pocketshield.com/threat-intelligence/v1'
    };
    
    this.initializeService();
  }

  // Initialize cloud threat intelligence service
  async initializeService() {
    try {
      await this.loadLocalThreatCache();
      await this.loadSyncStatus();
      this.startPeriodicSync();
      
      console.log('Cloud threat intelligence service initialized');
    } catch (error) {
      console.error('Failed to initialize cloud threat intelligence:', error);
    }
  }

  // Real-time threat synchronization with cloud
  async syncWithCloud(force = false) {
    if (this.config.offlineMode && !force) {
      console.log('Offline mode - skipping cloud sync');
      return { success: false, reason: 'offline_mode' };
    }

    try {
      this.syncStatus.isConnected = await this.checkConnectivity();
      
      if (!this.syncStatus.isConnected) {
        throw new Error('No internet connectivity');
      }

      const syncResult = await this.performCloudSync();
      
      this.syncStatus.lastSync = Date.now();
      this.syncStatus.syncErrors = 0;
      await this.saveSyncStatus();
      
      return syncResult;
      
    } catch (error) {
      this.syncStatus.syncErrors++;
      console.error('Cloud sync failed:', error);
      
      return { 
        success: false, 
        error: error.message,
        fallbackToLocal: true 
      };
    }
  }

  // Perform comprehensive cloud synchronization
  async performCloudSync() {
    const syncOperations = [];
    
    // 1. Upload new local threats to cloud
    const localThreats = await this.getNewLocalThreats();
    if (localThreats.length > 0) {
      syncOperations.push(this.uploadLocalThreats(localThreats));
    }
    
    // 2. Download global threat updates
    syncOperations.push(this.downloadGlobalThreats());
    
    // 3. Sync threat feed subscriptions
    syncOperations.push(this.syncThreatFeeds());
    
    // 4. Update regional threat intelligence
    syncOperations.push(this.syncRegionalThreats());
    
    const results = await Promise.allSettled(syncOperations);
    
    return this.processSyncResults(results);
  }

  // Upload locally discovered threats to cloud
  async uploadLocalThreats(localThreats) {
    try {
      const payload = {
        source: 'pocketshield_mobile',
        platform: Platform.OS,
        region: 'india', // Could be dynamic based on user location
        threats: localThreats.map(threat => ({
          type: threat.type,
          indicator: threat.indicator,
          confidence: threat.confidence,
          firstSeen: threat.timestamp,
          context: threat.context,
          riskScore: threat.riskScore
        })),
        timestamp: Date.now()
      };

      const response = await fetch(`${this.config.apiEndpoint}/threats/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': await this.getApiKey(),
          'X-Client-Version': '2.0.0'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const result = await response.json();
      
      // Mark threats as uploaded
      localThreats.forEach(threat => {
        threat.uploadedToCloud = true;
        threat.cloudId = result.threatIds[threat.id];
      });

      console.log(`Uploaded ${localThreats.length} threats to cloud`);
      return { success: true, uploaded: localThreats.length };
      
    } catch (error) {
      console.error('Failed to upload local threats:', error);
      return { success: false, error: error.message };
    }
  }

  // Download global threat updates from cloud
  async downloadGlobalThreats() {
    try {
      const lastSyncTime = this.syncStatus.lastSync || (Date.now() - 24 * 60 * 60 * 1000); // Last 24h
      
      const response = await fetch(`${this.config.apiEndpoint}/threats/global?since=${lastSyncTime}&limit=${this.config.batchSize}`, {
        headers: {
          'X-API-Key': await this.getApiKey(),
          'X-Client-Version': '2.0.0',
          'X-Region': 'india'
        }
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const globalThreats = await response.json();
      
      let processedCount = 0;
      for (const threat of globalThreats.threats) {
        await this.processGlobalThreat(threat);
        processedCount++;
      }

      console.log(`Downloaded and processed ${processedCount} global threats`);
      return { success: true, downloaded: processedCount };
      
    } catch (error) {
      console.error('Failed to download global threats:', error);
      return { success: false, error: error.message };
    }
  }

  // Process and integrate global threat into local database
  async processGlobalThreat(threat) {
    // Validate threat data
    if (!this.validateThreatData(threat)) {
      console.warn('Invalid threat data received:', threat.id);
      return false;
    }

    // Calculate local relevance score
    const relevanceScore = this.calculateLocalRelevance(threat);
    
    // Only store high-relevance threats to save space
    if (relevanceScore >= 50) {
      const localThreat = {
        id: threat.id,
        type: threat.type,
        indicator: threat.indicator,
        confidence: threat.confidence,
        riskScore: threat.riskScore,
        source: 'cloud_global',
        relevanceScore: relevanceScore,
        firstSeen: threat.firstSeen,
        lastSeen: threat.lastSeen,
        regions: threat.regions || [],
        tags: threat.tags || [],
        context: threat.context || {},
        expires: threat.expires || (Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days default
      };

      this.globalThreatDatabase.set(threat.id, localThreat);
      
      // Also add to local cache for quick access
      if (relevanceScore >= 80) {
        this.localThreatCache.set(threat.indicator, localThreat);
      }

      return true;
    }

    return false;
  }

  // Sync specialized threat feeds
  async syncThreatFeeds() {
    const feedSources = [
      { name: 'india_banking_threats', endpoint: '/feeds/india-banking' },
      { name: 'upi_fraud_patterns', endpoint: '/feeds/upi-fraud' },
      { name: 'mobile_malware', endpoint: '/feeds/mobile-malware' },
      { name: 'phishing_campaigns', endpoint: '/feeds/phishing' },
      { name: 'social_engineering', endpoint: '/feeds/social-engineering' }
    ];

    const feedResults = [];

    for (const feed of feedSources) {
      try {
        const feedData = await this.syncThreatFeed(feed);
        feedResults.push({ 
          feed: feed.name, 
          success: true, 
          threats: feedData.length 
        });
        
        this.threatFeeds.set(feed.name, {
          lastSync: Date.now(),
          threatCount: feedData.length,
          data: feedData
        });
        
      } catch (error) {
        console.error(`Failed to sync feed ${feed.name}:`, error);
        feedResults.push({ 
          feed: feed.name, 
          success: false, 
          error: error.message 
        });
      }
    }

    return { success: true, feeds: feedResults };
  }

  // Sync individual threat feed
  async syncThreatFeed(feed) {
    const response = await fetch(`${this.config.apiEndpoint}${feed.endpoint}`, {
      headers: {
        'X-API-Key': await this.getApiKey(),
        'X-Client-Version': '2.0.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Feed sync failed: ${response.status}`);
    }

    const feedData = await response.json();
    return feedData.threats || [];
  }

  // Sync regional threat intelligence (India-specific)
  async syncRegionalThreats() {
    try {
      const response = await fetch(`${this.config.apiEndpoint}/threats/regional/india`, {
        headers: {
          'X-API-Key': await this.getApiKey(),
          'X-Client-Version': '2.0.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Regional sync failed: ${response.status}`);
      }

      const regionalThreats = await response.json();
      
      // Process India-specific threats with higher priority
      let processedCount = 0;
      for (const threat of regionalThreats.threats) {
        threat.relevanceScore = Math.min(100, (threat.relevanceScore || 50) + 25); // Boost Indian threats
        await this.processGlobalThreat(threat);
        processedCount++;
      }

      console.log(`Processed ${processedCount} regional (India) threats`);
      return { success: true, processed: processedCount };
      
    } catch (error) {
      console.error('Failed to sync regional threats:', error);
      return { success: false, error: error.message };
    }
  }

  // Real-time threat lookup with cloud fallback
  async lookupThreat(indicator, type = 'auto') {
    // 1. Check local cache first (fastest)
    const localResult = this.localThreatCache.get(indicator);
    if (localResult && !this.isThreatExpired(localResult)) {
      return { 
        ...localResult, 
        source: 'local_cache',
        responseTime: 'instant'
      };
    }

    // 2. Check global database
    const globalResult = Array.from(this.globalThreatDatabase.values())
      .find(threat => threat.indicator === indicator);
    
    if (globalResult && !this.isThreatExpired(globalResult)) {
      // Move to cache for future quick access
      this.localThreatCache.set(indicator, globalResult);
      return { 
        ...globalResult, 
        source: 'local_global',
        responseTime: 'fast'
      };
    }

    // 3. Real-time cloud lookup for unknown threats
    if (this.syncStatus.isConnected) {
      try {
        const cloudResult = await this.performCloudLookup(indicator, type);
        if (cloudResult.found) {
          // Cache the result
          this.localThreatCache.set(indicator, cloudResult.threat);
          return { 
            ...cloudResult.threat, 
            source: 'cloud_realtime',
            responseTime: 'moderate'
          };
        }
      } catch (error) {
        console.error('Cloud lookup failed:', error);
      }
    }

    // 4. Return clean result if not found anywhere
    return {
      found: false,
      indicator: indicator,
      riskScore: 0,
      confidence: 0,
      source: 'not_found',
      responseTime: 'complete'
    };
  }

  // Perform real-time cloud lookup
  async performCloudLookup(indicator, type) {
    const response = await fetch(`${this.config.apiEndpoint}/threats/lookup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': await this.getApiKey(),
        'X-Client-Version': '2.0.0'
      },
      body: JSON.stringify({
        indicator: indicator,
        type: type,
        timestamp: Date.now()
      })
    });

    if (!response.ok) {
      throw new Error(`Cloud lookup failed: ${response.status}`);
    }

    const result = await response.json();
    return result;
  }

  // Calculate local relevance of global threat
  calculateLocalRelevance(threat) {
    let relevanceScore = 50; // Base relevance

    // Region-based relevance
    if (threat.regions && threat.regions.includes('india')) {
      relevanceScore += 30;
    }
    if (threat.regions && threat.regions.includes('asia')) {
      relevanceScore += 15;
    }

    // Language/culture relevance
    if (threat.tags && threat.tags.some(tag => 
      ['hindi', 'bengali', 'tamil', 'indian', 'bollywood', 'cricket'].includes(tag.toLowerCase())
    )) {
      relevanceScore += 20;
    }

    // Threat type relevance
    if (threat.type === 'banking_phishing' || threat.type === 'upi_fraud') {
      relevanceScore += 25;
    }
    if (threat.type === 'mobile_malware' || threat.type === 'android_threat') {
      relevanceScore += 20;
    }

    // Confidence boost for high-confidence threats
    if (threat.confidence >= 90) {
      relevanceScore += 10;
    }

    return Math.min(100, relevanceScore);
  }

  // Utility functions
  validateThreatData(threat) {
    return threat && 
           threat.id && 
           threat.indicator && 
           threat.type && 
           typeof threat.confidence === 'number' &&
           typeof threat.riskScore === 'number';
  }

  isThreatExpired(threat) {
    return threat.expires && Date.now() > threat.expires;
  }

  async checkConnectivity() {
    try {
      const response = await fetch(`${this.config.apiEndpoint}/health`, {
        method: 'HEAD',
        timeout: 5000
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async getApiKey() {
    // In production, this would be securely stored
    return await AsyncStorage.getItem('api_key') || 'demo_api_key';
  }

  getNewLocalThreats() {
    // Get locally discovered threats that haven't been uploaded
    return Array.from(this.localThreatCache.values())
      .filter(threat => !threat.uploadedToCloud && threat.source === 'local_discovery')
      .slice(0, this.config.batchSize);
  }

  processSyncResults(results) {
    const summary = {
      success: true,
      operations: results.length,
      successful: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
      details: {}
    };

    results.forEach((result, index) => {
      const operation = ['upload', 'download', 'feeds', 'regional'][index];
      if (result.status === 'fulfilled') {
        summary.details[operation] = result.value;
      } else {
        summary.details[operation] = { error: result.reason.message };
        summary.success = false;
      }
    });

    return summary;
  }

  startPeriodicSync() {
    setInterval(async () => {
      if (!this.config.offlineMode) {
        await this.syncWithCloud();
      }
    }, this.config.syncInterval);
  }

  // Get sync status and statistics
  getSyncStatus() {
    return {
      ...this.syncStatus,
      globalThreats: this.globalThreatDatabase.size,
      localCache: this.localThreatCache.size,
      threatFeeds: this.threatFeeds.size,
      config: this.config
    };
  }

  // Storage functions
  async loadLocalThreatCache() {
    try {
      const saved = await AsyncStorage.getItem('local_threat_cache');
      if (saved) {
        const cache = JSON.parse(saved);
        this.localThreatCache = new Map(cache);
      }
    } catch (error) {
      console.error('Failed to load local threat cache:', error);
    }
  }

  async saveLocalThreatCache() {
    try {
      await AsyncStorage.setItem(
        'local_threat_cache',
        JSON.stringify([...this.localThreatCache])
      );
    } catch (error) {
      console.error('Failed to save local threat cache:', error);
    }
  }

  async loadSyncStatus() {
    try {
      const saved = await AsyncStorage.getItem('cloud_sync_status');
      if (saved) {
        this.syncStatus = { ...this.syncStatus, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  }

  async saveSyncStatus() {
    try {
      await AsyncStorage.setItem('cloud_sync_status', JSON.stringify(this.syncStatus));
    } catch (error) {
      console.error('Failed to save sync status:', error);
    }
  }

  // Configuration management
  updateConfiguration(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  enableOfflineMode() {
    this.config.offlineMode = true;
    console.log('Cloud threat intelligence switched to offline mode');
  }

  disableOfflineMode() {
    this.config.offlineMode = false;
    this.syncWithCloud(true); // Force immediate sync
    console.log('Cloud threat intelligence switched to online mode');
  }

  // Clear all data
  async clearAllData() {
    this.threatFeeds.clear();
    this.globalThreatDatabase.clear();
    this.localThreatCache.clear();
    this.syncStatus = {
      lastSync: null,
      isConnected: false,
      pendingUpdates: 0,
      syncErrors: 0
    };
    
    await Promise.all([
      AsyncStorage.removeItem('local_threat_cache'),
      AsyncStorage.removeItem('cloud_sync_status')
    ]);
  }
}

export default new CloudThreatIntelligenceService();
