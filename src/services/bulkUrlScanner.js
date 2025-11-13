// Enhanced Bulk URL Scanner Service with Advanced Scaling
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

class BulkURLScannerService {
  constructor() {
    this.scanQueue = [];
    this.isProcessing = false;
    this.concurrentScans = 5; // Process 5 URLs simultaneously
    this.batchSize = 10; // Process in batches of 10
    this.scanResults = new Map();
    this.scanHistory = [];
    this.threatDatabase = null;
    this.scanStats = {
      totalScanned: 0,
      maliciousFound: 0,
      suspiciousFound: 0,
      cleanUrls: 0,
      averageScanTime: 0,
      dailyStats: new Map(),
    };
    
    this.initializeEnhancedDatabase();
  }

  // Initialize enhanced threat database with Indian-specific threats
  async initializeEnhancedDatabase() {
    try {
      // First, initialize with comprehensive threat patterns
      this.loadEnhancedThreats();
      
      // Then try to load cached database (merge with defaults)
      const cachedDatabase = await AsyncStorage.getItem('enhanced_threat_db');
      if (cachedDatabase) {
        try {
          const cached = JSON.parse(cachedDatabase);
          // Merge cached data with defaults, ensuring all required properties exist
          this.threatDatabase = {
            ...this.threatDatabase, // defaults from loadEnhancedThreats
            ...cached, // cached data
            // Ensure critical arrays exist
            globalMalicious: cached.globalMalicious || this.threatDatabase.globalMalicious || [],
            phishingPatterns: cached.phishingPatterns || this.threatDatabase.phishingPatterns || []
          };
        } catch (parseError) {
          console.error('Failed to parse cached threat database, using defaults:', parseError);
        }
      }
      
      // Update from multiple threat intelligence sources
      await this.updateFromMultipleSources();
      
      console.log('✅ Enhanced threat database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize enhanced database:', error);
      // Fallback to basic initialization
      this.loadEnhancedThreats();
    }
  }

  // Load comprehensive threat patterns including Indian-specific threats
  loadEnhancedThreats() {
    this.threatDatabase = {
      // Indian financial phishing domains
      indianPhishing: [
        'fake-sbi.in', 'phishing-hdfc.org', 'scam-icici.net',
        'fake-phonepe.co', 'scam-paytm.info', 'fake-upi.biz',
        'phishing-indianbank.tk', 'fake-pnb.ml', 'scam-canara.ga'
      ],
      
      // Global malicious domains (comprehensive list)
      globalMalicious: [
        'malware-download.co', 'virus-site.net', 'trojan-host.org',
        'ransomware-payload.com', 'cryptominer-js.tk', 'botnet-c2.ml',
        'phishing-microsoft.ga', 'fake-google.cf', 'scam-amazon.info'
      ],
      
      // Shortened URL services (for extra verification)
      shorteners: [
        'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'short.link',
        'cutt.ly', 'rb.gy', 'is.gd', 'v.gd', 'tiny.cc', 'lnkd.in'
      ],
      
      // Suspicious patterns (enhanced)
      patterns: [
        // IP address URLs
        /^https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/,
        
        // Suspicious TLDs
        /\.(tk|ml|ga|cf|pw|top|click|download|link|zip|exe)$/i,
        
        // Typosquatting patterns
        /g[o0][o0]g[l1]e\.[^m]/i, // fake google
        /[a-z]*p[a4]yp[a4][l1]\.[^m]/i, // fake paypal
        /[a-z]*[a4]m[a4]z[o0]n\.[^m]/i, // fake amazon
        
        // Indian bank typosquatting
        /[a-z]*sbi\.[^n]/i, // fake SBI (not sbi.co.in)
        /[a-z]*hdfc\.[^m]/i, // fake HDFC (not hdfcbank.com)
        /[a-z]*icici\.[^m]/i, // fake ICICI (not icicibank.com)
        
        // Phishing keywords in URLs
        /verify.*account|update.*payment|security.*alert/i,
        /urgent.*action|suspended.*account|unusual.*activity/i,
        /claim.*prize|lottery.*winner|free.*money/i
      ],
      
      // High-risk keywords
      riskKeywords: [
        'download-now', 'click-here', 'verify-account', 'update-payment',
        'security-alert', 'account-suspended', 'urgent-action', 'limited-time',
        'free-download', 'virus-scan', 'speed-up', 'clean-pc',
        'lottery-winner', 'claim-prize', 'inheritance-claim', 'tax-refund'
      ],
      
      // Cryptocurrency scam patterns
      cryptoScams: [
        /bitcoin.*investment|crypto.*profit|guaranteed.*return/i,
        /elon.*musk.*giveaway|tesla.*bitcoin|spacex.*crypto/i,
        /double.*bitcoin|multiply.*crypto|instant.*profit/i
      ],
      
      // Phishing patterns for threat intelligence updates
      phishingPatterns: [
        /fake.*bank.*login|phishing.*site|scam.*verification/i,
        /urgent.*verify.*account|suspended.*security|update.*payment/i,
        /click.*here.*now|limited.*time.*offer|act.*immediately/i,
        /security.*breach|unauthorized.*access|account.*compromised/i,
        /winner.*selected|claim.*prize|lottery.*notification/i
      ]
    };
  }

  // Update threat database from multiple intelligence sources (mock implementation)
  async updateFromMultipleSources() {
    try {
      console.log('🔄 Updating threat intelligence from multiple sources...');
      
      // Mock implementation - in production, this would fetch from real threat intelligence APIs
      const mockUpdates = {
        newMaliciousDomains: ['new-scam-domain.com', 'phishing-site-2024.org'],
        newPhishingPatterns: [/fake.*bank.*login/i, /urgent.*verify.*account/i],
        newSuspiciousKeywords: ['suspicious-new-keyword', 'scam-phrase-2024']
      };

      // Update threat database with new intelligence
      if (this.threatDatabase) {
        // Ensure threatDatabase has required properties initialized
        if (!this.threatDatabase.globalMalicious) {
          this.threatDatabase.globalMalicious = [];
        }
        if (!this.threatDatabase.phishingPatterns) {
          this.threatDatabase.phishingPatterns = [];
        }

        // Add new malicious domains
        if (mockUpdates.newMaliciousDomains && Array.isArray(mockUpdates.newMaliciousDomains)) {
          this.threatDatabase.globalMalicious = [
            ...this.threatDatabase.globalMalicious,
            ...mockUpdates.newMaliciousDomains
          ];
        }

        // Add new phishing patterns
        if (mockUpdates.newPhishingPatterns && Array.isArray(mockUpdates.newPhishingPatterns)) {
          this.threatDatabase.phishingPatterns = [
            ...this.threatDatabase.phishingPatterns,
            ...mockUpdates.newPhishingPatterns
          ];
        }

        // Cache updated database
        try {
          await AsyncStorage.setItem('enhanced_threat_db', JSON.stringify(this.threatDatabase));
          console.log('✅ Threat database updated successfully');
        } catch (storageError) {
          console.error('❌ Failed to cache threat database:', storageError);
        }
      } else {
        console.log('⚠️ Threat database not initialized, skipping update');
      }
      
    } catch (error) {
      console.error('❌ Failed to update threat intelligence:', error);
      // Don't throw error to prevent app crashes
    }
  }

  // Bulk scan multiple URLs with performance optimization
  async bulkScan(urls, options = {}) {
    const {
      maxConcurrent = this.concurrentScans,
      batchSize = this.batchSize,
      onProgress = () => {},
      onBatchComplete = () => {},
      priority = 'normal'
    } = options;

    // Validate and clean URLs
    const validUrls = this.preprocessUrls(urls);
    
    if (validUrls.length === 0) {
      return { success: false, error: 'No valid URLs to scan' };
    }

    // Add to scan queue with metadata
    const scanJob = {
      id: await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        JSON.stringify(validUrls) + Date.now()
      ),
      urls: validUrls,
      options: { maxConcurrent, batchSize, onProgress, onBatchComplete },
      priority,
      startTime: Date.now(),
      status: 'queued'
    };

    this.scanQueue.push(scanJob);
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }

    return {
      success: true,
      jobId: scanJob.id,
      totalUrls: validUrls.length,
      estimatedTime: this.estimateScanTime(validUrls.length)
    };
  }

  // Preprocess and validate URLs
  preprocessUrls(urls) {
    return urls
      .filter(url => url && typeof url === 'string')
      .map(url => url.trim())
      .filter(url => url.length > 0)
      .map(url => {
        // Add protocol if missing
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          return `https://${url}`;
        }
        return url;
      })
      .filter(url => this.isValidUrl(url))
      .filter((url, index, arr) => arr.indexOf(url) === index); // Remove duplicates
  }

  // Validate URL format
  isValidUrl(urlString) {
    try {
      const url = new URL(urlString);
      return ['http:', 'https:'].includes(url.protocol);
    } catch {
      return false;
    }
  }

  // Process scan queue with concurrency control
  async processQueue() {
    if (this.isProcessing || this.scanQueue.length === 0) return;

    this.isProcessing = true;
    
    try {
      while (this.scanQueue.length > 0) {
        // Get highest priority job
        this.scanQueue.sort((a, b) => {
          const priorities = { high: 3, normal: 2, low: 1 };
          return priorities[b.priority] - priorities[a.priority];
        });
        
        const job = this.scanQueue.shift();
        await this.processScanJob(job);
      }
    } catch (error) {
      console.error('Error processing scan queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Process individual scan job
  async processScanJob(job) {
    const { urls, options } = job;
    const { maxConcurrent, batchSize, onProgress, onBatchComplete } = options;
    
    job.status = 'processing';
    const results = [];
    
    // Process URLs in batches
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      const batchResults = await this.processBatch(batch, maxConcurrent);
      
      results.push(...batchResults);
      
      // Report progress
      const progress = {
        completed: results.length,
        total: urls.length,
        percentage: Math.round((results.length / urls.length) * 100)
      };
      
      onProgress(progress);
      onBatchComplete(batchResults);
    }
    
    job.status = 'completed';
    job.results = results;
    job.endTime = Date.now();
    
    // Update statistics
    this.updateScanStats(results, job.endTime - job.startTime);
    
    // Save to history
    await this.saveScanToHistory(job);
    
    return results;
  }

  // Process batch of URLs concurrently
  async processBatch(urls, maxConcurrent) {
    const chunks = this.chunkArray(urls, maxConcurrent);
    const results = [];
    
    for (const chunk of chunks) {
      const promises = chunk.map(url => this.scanSingleUrl(url));
      const chunkResults = await Promise.all(promises);
      results.push(...chunkResults);
    }
    
    return results;
  }

  // Enhanced single URL scanning with comprehensive analysis
  async scanSingleUrl(url) {
    const startTime = Date.now();
    
    try {
      const result = {
        url,
        timestamp: new Date().toISOString(),
        scanTime: 0,
        status: 'safe',
        riskScore: 0,
        threats: [],
        details: {},
        recommendations: []
      };

      // 1. Domain analysis
      const domainAnalysis = this.analyzeDomain(url);
      result.riskScore += domainAnalysis.riskScore;
      result.threats.push(...domainAnalysis.threats);

      // 2. Pattern matching
      const patternAnalysis = this.analyzePatterns(url);
      result.riskScore += patternAnalysis.riskScore;
      result.threats.push(...patternAnalysis.threats);

      // 3. Content analysis (simulated - in production, fetch and analyze)
      const contentAnalysis = await this.analyzeContent(url);
      result.riskScore += contentAnalysis.riskScore;
      result.threats.push(...contentAnalysis.threats);

      // 4. Reputation check (simulated threat intelligence lookup)
      const reputationAnalysis = await this.checkReputation(url);
      result.riskScore += reputationAnalysis.riskScore;
      result.threats.push(...reputationAnalysis.threats);

      // 5. Social engineering detection
      const socialEngAnalysis = this.detectSocialEngineering(url);
      result.riskScore += socialEngAnalysis.riskScore;
      result.threats.push(...socialEngAnalysis.threats);

      // Determine final status
      if (result.riskScore >= 70) {
        result.status = 'malicious';
        result.recommendations.push('🚫 Do not visit this link', '⚠️ Report as phishing', '🔒 Scan your device');
      } else if (result.riskScore >= 40) {
        result.status = 'suspicious';
        result.recommendations.push('⚠️ Proceed with caution', '🔍 Verify sender', '🛡️ Use VPN if necessary');
      } else if (result.riskScore >= 20) {
        result.status = 'warning';
        result.recommendations.push('💡 Be cautious', '✅ Verify legitimacy');
      } else {
        result.status = 'safe';
        result.recommendations.push('✅ Link appears safe');
      }

      result.scanTime = Date.now() - startTime;
      result.details = {
        domainAge: this.estimateDomainAge(url),
        isShortened: this.isShortened(url),
        hasHttps: url.startsWith('https://'),
        ipAddress: domainAnalysis.isIpAddress,
        suspiciousTld: domainAnalysis.suspiciousTld
      };

      // Cache result for performance
      this.scanResults.set(url, result);
      
      return result;
      
    } catch (error) {
      return {
        url,
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
        scanTime: Date.now() - startTime
      };
    }
  }

  // Analyze domain for threats
  analyzeDomain(url) {
    let riskScore = 0;
    const threats = [];
    
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.toLowerCase();
      
      // Check against malicious domain databases
      if (this.threatDatabase.indianPhishing.includes(domain)) {
        riskScore += 80;
        threats.push('Domain flagged as Indian financial phishing site');
      }
      
      if (this.threatDatabase.globalMalicious.includes(domain)) {
        riskScore += 90;
        threats.push('Domain flagged as malicious');
      }
      
      // IP address check
      const isIpAddress = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(domain);
      if (isIpAddress) {
        riskScore += 30;
        threats.push('Using IP address instead of domain name');
      }
      
      // Suspicious TLD check
      const suspiciousTlds = ['.tk', '.ml', '.ga', '.cf', '.pw', '.top'];
      const hasSuspiciousTld = suspiciousTlds.some(tld => domain.endsWith(tld));
      if (hasSuspiciousTld) {
        riskScore += 25;
        threats.push('Using suspicious top-level domain');
      }
      
      // Length and character analysis
      if (domain.length > 50) {
        riskScore += 10;
        threats.push('Unusually long domain name');
      }
      
      if (domain.split('.').length > 4) {
        riskScore += 15;
        threats.push('Excessive subdomains');
      }
      
      return { riskScore, threats, isIpAddress, suspiciousTld: hasSuspiciousTld };
      
    } catch (error) {
      return { riskScore: 50, threats: ['Invalid URL format'], isIpAddress: false };
    }
  }

  // Analyze URL patterns
  analyzePatterns(url) {
    let riskScore = 0;
    const threats = [];
    
    // Check against all threat patterns
    this.threatDatabase.patterns.forEach(pattern => {
      if (pattern.test(url)) {
        riskScore += 20;
        threats.push(`Matches suspicious pattern: ${pattern.source}`);
      }
    });
    
    // Check cryptocurrency scam patterns
    this.threatDatabase.cryptoScams.forEach(pattern => {
      if (pattern.test(url)) {
        riskScore += 40;
        threats.push('Potential cryptocurrency scam');
      }
    });
    
    // Check for keyword stuffing
    const keywordCount = this.threatDatabase.riskKeywords.filter(keyword => 
      url.toLowerCase().includes(keyword)
    ).length;
    
    if (keywordCount > 0) {
      riskScore += keywordCount * 10;
      threats.push(`Contains ${keywordCount} high-risk keywords`);
    }
    
    return { riskScore, threats };
  }

  // Simulate content analysis (in production, fetch and analyze page content)
  async analyzeContent(url) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    let riskScore = 0;
    const threats = [];
    
    // Simulate content-based risk assessment
    const randomFactor = Math.random();
    
    if (randomFactor < 0.1) { // 10% chance of suspicious content
      riskScore += 30;
      threats.push('Suspicious content detected');
    }
    
    if (url.includes('download') || url.includes('install')) {
      riskScore += 15;
      threats.push('May attempt to download files');
    }
    
    return { riskScore, threats };
  }

  // Check domain reputation (simulate threat intelligence lookup)
  async checkReputation(url) {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 150));
    
    let riskScore = 0;
    const threats = [];
    
    try {
      const domain = new URL(url).hostname;
      
      // Simulate reputation database lookup
      const reputationScore = Math.random() * 100;
      
      if (reputationScore < 20) {
        riskScore += 60;
        threats.push('Poor domain reputation');
      } else if (reputationScore < 40) {
        riskScore += 30;
        threats.push('Questionable domain reputation');
      }
      
    } catch (error) {
      riskScore += 10;
      threats.push('Unable to verify domain reputation');
    }
    
    return { riskScore, threats };
  }

  // Detect social engineering tactics
  detectSocialEngineering(url) {
    let riskScore = 0;
    const threats = [];
    
    const socialEngPatterns = [
      /urgent|immediate|expires|limited.*time|act.*now/i,
      /click.*here|download.*now|install.*now|update.*now/i,
      /verify.*account|confirm.*identity|update.*payment/i,
      /security.*alert|account.*suspended|unusual.*activity/i,
      /free.*money|lottery.*winner|claim.*prize|inheritance/i
    ];
    
    socialEngPatterns.forEach(pattern => {
      if (pattern.test(url)) {
        riskScore += 25;
        threats.push('Contains social engineering tactics');
      }
    });
    
    return { riskScore, threats };
  }

  // Utility functions
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  isShortened(url) {
    try {
      const domain = new URL(url).hostname.toLowerCase();
      return this.threatDatabase.shorteners.some(shortener => domain.includes(shortener));
    } catch {
      return false;
    }
  }

  estimateDomainAge(url) {
    // Simulate domain age estimation
    return `${Math.floor(Math.random() * 10) + 1} years`;
  }

  estimateScanTime(urlCount) {
    // Estimate based on concurrent processing
    const avgTimePerUrl = 300; // 300ms average
    const concurrentFactor = this.concurrentScans;
    return Math.ceil((urlCount * avgTimePerUrl) / concurrentFactor / 1000); // seconds
  }

  // Update scan statistics
  updateScanStats(results, totalTime) {
    this.scanStats.totalScanned += results.length;
    
    results.forEach(result => {
      switch (result.status) {
        case 'malicious':
          this.scanStats.maliciousFound++;
          break;
        case 'suspicious':
        case 'warning':
          this.scanStats.suspiciousFound++;
          break;
        case 'safe':
          this.scanStats.cleanUrls++;
          break;
      }
    });
    
    // Update average scan time
    this.scanStats.averageScanTime = 
      (this.scanStats.averageScanTime + (totalTime / results.length)) / 2;
    
    // Update daily stats
    const today = new Date().toDateString();
    const dailyStat = this.scanStats.dailyStats.get(today) || {
      scanned: 0, malicious: 0, suspicious: 0, clean: 0
    };
    
    dailyStat.scanned += results.length;
    results.forEach(result => {
      if (result.status === 'malicious') dailyStat.malicious++;
      else if (['suspicious', 'warning'].includes(result.status)) dailyStat.suspicious++;
      else if (result.status === 'safe') dailyStat.clean++;
    });
    
    this.scanStats.dailyStats.set(today, dailyStat);
  }

  // Save scan to history
  async saveScanToHistory(job) {
    try {
      const historyItem = {
        id: job.id,
        timestamp: job.startTime,
        urlCount: job.urls.length,
        scanTime: job.endTime - job.startTime,
        results: job.results.map(r => ({
          url: r.url,
          status: r.status,
          riskScore: r.riskScore,
          threats: r.threats.length
        }))
      };
      
      this.scanHistory.unshift(historyItem);
      
      // Keep only last 100 scans in memory
      if (this.scanHistory.length > 100) {
        this.scanHistory = this.scanHistory.slice(0, 100);
      }
      
      // Persist to storage
      await AsyncStorage.setItem('bulk_scan_history', JSON.stringify(this.scanHistory));
      
    } catch (error) {
      console.error('Failed to save scan history:', error);
    }
  }

  // Get scan statistics
  getScanStats() {
    return {
      ...this.scanStats,
      dailyStats: Array.from(this.scanStats.dailyStats.entries())
        .map(([date, stats]) => ({ date, ...stats }))
        .sort((a, b) => new Date(b.date) - new Date(a.date))
    };
  }

  // Get scan history
  getScanHistory() {
    return this.scanHistory;
  }

  // Export scan results
  async exportResults(format = 'json') {
    const exportData = {
      timestamp: new Date().toISOString(),
      stats: this.getScanStats(),
      history: this.getScanHistory(),
      version: '2.0'
    };
    
    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify(exportData, null, 2);
      case 'csv':
        return this.convertToCSV(exportData);
      default:
        return exportData;
    }
  }

  // Convert results to CSV format
  convertToCSV(data) {
    const headers = ['Timestamp', 'URL', 'Status', 'Risk Score', 'Threats', 'Scan Time'];
    const rows = [headers.join(',')];
    
    data.history.forEach(scan => {
      scan.results.forEach(result => {
        const row = [
          new Date(scan.timestamp).toISOString(),
          `"${result.url}"`,
          result.status,
          result.riskScore || 0,
          result.threats || 0,
          scan.scanTime || 0
        ];
        rows.push(row.join(','));
      });
    });
    
    return rows.join('\n');
  }
}

export default new BulkURLScannerService();
