// QR Code Scanner Service - Scans QR codes and analyzes contained URLs
import { Camera } from 'expo-camera';
import { BarCodeScanner } from 'expo-barcode-scanner';
import urlScannerService from './urlScanner';

class QRScannerService {
  constructor() {
    this.isScanning = false;
    this.lastScannedCode = null;
    this.scanTimeout = null;
  }

  // Request camera permissions
  async requestCameraPermissions() {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Failed to request camera permissions:', error);
      return false;
    }
  }

  // Check if camera permissions are granted
  async checkCameraPermissions() {
    try {
      const { status } = await Camera.getCameraPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Failed to check camera permissions:', error);
      return false;
    }
  }

  // Scan QR code and analyze any URLs found
  async scanQRCode(data, type) {
    // Prevent duplicate scans of the same code
    if (this.lastScannedCode === data || this.isScanning) {
      return null;
    }

    this.isScanning = true;
    this.lastScannedCode = data;

    try {
      const result = await this.processQRData(data, type);
      
      // Reset scanning state after 2 seconds to allow rescanning
      this.scanTimeout = setTimeout(() => {
        this.isScanning = false;
        this.lastScannedCode = null;
      }, 2000);

      return result;
    } catch (error) {
      console.error('QR scan processing failed:', error);
      this.isScanning = false;
      return {
        success: false,
        error: 'Failed to process QR code',
        data: data,
        type: type
      };
    }
  }

  // Process QR code data and extract URLs
  async processQRData(data, type) {
    const result = {
      success: true,
      data: data,
      type: type,
      dataType: this.identifyDataType(data),
      urls: [],
      urlAnalysis: [],
      recommendations: [],
      riskLevel: 'SAFE',
      riskScore: 0
    };

    // Extract URLs from QR code data
    const urls = this.extractURLs(data);
    result.urls = urls;

    if (urls.length === 0) {
      // No URLs found - analyze the data type
      result.recommendations = this.getNonURLRecommendations(result.dataType, data);
      return result;
    }

    // Analyze each URL found
    const urlAnalysisPromises = urls.map(url => urlScannerService.scanURL(url));
    const urlAnalysisResults = await Promise.all(urlAnalysisPromises);
    
    result.urlAnalysis = urlAnalysisResults;

    // Calculate overall risk based on all URLs
    const riskScores = urlAnalysisResults
      .filter(analysis => analysis.isValid)
      .map(analysis => analysis.riskScore);
    
    if (riskScores.length > 0) {
      result.riskScore = Math.max(...riskScores); // Use highest risk score
      result.riskLevel = this.calculateOverallRiskLevel(result.riskScore, urlAnalysisResults);
    }

    // Generate recommendations
    result.recommendations = this.generateQRRecommendations(result);

    return result;
  }

  // Identify the type of data in QR code
  identifyDataType(data) {
    // URL patterns
    if (data.match(/^https?:\/\//)) {
      return 'URL';
    }
    
    // Email patterns
    if (data.match(/^mailto:/)) {
      return 'EMAIL';
    }
    
    // Phone patterns
    if (data.match(/^tel:/) || data.match(/^\+?[\d\s\-\(\)]+$/)) {
      return 'PHONE';
    }
    
    // WiFi configuration
    if (data.match(/^WIFI:/)) {
      return 'WIFI';
    }
    
    // SMS patterns
    if (data.match(/^sms:/)) {
      return 'SMS';
    }
    
    // Geo location
    if (data.match(/^geo:/)) {
      return 'LOCATION';
    }
    
    // Cryptocurrency addresses
    if (data.match(/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/)) {
      return 'BITCOIN';
    }
    
    if (data.match(/^0x[a-fA-F0-9]{40}$/)) {
      return 'ETHEREUM';
    }
    
    // vCard contact
    if (data.match(/^BEGIN:VCARD/)) {
      return 'CONTACT';
    }
    
    // Calendar event
    if (data.match(/^BEGIN:VEVENT/)) {
      return 'CALENDAR';
    }
    
    // Generic text
    if (data.length < 50 && !data.includes('\n')) {
      return 'TEXT';
    }
    
    return 'UNKNOWN';
  }

  // Extract URLs from QR code data
  extractURLs(data) {
    const urlRegex = /https?:\/\/[^\s<>"'{}|\\^`\[\]]+/gi;
    const matches = data.match(urlRegex) || [];
    
    // Also check if the entire data is a URL (without protocol)
    if (matches.length === 0 && this.isValidURL(data)) {
      matches.push(data.startsWith('http') ? data : `https://${data}`);
    }
    
    return [...new Set(matches)]; // Remove duplicates
  }

  // Check if string is a valid URL
  isValidURL(string) {
    try {
      new URL(string.startsWith('http') ? string : `https://${string}`);
      return true;
    } catch {
      return false;
    }
  }

  // Calculate overall risk level
  calculateOverallRiskLevel(maxRiskScore, urlAnalysisResults) {
    const dangerousCount = urlAnalysisResults.filter(r => r.isValid && r.riskLevel === 'DANGEROUS').length;
    const suspiciousCount = urlAnalysisResults.filter(r => r.isValid && r.riskLevel === 'SUSPICIOUS').length;
    
    if (dangerousCount > 0 || maxRiskScore >= 70) {
      return 'DANGEROUS';
    } else if (suspiciousCount > 0 || maxRiskScore >= 40) {
      return 'SUSPICIOUS';
    } else if (maxRiskScore >= 20) {
      return 'CAUTION';
    } else {
      return 'SAFE';
    }
  }

  // Generate recommendations for QR code scan results
  generateQRRecommendations(result) {
    const recommendations = [];
    
    switch (result.riskLevel) {
      case 'DANGEROUS':
        recommendations.push('🚨 DO NOT visit the URLs in this QR code');
        recommendations.push('⚠️ This QR code contains malicious links');
        recommendations.push('🛡️ Report this QR code to security authorities');
        break;
        
      case 'SUSPICIOUS':
        recommendations.push('⚠️ Exercise caution with this QR code');
        recommendations.push('🔍 Verify the source before visiting any links');
        recommendations.push('🛡️ Consider scanning with additional security tools');
        break;
        
      case 'CAUTION':
        recommendations.push('⚠️ Proceed with caution');
        recommendations.push('🔍 Verify this QR code came from a trusted source');
        recommendations.push('🔗 Review the URLs before visiting');
        break;
        
      default:
        recommendations.push('✅ QR code appears safe');
        recommendations.push('🔍 Always verify QR codes from unknown sources');
    }

    // Add data type specific recommendations
    switch (result.dataType) {
      case 'WIFI':
        recommendations.push('📶 WiFi QR: Only connect to networks you trust');
        break;
      case 'BITCOIN':
      case 'ETHEREUM':
        recommendations.push('💰 Crypto Address: Verify recipient before sending funds');
        break;
      case 'CONTACT':
        recommendations.push('👤 Contact: Review information before adding to contacts');
        break;
      case 'EMAIL':
        recommendations.push('📧 Email: Verify sender before responding');
        break;
    }

    return recommendations;
  }

  // Generate recommendations for non-URL QR codes
  getNonURLRecommendations(dataType, data) {
    const recommendations = [];
    
    switch (dataType) {
      case 'WIFI':
        recommendations.push('📶 WiFi Configuration Detected');
        recommendations.push('✅ Only connect to networks you trust');
        recommendations.push('🔒 Verify the network name and security settings');
        break;
        
      case 'PHONE':
        recommendations.push('📞 Phone Number Detected');
        recommendations.push('✅ Verify the number before calling');
        recommendations.push('⚠️ Be cautious of premium rate numbers');
        break;
        
      case 'EMAIL':
        recommendations.push('📧 Email Address Detected');
        recommendations.push('✅ Verify the sender before responding');
        recommendations.push('🔍 Check for suspicious email domains');
        break;
        
      case 'BITCOIN':
      case 'ETHEREUM':
        recommendations.push('💰 Cryptocurrency Address Detected');
        recommendations.push('⚠️ VERIFY recipient before sending any funds');
        recommendations.push('🔒 Double-check the address format');
        break;
        
      case 'CONTACT':
        recommendations.push('👤 Contact Information Detected');
        recommendations.push('✅ Review information before adding to contacts');
        recommendations.push('🔍 Verify the person\'s identity');
        break;
        
      case 'LOCATION':
        recommendations.push('📍 Location Information Detected');
        recommendations.push('✅ Verify the location before visiting');
        recommendations.push('🔍 Be cautious of remote or unusual locations');
        break;
        
      default:
        recommendations.push('📄 Text Data Detected');
        recommendations.push('✅ Review the content carefully');
        recommendations.push('🔍 Be cautious of suspicious information');
    }
    
    return recommendations;
  }

  // Get supported barcode types
  getSupportedBarcodeTypes() {
    return [
      BarCodeScanner.Constants.BarCodeType.qr,
      BarCodeScanner.Constants.BarCodeType.pdf417,
      BarCodeScanner.Constants.BarCodeType.aztec,
      BarCodeScanner.Constants.BarCodeType.datamatrix,
    ];
  }

  // Reset scanner state
  resetScanner() {
    this.isScanning = false;
    this.lastScannedCode = null;
    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
      this.scanTimeout = null;
    }
  }

  // Parse WiFi QR code
  parseWiFiQR(data) {
    const wifiRegex = /WIFI:T:([^;]*);S:([^;]*);P:([^;]*);H:([^;]*);?/;
    const match = data.match(wifiRegex);
    
    if (match) {
      return {
        type: match[1] || 'WPA',
        ssid: match[2] || '',
        password: match[3] || '',
        hidden: match[4] === 'true'
      };
    }
    
    return null;
  }

  // Generate security report for QR code
  generateSecurityReport(result) {
    const report = {
      timestamp: new Date().toISOString(),
      qrData: result.data.substring(0, 100) + (result.data.length > 100 ? '...' : ''),
      dataType: result.dataType,
      urlCount: result.urls.length,
      riskLevel: result.riskLevel,
      riskScore: result.riskScore,
      threats: [],
      recommendations: result.recommendations
    };

    // Collect threats from URL analysis
    if (result.urlAnalysis) {
      result.urlAnalysis.forEach((analysis, index) => {
        if (analysis.threats && analysis.threats.length > 0) {
          analysis.threats.forEach(threat => {
            report.threats.push({
              url: result.urls[index],
              type: threat.type,
              severity: threat.severity,
              details: threat.details
            });
          });
        }
      });
    }

    return report;
  }
}

export default new QRScannerService();
