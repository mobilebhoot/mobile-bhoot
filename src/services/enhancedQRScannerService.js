// Enhanced QR Scanner Service with Payment Detection & UPI Integration
import { Alert, Linking, Platform } from 'react-native';
import * as Camera from 'expo-camera';
import * as IntentLauncher from 'expo-intent-launcher';
import bulkUrlScanner from './bulkUrlScanner';

class EnhancedQRScannerService {
  constructor() {
    this.isScanning = false;
    this.scanHistory = [];
    this.paymentApps = {
      phonepe: {
        name: 'PhonePe',
        packageName: 'com.phonepe.app',
        scheme: 'phonepe://',
        playStoreUrl: 'https://play.google.com/store/apps/details?id=com.phonepe.app'
      },
      googlepay: {
        name: 'Google Pay',
        packageName: 'com.google.android.apps.nfc.payment',
        scheme: 'googlepay://',
        playStoreUrl: 'https://play.google.com/store/apps/details?id=com.google.android.apps.nfc.payment'
      },
      paytm: {
        name: 'Paytm',
        packageName: 'net.one97.paytm',
        scheme: 'paytm://',
        playStoreUrl: 'https://play.google.com/store/apps/details?id=net.one97.paytm'
      },
      bhim: {
        name: 'BHIM UPI',
        packageName: 'in.gov.npci.upiapp',
        scheme: 'bhim://',
        playStoreUrl: 'https://play.google.com/store/apps/details?id=in.gov.npci.upiapp'
      }
    };
  }

  // Request camera permissions
  async requestCameraPermissions() {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Camera permission request failed:', error);
      return false;
    }
  }

  // Process scanned QR code data
  async processQRCode(qrData) {
    try {
      const analysis = await this.analyzeQRCode(qrData);
      
      // Add to scan history
      const scanResult = {
        id: Date.now().toString(),
        data: qrData,
        timestamp: new Date().toISOString(),
        type: analysis.type,
        isPayment: analysis.isPayment,
        securityAnalysis: analysis.security,
        paymentInfo: analysis.paymentInfo
      };

      this.scanHistory.unshift(scanResult);
      
      // Keep only last 100 scans
      if (this.scanHistory.length > 100) {
        this.scanHistory = this.scanHistory.slice(0, 100);
      }

      // Handle based on QR type
      await this.handleQRCodeType(scanResult);
      
      return scanResult;

    } catch (error) {
      console.error('QR code processing error:', error);
      throw new Error('Failed to process QR code');
    }
  }

  // Analyze QR code content and type
  async analyzeQRCode(qrData) {
    const analysis = {
      type: 'unknown',
      isPayment: false,
      security: null,
      paymentInfo: null,
      urls: []
    };

    // Check if it's a UPI payment QR
    if (this.isUPIPayment(qrData)) {
      analysis.type = 'upi_payment';
      analysis.isPayment = true;
      analysis.paymentInfo = this.parseUPIPayment(qrData);
    }
    // Check if it's a URL
    else if (this.isURL(qrData)) {
      analysis.type = 'url';
      analysis.urls = [qrData];
      
      // Perform security analysis on URL
      analysis.security = await bulkUrlScanner.scanSingleUrl(qrData);
    }
    // Check if it contains URLs in the text
    else {
      const extractedUrls = this.extractURLsFromText(qrData);
      if (extractedUrls.length > 0) {
        analysis.type = 'text_with_urls';
        analysis.urls = extractedUrls;
        
        // Scan all URLs for security
        const securityResults = [];
        for (const url of extractedUrls) {
          const result = await bulkUrlScanner.scanSingleUrl(url);
          securityResults.push(result);
        }
        analysis.security = securityResults;
      } else {
        analysis.type = 'text';
      }
    }

    return analysis;
  }

  // Check if QR data is UPI payment format
  isUPIPayment(data) {
    return data.startsWith('upi://pay') || 
           data.includes('pa=') || 
           data.includes('pn=') ||
           /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(data); // UPI ID format
  }

  // Parse UPI payment information
  parseUPIPayment(upiString) {
    const paymentInfo = {
      payeeAddress: '',
      payeeName: '',
      amount: '',
      transactionNote: '',
      transactionRef: '',
      merchantCode: '',
      rawData: upiString
    };

    try {
      // Handle different UPI formats
      if (upiString.startsWith('upi://pay')) {
        const url = new URL(upiString);
        const params = new URLSearchParams(url.search);
        
        paymentInfo.payeeAddress = params.get('pa') || '';
        paymentInfo.payeeName = params.get('pn') || '';
        paymentInfo.amount = params.get('am') || '';
        paymentInfo.transactionNote = params.get('tn') || '';
        paymentInfo.transactionRef = params.get('tr') || '';
        paymentInfo.merchantCode = params.get('mc') || '';
      } else {
        // Simple UPI ID format
        paymentInfo.payeeAddress = upiString;
      }

      return paymentInfo;
    } catch (error) {
      console.error('UPI parsing error:', error);
      return paymentInfo;
    }
  }

  // Check if string is URL
  isURL(string) {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  }

  // Extract URLs from text
  extractURLsFromText(text) {
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
    return text.match(urlRegex) || [];
  }

  // Handle different QR code types
  async handleQRCodeType(scanResult) {
    switch (scanResult.type) {
      case 'upi_payment':
        await this.handleUPIPayment(scanResult);
        break;
        
      case 'url':
      case 'text_with_urls':
        await this.handleURLQR(scanResult);
        break;
        
      case 'text':
        await this.handleTextQR(scanResult);
        break;
        
      default:
        console.log('Unknown QR type:', scanResult.type);
    }
  }

  // Handle UPI payment QR codes
  async handleUPIPayment(scanResult) {
    const { paymentInfo, securityAnalysis } = scanResult;
    
    // First, perform security check on UPI data
    const securityCheck = this.performUPISecurityCheck(paymentInfo);
    
    if (securityCheck.isHighRisk) {
      Alert.alert(
        '⚠️ Suspicious Payment QR',
        `Security Warning: ${securityCheck.warnings.join(', ')}\n\nStill proceed with caution?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Proceed Anyway', onPress: () => this.showPaymentAppSelector(paymentInfo) }
        ]
      );
      return;
    }

    // Show payment details and app selector
    this.showPaymentAppSelector(paymentInfo);
  }

  // Perform security check on UPI payment
  performUPISecurityCheck(paymentInfo) {
    const warnings = [];
    let riskScore = 0;

    // Check for suspicious patterns
    const suspiciousPatterns = [
      'test', 'fake', 'scam', 'phishing', 'temp', 'demo'
    ];

    // Check payee address
    if (paymentInfo.payeeAddress) {
      const address = paymentInfo.payeeAddress.toLowerCase();
      
      suspiciousPatterns.forEach(pattern => {
        if (address.includes(pattern)) {
          warnings.push(`Suspicious payee address contains "${pattern}"`);
          riskScore += 30;
        }
      });

      // Check for non-standard UPI providers
      const standardProviders = ['paytm', 'phonepe', 'googlepay', 'okaxis', 'okhdfcbank', 'okicici'];
      const provider = address.split('@')[1];
      if (provider && !standardProviders.includes(provider)) {
        warnings.push('Using non-standard UPI provider');
        riskScore += 20;
      }
    }

    // Check transaction note for suspicious content
    if (paymentInfo.transactionNote) {
      const note = paymentInfo.transactionNote.toLowerCase();
      const suspiciousWords = ['urgent', 'emergency', 'lottery', 'prize', 'winner', 'refund'];
      
      suspiciousWords.forEach(word => {
        if (note.includes(word)) {
          warnings.push(`Suspicious transaction note contains "${word}"`);
          riskScore += 25;
        }
      });
    }

    // Check amount for unusual patterns
    if (paymentInfo.amount) {
      const amount = parseFloat(paymentInfo.amount);
      if (amount > 50000) {
        warnings.push('Large payment amount detected');
        riskScore += 15;
      }
    }

    return {
      isHighRisk: riskScore >= 40,
      warnings,
      riskScore
    };
  }

  // Show payment app selector
  showPaymentAppSelector(paymentInfo) {
    const payeeText = paymentInfo.payeeName ? 
      `To: ${paymentInfo.payeeName}` : 
      `To: ${paymentInfo.payeeAddress}`;
    
    const amountText = paymentInfo.amount ? 
      `Amount: ₹${paymentInfo.amount}` : 
      'Amount: Not specified';

    Alert.alert(
      '💳 UPI Payment Detected',
      `${payeeText}\n${amountText}\n\nChoose payment app:`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'PhonePe', onPress: () => this.openPaymentApp('phonepe', paymentInfo) },
        { text: 'Google Pay', onPress: () => this.openPaymentApp('googlepay', paymentInfo) },
        { text: 'Paytm', onPress: () => this.openPaymentApp('paytm', paymentInfo) },
        { text: 'BHIM', onPress: () => this.openPaymentApp('bhim', paymentInfo) }
      ]
    );
  }

  // Open specific payment app with UPI data
  async openPaymentApp(appKey, paymentInfo) {
    const app = this.paymentApps[appKey];
    if (!app) return;

    try {
      // Construct UPI URL for the specific app
      const upiUrl = this.constructUPIUrl(appKey, paymentInfo);
      
      // Try to open the app
      const canOpen = await Linking.canOpenURL(upiUrl);
      
      if (canOpen) {
        await Linking.openURL(upiUrl);
      } else {
        // App not installed, offer to install
        Alert.alert(
          `${app.name} Not Found`,
          `${app.name} is not installed. Would you like to install it?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Install', onPress: () => Linking.openURL(app.playStoreUrl) }
          ]
        );
      }
      
    } catch (error) {
      console.error(`Failed to open ${app.name}:`, error);
      Alert.alert('Error', `Failed to open ${app.name}. Please try manually.`);
    }
  }

  // Construct UPI URL for specific payment app
  constructUPIUrl(appKey, paymentInfo) {
    const baseUrl = `upi://pay`;
    const params = new URLSearchParams();
    
    if (paymentInfo.payeeAddress) params.append('pa', paymentInfo.payeeAddress);
    if (paymentInfo.payeeName) params.append('pn', paymentInfo.payeeName);
    if (paymentInfo.amount) params.append('am', paymentInfo.amount);
    if (paymentInfo.transactionNote) params.append('tn', paymentInfo.transactionNote);
    if (paymentInfo.transactionRef) params.append('tr', paymentInfo.transactionRef);
    if (paymentInfo.merchantCode) params.append('mc', paymentInfo.merchantCode);

    return `${baseUrl}?${params.toString()}`;
  }

  // Handle URL QR codes
  async handleURLQR(scanResult) {
    const { security } = scanResult;
    
    if (Array.isArray(security)) {
      // Multiple URLs
      const maliciousUrls = security.filter(s => s.status === 'malicious').length;
      const suspiciousUrls = security.filter(s => s.status === 'suspicious').length;
      
      if (maliciousUrls > 0 || suspiciousUrls > 0) {
        Alert.alert(
          '⚠️ Dangerous Links Detected',
          `Found ${maliciousUrls} malicious and ${suspiciousUrls} suspicious links. Do not visit these sites!`,
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }
    } else {
      // Single URL
      if (security.status === 'malicious') {
        Alert.alert(
          '🚫 Malicious Link Detected',
          `This link is dangerous: ${security.threats.join(', ')}\n\nDo not visit this site!`,
          [{ text: 'OK', style: 'default' }]
        );
        return;
      } else if (security.status === 'suspicious') {
        Alert.alert(
          '⚠️ Suspicious Link',
          `This link may be risky: ${security.threats.join(', ')}\n\nProceed with caution.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Anyway', onPress: () => Linking.openURL(scanResult.data) }
          ]
        );
        return;
      }
    }

    // Safe URL - offer to open
    Alert.alert(
      '🔗 Safe Link Detected',
      'This link appears to be safe. Would you like to open it?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Link', onPress: () => Linking.openURL(scanResult.data) }
      ]
    );
  }

  // Handle text QR codes
  async handleTextQR(scanResult) {
    Alert.alert(
      '📝 Text QR Code',
      scanResult.data,
      [
        { text: 'OK', style: 'default' },
        { text: 'Copy Text', onPress: () => this.copyToClipboard(scanResult.data) }
      ]
    );
  }

  // Copy text to clipboard
  async copyToClipboard(text) {
    try {
      // Note: In a real app, you'd use Clipboard.setStringAsync
      console.log('Copied to clipboard:', text);
      Alert.alert('Success', 'Text copied to clipboard!');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy text to clipboard.');
    }
  }

  // Get scan history
  getScanHistory() {
    return this.scanHistory;
  }

  // Get scan statistics
  getScanStats() {
    const now = Date.now();
    const last24h = now - (24 * 60 * 60 * 1000);
    const last7d = now - (7 * 24 * 60 * 60 * 1000);

    const recent24h = this.scanHistory.filter(scan => 
      new Date(scan.timestamp).getTime() > last24h
    );
    const recent7d = this.scanHistory.filter(scan => 
      new Date(scan.timestamp).getTime() > last7d
    );

    return {
      totalScans: this.scanHistory.length,
      scans24h: recent24h.length,
      scans7d: recent7d.length,
      paymentScans: this.scanHistory.filter(s => s.isPayment).length,
      urlScans: this.scanHistory.filter(s => s.type === 'url' || s.type === 'text_with_urls').length,
      maliciousFound: this.scanHistory.filter(s => 
        s.securityAnalysis && 
        (s.securityAnalysis.status === 'malicious' || 
         (Array.isArray(s.securityAnalysis) && s.securityAnalysis.some(sa => sa.status === 'malicious')))
      ).length
    };
  }

  // Clear scan history
  clearHistory() {
    this.scanHistory = [];
  }

  // Export scan history
  exportHistory(format = 'json') {
    const exportData = {
      timestamp: new Date().toISOString(),
      stats: this.getScanStats(),
      history: this.scanHistory,
      version: '1.0'
    };

    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify(exportData, null, 2);
      case 'csv':
        return this.convertHistoryToCSV(exportData);
      default:
        return exportData;
    }
  }

  // Convert scan history to CSV
  convertHistoryToCSV(data) {
    const headers = ['Timestamp', 'Type', 'Is Payment', 'Data Preview', 'Security Status'];
    const rows = [headers.join(',')];

    data.history.forEach(scan => {
      const securityStatus = scan.securityAnalysis ? 
        (Array.isArray(scan.securityAnalysis) ? 
          scan.securityAnalysis.map(sa => sa.status).join('/') : 
          scan.securityAnalysis.status) : 
        'N/A';

      const row = [
        scan.timestamp,
        scan.type,
        scan.isPayment ? 'Yes' : 'No',
        `"${scan.data.substring(0, 50)}..."`,
        securityStatus
      ];
      rows.push(row.join(','));
    });

    return rows.join('\n');
  }
}

export default new EnhancedQRScannerService();
