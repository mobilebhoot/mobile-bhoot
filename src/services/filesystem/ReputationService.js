import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * ReputationService
 * Handles file reputation lookup, threat intelligence integration,
 * and maintains a local reputation cache
 */
class ReputationService {
  constructor() {
    this.cache = new Map();
    this.isInitialized = false;
    this.apiEndpoints = {
      // In production, these would be real threat intelligence APIs
      virustotal: 'https://www.virustotal.com/api/v3/files/',
      hybridanalysis: 'https://www.hybrid-analysis.com/api/v2/search/hash',
      malwarebazaar: 'https://mb-api.abuse.ch/api/v1/',
      local: null // Local threat intelligence server
    };
    this.stats = {
      cacheHits: 0,
      cacheMisses: 0,
      apiCalls: 0,
      threatsDetected: 0,
      lastUpdate: null
    };
    this.rateLimits = {
      virustotal: { requests: 4, per: 60000 }, // 4 requests per minute for free tier
      hybridanalysis: { requests: 100, per: 60000 }
    };
    this.requestCounts = new Map();
  }

  /**
   * Initialize the reputation service
   */
  async initialize() {
    try {
      console.log('🛡️ Initializing Reputation Service...');
      
      // Load cached reputation data
      await this.loadCacheFromStorage();
      
      // Initialize known threat databases
      await this.loadKnownThreats();
      
      this.isInitialized = true;
      console.log(`✅ Reputation Service initialized with ${this.cache.size} cached entries`);
      
      return {
        initialized: true,
        cacheSize: this.cache.size,
        supportedApis: Object.keys(this.apiEndpoints)
      };
    } catch (error) {
      console.error('❌ Failed to initialize reputation service:', error);
      throw error;
    }
  }

  /**
   * Load cached reputation data from AsyncStorage
   */
  async loadCacheFromStorage() {
    try {
      const cachedData = await AsyncStorage.getItem('reputation_cache');
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        for (const [hash, reputation] of Object.entries(parsed)) {
          // Check if cached data is still valid
          if (this.isCacheValid(reputation)) {
            this.cache.set(hash, reputation);
          }
        }
        console.log(`📦 Loaded ${this.cache.size} reputation entries from cache`);
      }
    } catch (error) {
      console.error('Error loading reputation cache:', error);
    }
  }

  /**
   * Load known threat databases
   */
  async loadKnownThreats() {
    // Load known malicious file hashes (SHA-256)
    const knownMaliciousHashes = [
      // Android malware samples (examples - in production use real threat intelligence)
      {
        hash: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2',
        threat: 'Android.Trojan.FakeBank',
        severity: 'critical',
        firstSeen: Date.now() - 86400000,
        sources: ['internal']
      },
      {
        hash: 'b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3',
        threat: 'Android.Adware.Aggressive',
        severity: 'medium',
        firstSeen: Date.now() - 172800000,
        sources: ['internal']
      },
      {
        hash: 'c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3h4',
        threat: 'Android.PUA.SpyApp',
        severity: 'high',
        firstSeen: Date.now() - 259200000,
        sources: ['internal']
      }
    ];

    // Add known threats to cache
    for (const threat of knownMaliciousHashes) {
      this.cache.set(threat.hash, {
        hash: threat.hash,
        reputationScore: 0, // 0 = malicious
        threatNames: [threat.threat],
        severity: threat.severity,
        firstSeen: threat.firstSeen,
        lastUpdated: Date.now(),
        sources: threat.sources,
        scanResults: {
          malicious: 1,
          suspicious: 0,
          clean: 0,
          total: 1
        },
        cached: true,
        source: 'known_threats'
      });
    }

    console.log(`🦠 Loaded ${knownMaliciousHashes.length} known threat signatures`);
  }

  /**
   * Check if cached reputation data is still valid
   */
  isCacheValid(reputation) {
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    return reputation.lastUpdated && (Date.now() - reputation.lastUpdated) < maxAge;
  }

  /**
   * Look up file reputation by hash
   */
  async lookupReputation(fileHash, options = {}) {
    const {
      forceRefresh = false,
      sources = ['cache', 'local', 'virustotal'],
      timeout = 30000
    } = options;

    try {
      console.log(`🔍 Looking up reputation for hash: ${fileHash.substring(0, 16)}...`);

      // Normalize hash to lowercase
      const normalizedHash = fileHash.toLowerCase();

      // Check cache first (unless force refresh)
      if (!forceRefresh && this.cache.has(normalizedHash)) {
        const cached = this.cache.get(normalizedHash);
        if (this.isCacheValid(cached)) {
          this.stats.cacheHits++;
          console.log(`📦 Cache hit: ${cached.reputationScore}/100 score`);
          return {
            ...cached,
            source: 'cache',
            fromCache: true
          };
        }
      }

      this.stats.cacheMisses++;

      // Try different reputation sources
      let reputation = null;
      
      for (const source of sources) {
        try {
          switch (source) {
            case 'cache':
              // Already checked above
              break;
              
            case 'local':
              reputation = await this.queryLocalDatabase(normalizedHash);
              break;
              
            case 'virustotal':
              reputation = await this.queryVirusTotal(normalizedHash, timeout);
              break;
              
            case 'hybridanalysis':
              reputation = await this.queryHybridAnalysis(normalizedHash, timeout);
              break;
              
            case 'malwarebazaar':
              reputation = await this.queryMalwareBazaar(normalizedHash, timeout);
              break;
          }

          if (reputation) {
            console.log(`✅ Reputation found from ${source}: ${reputation.reputationScore}/100`);
            break;
          }
        } catch (error) {
          console.error(`Error querying ${source}:`, error);
        }
      }

      // If no reputation found, create default clean reputation
      if (!reputation) {
        reputation = this.createDefaultReputation(normalizedHash);
        console.log('📝 Created default clean reputation');
      }

      // Cache the result
      await this.cacheReputation(normalizedHash, reputation);

      return reputation;

    } catch (error) {
      console.error(`❌ Reputation lookup failed for ${fileHash}:`, error);
      return this.createDefaultReputation(fileHash, error.message);
    }
  }

  /**
   * Query local threat database (simulated)
   */
  async queryLocalDatabase(hash) {
    try {
      // Simulate local database query
      console.log('🏠 Querying local threat database...');
      
      // For demo, randomly return some results
      if (Math.random() < 0.1) { // 10% chance of finding something
        return {
          hash,
          reputationScore: Math.floor(Math.random() * 30), // 0-30 (suspicious)
          threatNames: ['LocalThreat.Suspicious'],
          severity: 'medium',
          firstSeen: Date.now() - Math.random() * 86400000 * 30,
          lastUpdated: Date.now(),
          sources: ['local'],
          scanResults: {
            malicious: 1,
            suspicious: 2,
            clean: 5,
            total: 8
          },
          source: 'local'
        };
      }

      return null;
    } catch (error) {
      console.error('Error querying local database:', error);
      return null;
    }
  }

  /**
   * Query VirusTotal API (simulated for demo)
   */
  async queryVirusTotal(hash, timeout) {
    try {
      console.log('🦠 Querying VirusTotal API...');

      // Check rate limits
      if (!this.checkRateLimit('virustotal')) {
        console.warn('⚠️ VirusTotal rate limit exceeded');
        return null;
      }

      this.stats.apiCalls++;
      
      // In production, this would be a real API call
      // For demo, simulate API response
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

      // Simulate different response scenarios
      const scenario = Math.random();
      
      if (scenario < 0.05) { // 5% malicious
        this.stats.threatsDetected++;
        return {
          hash,
          reputationScore: Math.floor(Math.random() * 20), // 0-20 (malicious)
          threatNames: ['Trojan.Android.FakeBanker', 'Adware.Android.Aggressive'],
          severity: 'high',
          firstSeen: Date.now() - Math.random() * 86400000 * 90,
          lastUpdated: Date.now(),
          sources: ['virustotal'],
          scanResults: {
            malicious: Math.floor(Math.random() * 15) + 5,
            suspicious: Math.floor(Math.random() * 5),
            clean: Math.floor(Math.random() * 20) + 40,
            total: 70
          },
          vendor_results: {
            'Avast': 'Malicious',
            'BitDefender': 'Trojan.Android.FakeBanker',
            'Kaspersky': 'HEUR:Trojan.AndroidOS.Agent',
            'McAfee': 'Android/FakeBanker'
          },
          source: 'virustotal'
        };
      } else if (scenario < 0.15) { // 10% suspicious
        return {
          hash,
          reputationScore: Math.floor(Math.random() * 30) + 30, // 30-60 (suspicious)
          threatNames: ['PUA.Android.Adware'],
          severity: 'medium',
          firstSeen: Date.now() - Math.random() * 86400000 * 60,
          lastUpdated: Date.now(),
          sources: ['virustotal'],
          scanResults: {
            malicious: 0,
            suspicious: Math.floor(Math.random() * 8) + 2,
            clean: Math.floor(Math.random() * 20) + 60,
            total: 70
          },
          source: 'virustotal'
        };
      } else { // 85% clean or unknown
        return {
          hash,
          reputationScore: Math.floor(Math.random() * 20) + 80, // 80-100 (clean)
          threatNames: [],
          severity: 'clean',
          firstSeen: Date.now() - Math.random() * 86400000 * 30,
          lastUpdated: Date.now(),
          sources: ['virustotal'],
          scanResults: {
            malicious: 0,
            suspicious: 0,
            clean: Math.floor(Math.random() * 10) + 65,
            total: 70
          },
          source: 'virustotal'
        };
      }

    } catch (error) {
      console.error('Error querying VirusTotal:', error);
      return null;
    }
  }

  /**
   * Query Hybrid Analysis API (simulated)
   */
  async queryHybridAnalysis(hash, timeout) {
    try {
      console.log('🔬 Querying Hybrid Analysis...');

      if (!this.checkRateLimit('hybridanalysis')) {
        console.warn('⚠️ Hybrid Analysis rate limit exceeded');
        return null;
      }

      this.stats.apiCalls++;

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));

      // Simulate finding some results (lower probability than VirusTotal)
      if (Math.random() < 0.08) {
        return {
          hash,
          reputationScore: Math.floor(Math.random() * 40), // 0-40 (suspicious to malicious)
          threatNames: ['Generic.Malware.Android'],
          severity: 'medium',
          firstSeen: Date.now() - Math.random() * 86400000 * 60,
          lastUpdated: Date.now(),
          sources: ['hybridanalysis'],
          scanResults: {
            malicious: 1,
            suspicious: 3,
            clean: 1,
            total: 5
          },
          behavioral_analysis: {
            network_activity: true,
            file_modifications: true,
            registry_changes: false,
            suspicious_apis: ['android.telephony.SmsManager', 'android.location.LocationManager']
          },
          source: 'hybridanalysis'
        };
      }

      return null;
    } catch (error) {
      console.error('Error querying Hybrid Analysis:', error);
      return null;
    }
  }

  /**
   * Query MalwareBazaar API (simulated)
   */
  async queryMalwareBazaar(hash, timeout) {
    try {
      console.log('🗄️ Querying MalwareBazaar...');
      
      this.stats.apiCalls++;

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 600));

      // Lower probability of finding results (specialized database)
      if (Math.random() < 0.03) {
        this.stats.threatsDetected++;
        return {
          hash,
          reputationScore: 0, // Definitive malware
          threatNames: ['Android.Banker.Cerberus', 'Trojan.AndroidOS.Boogr'],
          severity: 'critical',
          firstSeen: Date.now() - Math.random() * 86400000 * 180,
          lastUpdated: Date.now(),
          sources: ['malwarebazaar'],
          family: 'Cerberus',
          tags: ['banker', 'stealer', 'android'],
          source: 'malwarebazaar'
        };
      }

      return null;
    } catch (error) {
      console.error('Error querying MalwareBazaar:', error);
      return null;
    }
  }

  /**
   * Check API rate limits
   */
  checkRateLimit(api) {
    const now = Date.now();
    const limit = this.rateLimits[api];
    
    if (!limit) return true;

    if (!this.requestCounts.has(api)) {
      this.requestCounts.set(api, []);
    }

    const requests = this.requestCounts.get(api);
    
    // Remove old requests outside the time window
    const cutoff = now - limit.per;
    while (requests.length > 0 && requests[0] < cutoff) {
      requests.shift();
    }

    // Check if we can make another request
    if (requests.length >= limit.requests) {
      return false;
    }

    // Record this request
    requests.push(now);
    return true;
  }

  /**
   * Create default reputation for unknown files
   */
  createDefaultReputation(hash, error = null) {
    return {
      hash,
      reputationScore: 90, // Default to clean
      threatNames: [],
      severity: 'clean',
      firstSeen: Date.now(),
      lastUpdated: Date.now(),
      sources: ['default'],
      scanResults: {
        malicious: 0,
        suspicious: 0,
        clean: 1,
        total: 1
      },
      source: 'default',
      isDefault: true,
      error
    };
  }

  /**
   * Cache reputation data
   */
  async cacheReputation(hash, reputation) {
    try {
      // Add to memory cache
      this.cache.set(hash, reputation);

      // Persist to storage (limit cache size)
      if (this.cache.size % 100 === 0) { // Save every 100 entries
        await this.saveCacheToStorage();
      }
    } catch (error) {
      console.error('Error caching reputation:', error);
    }
  }

  /**
   * Save cache to AsyncStorage
   */
  async saveCacheToStorage() {
    try {
      const cacheObject = {};
      let count = 0;
      
      // Save only the most recent 1000 entries
      const entries = Array.from(this.cache.entries())
        .sort(([,a], [,b]) => b.lastUpdated - a.lastUpdated)
        .slice(0, 1000);

      for (const [hash, reputation] of entries) {
        cacheObject[hash] = reputation;
        count++;
      }

      await AsyncStorage.setItem('reputation_cache', JSON.stringify(cacheObject));
      console.log(`💾 Saved ${count} reputation entries to cache`);
    } catch (error) {
      console.error('Error saving reputation cache:', error);
    }
  }

  /**
   * Batch lookup multiple file reputations
   */
  async batchLookupReputations(fileHashes, options = {}) {
    const {
      maxConcurrent = 3,
      onProgress = () => {},
      onComplete = () => {}
    } = options;

    try {
      console.log(`🔍 Batch reputation lookup for ${fileHashes.length} files...`);

      const results = [];
      let processed = 0;

      // Process in batches to respect rate limits
      for (let i = 0; i < fileHashes.length; i += maxConcurrent) {
        const batch = fileHashes.slice(i, i + maxConcurrent);
        
        const batchPromises = batch.map(async (hashInfo) => {
          try {
            const reputation = await this.lookupReputation(hashInfo.hash, options);
            
            const result = {
              ...hashInfo,
              reputation,
              processedAt: Date.now()
            };

            onComplete(result);
            return result;
          } catch (error) {
            console.error(`Error looking up reputation for ${hashInfo.hash}:`, error);
            return {
              ...hashInfo,
              reputation: this.createDefaultReputation(hashInfo.hash, error.message),
              processedAt: Date.now()
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        processed += batchResults.length;

        onProgress({
          processed,
          total: fileHashes.length,
          currentBatch: Math.floor(i / maxConcurrent) + 1,
          totalBatches: Math.ceil(fileHashes.length / maxConcurrent)
        });

        // Add delay between batches to respect rate limits
        if (i + maxConcurrent < fileHashes.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      const threats = results.filter(r => r.reputation.reputationScore < 50).length;
      console.log(`✅ Batch reputation lookup completed: ${threats} threats found`);

      return {
        results,
        summary: {
          total: fileHashes.length,
          threats,
          clean: fileHashes.length - threats,
          cached: results.filter(r => r.reputation.fromCache).length
        }
      };

    } catch (error) {
      console.error('❌ Batch reputation lookup failed:', error);
      throw error;
    }
  }

  /**
   * Get reputation statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      cacheSize: this.cache.size,
      hitRate: this.stats.cacheHits + this.stats.cacheMisses > 0 ? 
        Math.round((this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses)) * 100) : 0,
      isInitialized: this.isInitialized
    };
  }

  /**
   * Clear reputation cache
   */
  async clearCache() {
    try {
      this.cache.clear();
      await AsyncStorage.removeItem('reputation_cache');
      console.log('🧹 Reputation cache cleared');
    } catch (error) {
      console.error('Error clearing reputation cache:', error);
    }
  }

  /**
   * Update threat intelligence feeds
   */
  async updateThreatFeeds() {
    try {
      console.log('🔄 Updating threat intelligence feeds...');
      
      // In production, this would fetch from real threat intelligence sources
      await this.loadKnownThreats();
      
      this.stats.lastUpdate = Date.now();
      console.log('✅ Threat intelligence feeds updated');
    } catch (error) {
      console.error('Error updating threat feeds:', error);
    }
  }
}

export default new ReputationService();
