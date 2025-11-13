import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Animated,
  Dimensions,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { CameraView, Camera, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import enhancedQRScannerService from '../services/enhancedQRScannerService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function EnhancedQRScannerScreen({ navigation, route }) {
  const { t } = useTranslation();
  
  // Camera permissions
  const [permission, requestPermission] = useCameraPermissions();
  
  // Camera and scanning state
  const [isScanning, setIsScanning] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('back');
  const [lastScanResult, setLastScanResult] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  
  // Animation refs
  const scanLineAnimation = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  
  // Camera ref
  const cameraRef = useRef(null);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
    loadScanHistory();
    startScanLineAnimation();
  }, []);

  useEffect(() => {
    // Handle navigation params (if opened from URL scan)
    if (route.params?.fromUrlScanner) {
      console.log('Opened from URL scanner');
    }
  }, [route.params]);

  const handlePermissionRequest = async () => {
    const result = await requestPermission();
    
    if (!result?.granted) {
      Alert.alert(
        'Camera Permission Required',
        'Please enable camera permissions to scan QR codes.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Settings', onPress: () => {/* Open app settings */} }
        ]
      );
    }
  };

  const loadScanHistory = () => {
    const history = enhancedQRScannerService.getScanHistory();
    setScanHistory(history);
  };

  const startScanLineAnimation = () => {
    const animate = () => {
      scanLineAnimation.setValue(0);
      Animated.timing(scanLineAnimation, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: false,
      }).start(animate);
    };
    animate();
  };

  const handleBarCodeScanned = async ({ type, data }) => {
    if (!isScanning || isProcessing) return;

    setIsScanning(false);
    setIsProcessing(true);

    // Haptic feedback
    try {
      const { Haptics } = require('expo-haptics');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      // Haptics not available
    }

    try {
      // Process QR code with enhanced service
      const scanResult = await enhancedQRScannerService.processQRCode(data);
      setLastScanResult(scanResult);
      
      // Update scan history
      const updatedHistory = enhancedQRScannerService.getScanHistory();
      setScanHistory(updatedHistory);

      // Show success animation
      Animated.sequence([
        Animated.timing(overlayOpacity, { toValue: 0.3, duration: 200, useNativeDriver: false }),
        Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: false }),
      ]).start();

    } catch (error) {
      Alert.alert('Scan Error', error.message || 'Failed to process QR code');
    } finally {
      setIsProcessing(false);
      // Re-enable scanning after 2 seconds
      setTimeout(() => setIsScanning(true), 2000);
    }
  };

  const toggleFlash = () => {
    setFlashEnabled(!flashEnabled);
  };

  const flipCamera = () => {
    setCameraFacing(current => 
      current === 'back' ? 'front' : 'back'
    );
  };

  const renderScanOverlay = () => {
    const scanLinePosition = scanLineAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 200],
    });

    return (
      <View style={styles.overlay}>
        <Animated.View style={[styles.overlayContent, { opacity: overlayOpacity }]}>
          {/* Header */}
          <View style={styles.overlayTop}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            
            <Text style={styles.headerTitle}>QR Scanner</Text>
            
            <TouchableOpacity 
              style={styles.historyButton}
              onPress={() => navigation.navigate('QRHistory', { history: scanHistory })}
            >
              <Ionicons name="time" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Scan area */}
          <View style={styles.scanArea}>
            <View style={styles.scanFrame}>
              {/* Corner indicators */}
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              
              {/* Animated scan line */}
              {isScanning && !isProcessing && (
                <Animated.View 
                  style={[
                    styles.scanLine,
                    { top: scanLinePosition }
                  ]} 
                />
              )}
            </View>
            
            <Text style={styles.scanInstruction}>
              {isProcessing 
                ? 'Processing QR Code...' 
                : isScanning 
                ? 'Point camera at QR code'
                : 'QR Code detected!'
              }
            </Text>
            
            {isProcessing && (
              <ActivityIndicator 
                size="large" 
                color="#4CAF50" 
                style={styles.processingIndicator} 
              />
            )}

            {/* Last scan result preview */}
            {lastScanResult && (
              <View style={styles.lastScanPreview}>
                <View style={styles.scanResultHeader}>
                  <Ionicons 
                    name={lastScanResult.isPayment ? 'card' : 'link'} 
                    size={16} 
                    color="#4CAF50" 
                  />
                  <Text style={styles.scanResultType}>
                    {lastScanResult.isPayment ? 'Payment QR' : 'Link/Text QR'}
                  </Text>
                </View>
                <Text style={styles.scanResultData} numberOfLines={2}>
                  {lastScanResult.data}
                </Text>
              </View>
            )}
          </View>

          {/* Controls */}
          <View style={styles.overlayBottom}>
            <View style={styles.controls}>
              <TouchableOpacity 
                style={styles.controlButton}
                onPress={toggleFlash}
              >
                <Ionicons 
                  name={flashEnabled ? 'flash' : 'flash-off'} 
                  size={24} 
                  color="#fff" 
                />
                <Text style={styles.controlLabel}>Flash</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.controlButton}
                onPress={() => navigation.navigate('Link Scanner')}
              >
                <Ionicons name="link" size={24} color="#4CAF50" />
                <Text style={styles.controlLabel}>URL Scanner</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.controlButton}
                onPress={flipCamera}
              >
                <Ionicons name="camera-reverse" size={24} color="#fff" />
                <Text style={styles.controlLabel}>Flip</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.privacyNote}>
              🔒 QR codes are analyzed locally for security
            </Text>
          </View>
        </Animated.View>
      </View>
    );
  };

  const renderScanStats = () => {
    const stats = enhancedQRScannerService.getScanStats();
    
    return (
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.totalScans}</Text>
          <Text style={styles.statLabel}>Total Scans</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.paymentScans}</Text>
          <Text style={styles.statLabel}>Payment QRs</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.urlScans}</Text>
          <Text style={styles.statLabel}>Link QRs</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.maliciousFound}</Text>
          <Text style={styles.statLabel}>Threats</Text>
        </View>
      </View>
    );
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Requesting camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.noPermissionContainer}>
          <Ionicons name="camera-off" size={64} color="#666" />
          <Text style={styles.noPermissionTitle}>Camera Access Required</Text>
          <Text style={styles.noPermissionText}>
            Please enable camera permissions in Settings to use the QR scanner.
          </Text>
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={handlePermissionRequest}
          >
            <Text style={styles.settingsButtonText}>Request Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={cameraFacing}
        enableTorch={flashEnabled}
        onBarcodeScanned={handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      >
        {renderScanOverlay()}
      </CameraView>

      {/* Stats overlay */}
      <View style={styles.statsOverlay}>
        {renderScanStats()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  noPermissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    paddingHorizontal: 40,
  },
  noPermissionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  noPermissionText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
  },
  settingsButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  settingsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlayContent: {
    flex: 1,
  },
  overlayTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  historyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#4CAF50',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  scanInstruction: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 30,
    fontWeight: '600',
  },
  processingIndicator: {
    marginTop: 20,
  },
  lastScanPreview: {
    backgroundColor: 'rgba(26, 26, 46, 0.9)',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    maxWidth: 280,
  },
  scanResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  scanResultType: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  scanResultData: {
    color: '#fff',
    fontSize: 12,
    lineHeight: 16,
  },
  overlayBottom: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 20,
  },
  controlButton: {
    alignItems: 'center',
    padding: 10,
  },
  controlLabel: {
    color: '#fff',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '600',
  },
  privacyNote: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  statsOverlay: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(26, 26, 46, 0.9)',
    borderRadius: 12,
    padding: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    color: '#4CAF50',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#888',
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
});
