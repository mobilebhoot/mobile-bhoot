import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  Vibration,
  Dimensions
} from 'react-native';
import { Camera } from 'expo-camera';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import qrScannerService from '../services/qrScanner';

const { width, height } = Dimensions.get('window');

const QRScannerScreen = ({ navigation }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [isScanning, setIsScanning] = useState(true);
  const [flashOn, setFlashOn] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraRef = useRef(null);

  useEffect(() => {
    requestCameraPermission();
    
    // Reset scanner service when component mounts
    return () => {
      qrScannerService.resetScanner();
    };
  }, []);

  const requestCameraPermission = async () => {
    const granted = await qrScannerService.requestCameraPermissions();
    setHasPermission(granted);
    
    if (!granted) {
      Alert.alert(
        'Camera Permission Required',
        'PocketShield needs camera access to scan QR codes for security analysis.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => {/* Open settings */} }
        ]
      );
    }
  };

  const handleBarCodeScanned = async ({ type, data }) => {
    if (isProcessing || !isScanning) return;

    setIsProcessing(true);
    setIsScanning(false);

    // Provide immediate haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const result = await qrScannerService.scanQRCode(data, type);
      
      if (result) {
        setScanResult(result);
        setShowResults(true);
        
        // Provide haptic feedback based on risk level
        if (result.riskLevel === 'DANGEROUS') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Vibration.vibrate([0, 100, 100, 100, 100, 100]);
        } else if (result.riskLevel === 'SUSPICIOUS') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          Vibration.vibrate([0, 100, 100]);
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (error) {
      console.error('QR scan failed:', error);
      Alert.alert('Scan Failed', 'Unable to process the QR code. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleFlash = () => {
    setFlashOn(!flashOn);
  };

  const resumeScanning = () => {
    setScanResult(null);
    setShowResults(false);
    setIsScanning(true);
    qrScannerService.resetScanner();
  };

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'DANGEROUS': return '#FF4444';
      case 'SUSPICIOUS': return '#FF8800';
      case 'CAUTION': return '#FFBB33';
      case 'SAFE': return '#00C851';
      default: return '#666';
    }
  };

  const getRiskIcon = (riskLevel) => {
    switch (riskLevel) {
      case 'DANGEROUS': return 'warning';
      case 'SUSPICIOUS': return 'alert-circle';
      case 'CAUTION': return 'alert';
      case 'SAFE': return 'checkmark-circle';
      default: return 'help-circle';
    }
  };

  const getDataTypeIcon = (dataType) => {
    switch (dataType) {
      case 'URL': return 'link';
      case 'WIFI': return 'wifi';
      case 'EMAIL': return 'mail';
      case 'PHONE': return 'call';
      case 'CONTACT': return 'person';
      case 'LOCATION': return 'location';
      case 'BITCOIN': return 'logo-bitcoin';
      case 'ETHEREUM': return 'diamond';
      case 'TEXT': return 'document-text';
      default: return 'qr-code';
    }
  };

  const renderScanOverlay = () => (
    <View style={styles.overlay}>
      {/* Top section */}
      <View style={styles.overlaySection}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>QR Scanner</Text>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={toggleFlash}
          >
            <Ionicons 
              name={flashOn ? "flash" : "flash-off"} 
              size={24} 
              color={flashOn ? "#FFD700" : "#fff"} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Middle section with scanning area */}
      <View style={styles.scanArea}>
        <View style={styles.scanBox}>
          {/* Corner indicators */}
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
          
          {/* Scanning line animation */}
          {isScanning && (
            <View style={styles.scanLine} />
          )}
        </View>
        
        <Text style={styles.scanInstruction}>
          {isProcessing ? 'Analyzing QR Code...' : 'Point camera at QR code'}
        </Text>
        
        {isProcessing && (
          <ActivityIndicator size="large" color="#4CAF50" style={styles.processingIndicator} />
        )}
      </View>

      {/* Bottom section */}
      <View style={styles.overlaySection}>
        <View style={styles.bottomControls}>
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={() => navigation.navigate('Link Scanner')}
          >
            <Ionicons name="link" size={20} color="#4CAF50" />
            <Text style={styles.controlButtonText}>URL Scanner</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={() => {/* Open gallery picker */}}
          >
            <Ionicons name="image" size={20} color="#4CAF50" />
            <Text style={styles.controlButtonText}>From Gallery</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.privacyNote}>
          🔒 QR codes are analyzed locally for your privacy
        </Text>
      </View>
    </View>
  );

  const renderResults = () => {
    if (!scanResult) return null;

    const riskColor = getRiskColor(scanResult.riskLevel);
    const riskIcon = getRiskIcon(scanResult.riskLevel);
    const dataTypeIcon = getDataTypeIcon(scanResult.dataType);

    return (
      <Modal
        visible={showResults}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.resultsContainer}>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsTitle}>QR Code Analysis</Text>
            <TouchableOpacity onPress={resumeScanning}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.resultsScroll}
            showsVerticalScrollIndicator={false}
          >
            {/* Risk Assessment */}
            <View style={[styles.riskCard, { backgroundColor: riskColor + '20' }]}>
              <View style={styles.riskHeader}>
                <Ionicons name={riskIcon} size={32} color={riskColor} />
                <View style={styles.riskInfo}>
                  <Text style={[styles.riskLevel, { color: riskColor }]}>
                    {scanResult.riskLevel}
                  </Text>
                  <Text style={styles.riskScore}>
                    Risk Score: {scanResult.riskScore}/100
                  </Text>
                </View>
              </View>
            </View>

            {/* Data Type */}
            <View style={styles.dataTypeCard}>
              <View style={styles.dataTypeHeader}>
                <Ionicons name={dataTypeIcon} size={24} color="#4CAF50" />
                <Text style={styles.dataTypeTitle}>
                  {scanResult.dataType} Detected
                </Text>
              </View>
              <Text style={styles.dataContent} numberOfLines={3}>
                {scanResult.data}
              </Text>
            </View>

            {/* URLs Found */}
            {scanResult.urls.length > 0 && (
              <View style={styles.urlsCard}>
                <Text style={styles.cardTitle}>🔗 URLs Found ({scanResult.urls.length})</Text>
                {scanResult.urls.map((url, index) => (
                  <View key={index} style={styles.urlItem}>
                    <Text style={styles.urlText} numberOfLines={2}>
                      {url}
                    </Text>
                    {scanResult.urlAnalysis[index] && (
                      <View style={styles.urlRisk}>
                        <Text style={[
                          styles.urlRiskText, 
                          { color: getRiskColor(scanResult.urlAnalysis[index].riskLevel) }
                        ]}>
                          {scanResult.urlAnalysis[index].riskLevel}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Recommendations */}
            <View style={styles.recommendationsCard}>
              <Text style={styles.cardTitle}>💡 Security Recommendations</Text>
              {scanResult.recommendations.map((rec, index) => (
                <Text key={index} style={styles.recommendation}>
                  {rec}
                </Text>
              ))}
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.scanAgainButton}
              onPress={resumeScanning}
            >
              <Ionicons name="qr-code" size={18} color="#4CAF50" />
              <Text style={styles.scanAgainText}>Scan Another</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.shareButton}
              onPress={() => {/* Share results */}}
            >
              <Ionicons name="share" size={18} color="#007AFF" />
              <Text style={styles.shareText}>Share Results</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  if (hasPermission === null) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.permissionText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-off" size={64} color="#666" />
        <Text style={styles.permissionText}>Camera access is required to scan QR codes</Text>
        <TouchableOpacity 
          style={styles.permissionButton}
          onPress={requestCameraPermission}
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        type={Camera.Constants.Type.back}
        flashMode={flashOn ? Camera.Constants.FlashMode.torch : Camera.Constants.FlashMode.off}
        onBarCodeScanned={isScanning ? handleBarCodeScanned : undefined}
        barCodeScannerSettings={{
          barCodeTypes: qrScannerService.getSupportedBarcodeTypes(),
        }}
      >
        {renderScanOverlay()}
      </Camera>
      
      {renderResults()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  overlaySection: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scanArea: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  scanBox: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#4CAF50',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  scanLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#4CAF50',
    opacity: 0.8,
  },
  scanInstruction: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 30,
    paddingHorizontal: 40,
  },
  processingIndicator: {
    marginTop: 20,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
    paddingBottom: 20,
  },
  controlButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  controlButtonText: {
    color: '#4CAF50',
    fontSize: 12,
    marginTop: 4,
  },
  privacyNote: {
    color: '#ccc',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 40,
    paddingBottom: 20,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  permissionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 20,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  resultsTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  resultsScroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  riskCard: {
    borderRadius: 12,
    padding: 20,
    marginVertical: 15,
  },
  riskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riskInfo: {
    marginLeft: 15,
    flex: 1,
  },
  riskLevel: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  riskScore: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 2,
  },
  dataTypeCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
  },
  dataTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  dataTypeTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  dataContent: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    backgroundColor: '#0f3460',
    padding: 12,
    borderRadius: 8,
  },
  urlsCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  urlItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f3460',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  urlText: {
    color: '#ccc',
    fontSize: 13,
    flex: 1,
    marginRight: 10,
  },
  urlRisk: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  urlRiskText: {
    fontSize: 10,
    fontWeight: '600',
  },
  recommendationsCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  recommendation: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  scanAgainButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF5020',
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 10,
  },
  scanAgainText: {
    color: '#4CAF50',
    marginLeft: 5,
    fontSize: 14,
    fontWeight: '600',
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF20',
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 10,
  },
  shareText: {
    color: '#007AFF',
    marginLeft: 5,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default QRScannerScreen;
