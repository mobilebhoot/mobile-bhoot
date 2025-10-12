// URL Scanner Service - Detects malicious and suspicious links
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

class URLScannerService {
  constructor() {
    this.maliciousDomains = new Set();
    this.suspiciousPatterns = [];
    this.phishingKeywords = [];
    this.initializeDatabase();
  }

  // Initialize the malicious domain database
  async initializeDatabase() {
    try {
      // Load cached malicious domains
      const cachedDomains = await AsyncStorage.getItem('malicious_domains');
      if (cachedDomains) {
        const domains = JSON.parse(cachedDomains);
        this.maliciousDomains = new Set(domains);
      }

      // Initialize with known malicious patterns
      this.loadKnownThreats();
      
      // Update database from remote source
      await this.updateThreatDatabase();
    } catch (error) {
      console.error('Failed to initialize URL scanner database:', error);
      this.loadKnownThreats(); // Fallback to local database
    }
  }

  // Load known malicious patterns and domains
  loadKnownThreats() {
    // Common malicious domains (sample - in production, use a comprehensive list)
    const knownMaliciousDomains = [
      'bit.ly/malware',
      'tinyurl.com/virus',
      'suspicious-bank-login.com',
      'fake-whatsapp.org',
      'phishing-site.net',
      'malware-download.co',
      // Add more known malicious domains
    ];

    knownMaliciousDomains.forEach(domain => {
      this.maliciousDomains.add(domain.toLowerCase());
    });

    // Suspicious URL patterns
    this.suspiciousPatterns = [
      /bit\.ly\/[a-zA-Z0-9]{6,}/,  // Shortened URLs
      /tinyurl\.com\/[a-zA-Z0-9]+/,
      /t\.co\/[a-zA-Z0-9]+/,
      /goo\.gl\/[a-zA-Z0-9]+/,
      /ow\.ly\/[a-zA-Z0-9]+/,
      /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/, // IP addresses
      /[a-zA-Z0-9]+-[a-zA-Z0-9]+-[a-zA-Z0-9]+\.(tk|ml|ga|cf)/, // Suspicious TLDs
      /[a-zA-Z]+(bank|paypal|amazon|google|microsoft|apple|whatsapp)[a-zA-Z]*\.(tk|ml|ga|cf|info|biz)/, // Phishing patterns
    ];

    // Phishing keywords
    this.phishingKeywords = [
      'verify-account', 'urgent-action', 'suspended-account', 'click-here-now',
      'limited-time', 'act-now', 'verify-identity', 'update-payment',
      'security-alert', 'account-locked', 'unusual-activity', 'confirm-identity',
      'free-money', 'lottery-winner', 'claim-prize', 'inheritance',
      'bitcoin-investment', 'crypto-profit', 'guaranteed-return'
    ];
  }

  // Update threat database from remote source
  async updateThreatDatabase() {
    try {
      // In production, fetch from a threat intelligence API
      const response = await fetch('https://api.pocketshield.com/threats/urls', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PocketShield/1.0'
        }
      });

      if (response.ok) {
        const threatData = await response.json();
        
        // Update malicious domains
        if (threatData.maliciousDomains) {
          threatData.maliciousDomains.forEach(domain => {
            this.maliciousDomains.add(domain.toLowerCase());
          });

          // Cache updated domains
          await AsyncStorage.setItem(
            'malicious_domains', 
            JSON.stringify([...this.maliciousDomains])
          );
        }

        // Update last check timestamp
        await AsyncStorage.setItem('last_threat_update', Date.now().toString());
        
        console.log('✅ Threat database updated successfully');
      }
    } catch (error) {
      console.warn('Failed to update threat database:', error);
      // Continue with local database
    }
  }

  // Main URL scanning function
  async scanURL(url) {
    if (!url || typeof url !== 'string') {
      return {
        isValid: false,
        error: 'Invalid URL provided'
      };
    }

    try {
      // Normalize URL
      const normalizedURL = this.normalizeURL(url);
      const parsedURL = new URL(normalizedURL);

      // Perform multiple checks
      const checks = await Promise.all([
        this.checkMaliciousDomains(parsedURL),
        this.checkSuspiciousPatterns(normalizedURL),
        this.checkPhishingIndicators(normalizedURL),
        this.checkURLStructure(parsedURL),
        this.checkDomainAge(parsedURL.hostname),
        this.performDeepAnalysis(normalizedURL)
      ]);

      // Calculate risk score
      const riskScore = this.calculateRiskScore(checks);
      
      // Generate report
      const report = this.generateScanReport(normalizedURL, checks, riskScore);

      // Log scan for analytics
      await this.logScan(normalizedURL, riskScore);

      return report;

    } catch (error) {
      return {
        isValid: false,
        error: 'Failed to parse URL',
        url: url,
        riskLevel: 'UNKNOWN',
        riskScore: 50,
        issues: ['Invalid URL format']
      };
    }
  }

  // Normalize URL for consistent analysis
  normalizeURL(url) {
    // Add protocol if missing
    if (!url.match(/^https?:\/\//)) {
      url = 'https://' + url;
    }

    // Remove tracking parameters
    try {
      const urlObj = new URL(url);
      const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'gclid', 'fbclid'];
      trackingParams.forEach(param => {
        urlObj.searchParams.delete(param);
      });
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  // Check against known malicious domains
  async checkMaliciousDomains(parsedURL) {
    const domain = parsedURL.hostname.toLowerCase();
    const isDomainMalicious = this.maliciousDomains.has(domain);
    
    // Check subdomains
    const domainParts = domain.split('.');
    let hasSubdomainThreat = false;
    
    for (let i = 1; i < domainParts.length; i++) {
      const subdomain = domainParts.slice(i).join('.');
      if (this.maliciousDomains.has(subdomain)) {
        hasSubdomainThreat = true;
        break;
      }
    }

    return {
      type: 'malicious_domain',
      threat: isDomainMalicious || hasSubdomainThreat,
      severity: isDomainMalicious ? 'HIGH' : (hasSubdomainThreat ? 'MEDIUM' : 'LOW'),
      details: isDomainMalicious ? 'Domain found in malicious database' : 
               hasSubdomainThreat ? 'Subdomain matches known threat' : 'Domain appears clean'
    };
  }

  // Check for suspicious URL patterns
  async checkSuspiciousPatterns(url) {
    const suspiciousMatches = [];
    
    this.suspiciousPatterns.forEach((pattern, index) => {
      if (pattern.test(url)) {
        suspiciousMatches.push({
          pattern: pattern.toString(),
          type: this.getPatternType(index)
        });
      }
    });

    return {
      type: 'suspicious_patterns',
      threat: suspiciousMatches.length > 0,
      severity: suspiciousMatches.length > 2 ? 'HIGH' : suspiciousMatches.length > 0 ? 'MEDIUM' : 'LOW',
      details: suspiciousMatches.length > 0 ? 
        `Found ${suspiciousMatches.length} suspicious pattern(s)` : 'No suspicious patterns detected',
      matches: suspiciousMatches
    };
  }

  // Check for phishing indicators
  async checkPhishingIndicators(url) {
    const lowerURL = url.toLowerCase();
    const phishingMatches = [];

    this.phishingKeywords.forEach(keyword => {
      if (lowerURL.includes(keyword)) {
        phishingMatches.push(keyword);
      }
    });

    // Check for brand impersonation
    const brandImpersonation = this.checkBrandImpersonation(lowerURL);

    return {
      type: 'phishing_indicators',
      threat: phishingMatches.length > 0 || brandImpersonation.detected,
      severity: (phishingMatches.length > 2 || brandImpersonation.detected) ? 'HIGH' : 
                phishingMatches.length > 0 ? 'MEDIUM' : 'LOW',
      details: phishingMatches.length > 0 ? 
        `Found ${phishingMatches.length} phishing indicator(s)` : 'No phishing indicators detected',
      keywords: phishingMatches,
      brandImpersonation: brandImpersonation
    };
  }

  // Check URL structure for anomalies
  async checkURLStructure(parsedURL) {
    const issues = [];
    
    // Check for suspicious port numbers
    if (parsedURL.port && !['80', '443', '8080', '8443'].includes(parsedURL.port)) {
      issues.push(`Unusual port number: ${parsedURL.port}`);
    }

    // Check for overly long URLs
    if (parsedURL.href.length > 200) {
      issues.push('Unusually long URL');
    }

    // Check for suspicious path patterns
    if (parsedURL.pathname.includes('..') || parsedURL.pathname.includes('//')) {
      issues.push('Suspicious path patterns detected');
    }

    // Check for excessive subdomains
    const subdomains = parsedURL.hostname.split('.');
    if (subdomains.length > 4) {
      issues.push('Excessive number of subdomains');
    }

    return {
      type: 'url_structure',
      threat: issues.length > 0,
      severity: issues.length > 2 ? 'HIGH' : issues.length > 0 ? 'MEDIUM' : 'LOW',
      details: issues.length > 0 ? `Found ${issues.length} structural issue(s)` : 'URL structure appears normal',
      issues: issues
    };
  }

  // Check domain age (simplified version)
  async checkDomainAge(hostname) {
    // In production, you would query a WHOIS API
    // For now, we'll do basic heuristics
    
    const suspiciousTLDs = ['.tk', '.ml', '.ga', '.cf', '.info', '.biz', '.cc'];
    const hasSuspiciousTLD = suspiciousTLDs.some(tld => hostname.endsWith(tld));
    
    return {
      type: 'domain_age',
      threat: hasSuspiciousTLD,
      severity: hasSuspiciousTLD ? 'MEDIUM' : 'LOW',
      details: hasSuspiciousTLD ? 'Domain uses suspicious TLD' : 'Domain TLD appears legitimate'
    };
  }

  // Perform deep analysis
  async performDeepAnalysis(url) {
    const analysisPoints = [];
    
    // Check URL entropy (randomness)
    const entropy = this.calculateEntropy(url);
    if (entropy > 4.5) {
      analysisPoints.push('High URL entropy (appears random)');
    }

    // Check for homograph attacks
    const hasHomographs = this.checkHomographAttack(url);
    if (hasHomographs) {
      analysisPoints.push('Potential homograph attack detected');
    }

    // Check for base64 encoding
    if (url.match(/[A-Za-z0-9+\/]{20,}={0,2}/)) {
      analysisPoints.push('Contains base64-like strings');
    }

    return {
      type: 'deep_analysis',
      threat: analysisPoints.length > 0,
      severity: analysisPoints.length > 1 ? 'MEDIUM' : analysisPoints.length > 0 ? 'LOW' : 'LOW',
      details: analysisPoints.length > 0 ? 
        `Advanced analysis found ${analysisPoints.length} concern(s)` : 'Advanced analysis passed',
      concerns: analysisPoints
    };
  }

  // Helper functions
  getPatternType(index) {
    const types = [
      'URL Shortener', 'URL Shortener', 'URL Shortener', 'URL Shortener', 'URL Shortener',
      'IP Address', 'Suspicious TLD', 'Brand Impersonation'
    ];
    return types[index] || 'Unknown Pattern';
  }

  checkBrandImpersonation(url) {
    const brands = ['paypal', 'amazon', 'google', 'microsoft', 'apple', 'whatsapp', 'facebook', 'instagram'];
    const domain = url.split('/')[2] || '';
    
    for (const brand of brands) {
      if (domain.includes(brand) && !domain.endsWith(`${brand}.com`) && !domain.endsWith(`${brand}.org`)) {
        return {
          detected: true,
          brand: brand,
          suspiciousDomain: domain
        };
      }
    }
    
    return { detected: false };
  }

  calculateEntropy(str) {
    const freq = {};
    str.split('').forEach(char => {
      freq[char] = (freq[char] || 0) + 1;
    });
    
    return Object.values(freq)
      .reduce((entropy, count) => {
        const p = count / str.length;
        return entropy - p * Math.log2(p);
      }, 0);
  }

  checkHomographAttack(url) {
    // Simple check for mixed scripts
    const cyrillic = /[\u0400-\u04FF]/;
    const latin = /[a-zA-Z]/;
    
    return cyrillic.test(url) && latin.test(url);
  }

  // Calculate overall risk score
  calculateRiskScore(checks) {
    let score = 0;
    let maxScore = 0;

    checks.forEach(check => {
      maxScore += 20; // Each check contributes max 20 points
      
      if (check.threat) {
        switch (check.severity) {
          case 'HIGH':
            score += 20;
            break;
          case 'MEDIUM':
            score += 12;
            break;
          case 'LOW':
            score += 5;
            break;
        }
      }
    });

    return Math.min(100, Math.round((score / maxScore) * 100));
  }

  // Generate comprehensive scan report
  generateScanReport(url, checks, riskScore) {
    const threats = checks.filter(check => check.threat);
    
    let riskLevel = 'SAFE';
    if (riskScore >= 70) riskLevel = 'DANGEROUS';
    else if (riskScore >= 40) riskLevel = 'SUSPICIOUS';
    else if (riskScore >= 20) riskLevel = 'CAUTION';

    const recommendations = this.generateRecommendations(riskLevel, threats);

    return {
      isValid: true,
      url: url,
      riskLevel: riskLevel,
      riskScore: riskScore,
      scanDate: new Date().toISOString(),
      threats: threats,
      allChecks: checks,
      recommendations: recommendations,
      summary: this.generateSummary(riskLevel, threats.length)
    };
  }

  generateRecommendations(riskLevel, threats) {
    const recommendations = [];

    switch (riskLevel) {
      case 'DANGEROUS':
        recommendations.push('🚨 DO NOT CLICK this link');
        recommendations.push('🛡️ Report this link as malicious');
        recommendations.push('⚠️ Warn others about this threat');
        break;
        
      case 'SUSPICIOUS':
        recommendations.push('⚠️ Exercise extreme caution');
        recommendations.push('🔍 Verify the source before clicking');
        recommendations.push('🛡️ Consider using a VPN if you must visit');
        break;
        
      case 'CAUTION':
        recommendations.push('⚠️ Proceed with caution');
        recommendations.push('🔍 Verify this is the intended website');
        recommendations.push('🛡️ Ensure your device security is up to date');
        break;
        
      default:
        recommendations.push('✅ Link appears safe to visit');
        recommendations.push('🔍 Always verify URLs from unknown sources');
    }

    return recommendations;
  }

  generateSummary(riskLevel, threatCount) {
    if (riskLevel === 'DANGEROUS') {
      return `High-risk link detected with ${threatCount} security threat(s). Do not click.`;
    } else if (riskLevel === 'SUSPICIOUS') {
      return `Potentially suspicious link with ${threatCount} warning(s). Exercise caution.`;
    } else if (riskLevel === 'CAUTION') {
      return `Link has ${threatCount} minor concern(s). Verify before clicking.`;
    } else {
      return 'Link appears safe based on our analysis.';
    }
  }

  // Log scan for analytics
  async logScan(url, riskScore) {
    try {
      const scanLog = {
        url: this.hashURL(url), // Hash for privacy
        riskScore: riskScore,
        timestamp: Date.now(),
        version: '1.0'
      };

      // Store locally
      const existingLogs = await AsyncStorage.getItem('scan_logs') || '[]';
      const logs = JSON.parse(existingLogs);
      logs.push(scanLog);

      // Keep only last 100 scans
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }

      await AsyncStorage.setItem('scan_logs', JSON.stringify(logs));
    } catch (error) {
      console.warn('Failed to log scan:', error);
    }
  }

  // Hash URL for privacy
  hashURL(url) {
    return Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      url,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
  }

  // Get scan statistics
  async getScanStats() {
    try {
      const logs = JSON.parse(await AsyncStorage.getItem('scan_logs') || '[]');
      
      const total = logs.length;
      const dangerous = logs.filter(log => log.riskScore >= 70).length;
      const suspicious = logs.filter(log => log.riskScore >= 40 && log.riskScore < 70).length;
      const safe = logs.filter(log => log.riskScore < 40).length;

      return {
        total,
        dangerous,
        suspicious,
        safe,
        averageRiskScore: total > 0 ? Math.round(logs.reduce((sum, log) => sum + log.riskScore, 0) / total) : 0
      };
    } catch (error) {
      return { total: 0, dangerous: 0, suspicious: 0, safe: 0, averageRiskScore: 0 };
    }
  }
}

export default new URLScannerService();
