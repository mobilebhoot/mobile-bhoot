import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Share,
  Vibration
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import urlScannerService from '../services/urlScanner';

const LinkScannerScreen = ({ navigation }) => {
  const [url, setUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadScanStats();
    loadRecentScans();
    checkClipboard();
  }, []);

  const checkClipboard = async () => {
    try {
      const clipboardContent = await Clipboard.getStringAsync();
      if (clipboardContent && isValidURL(clipboardContent)) {
        // Show option to scan clipboard content
        Alert.alert(
          '🔗 Link Detected in Clipboard',
          `Would you like to scan this link?\n\n${clipboardContent.substring(0, 100)}${clipboardContent.length > 100 ? '...' : ''}`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Scan Link', 
              onPress: () => {
                setUrl(clipboardContent);
                performScan(clipboardContent);
              }
            }
          ]
        );
      }
    } catch (error) {
      console.warn('Failed to check clipboard:', error);
    }
  };

  const isValidURL = (string) => {
    try {
      new URL(string.startsWith('http') ? string : `https://${string}`);
      return true;
    } catch {
      return false;
    }
  };

  const loadScanStats = async () => {
    try {
      const statistics = await urlScannerService.getScanStats();
      setStats(statistics);
    } catch (error) {
      console.error('Failed to load scan stats:', error);
    }
  };

  const loadRecentScans = async () => {
    // This would load recent scans from storage
    // For now, we'll use mock data
    setScanHistory([]);
  };

  const performScan = async (urlToScan = url) => {
    if (!urlToScan.trim()) {
      Alert.alert('Error', 'Please enter a URL to scan');
      return;
    }

    setIsScanning(true);
    setScanResult(null);

    try {
      const result = await urlScannerService.scanURL(urlToScan);
      setScanResult(result);
      
      // Provide haptic feedback based on result
      if (result.riskLevel === 'DANGEROUS') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Vibration.vibrate([0, 100, 100, 100]);
      } else if (result.riskLevel === 'SUSPICIOUS') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Vibration.vibrate(100);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Update stats
      loadScanStats();
      
    } catch (error) {
      Alert.alert('Scan Failed', 'Unable to scan the URL. Please try again.');
      console.error('URL scan failed:', error);
    } finally {
      setIsScanning(false);
    }
  };

  const pasteFromClipboard = async () => {
    try {
      const clipboardContent = await Clipboard.getStringAsync();
      if (clipboardContent) {
        setUrl(clipboardContent);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to paste from clipboard');
    }
  };

  const clearInput = () => {
    setUrl('');
    setScanResult(null);
  };

  const shareResults = async () => {
    if (!scanResult) return;

    const message = `🛡️ PocketShield Link Scan Results\n\n` +
      `URL: ${scanResult.url}\n` +
      `Risk Level: ${scanResult.riskLevel}\n` +
      `Risk Score: ${scanResult.riskScore}/100\n` +
      `Summary: ${scanResult.summary}\n\n` +
      `Scanned with PocketShield - Advanced Mobile Security`;

    try {
      await Share.share({
        message: message,
        title: 'Link Scan Results'
      });
    } catch (error) {
      console.error('Failed to share results:', error);
    }
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

  const renderScanStats = () => {
    if (!stats) return null;

    return (
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>📊 Scan Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Scans</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#FF4444' }]}>{stats.dangerous}</Text>
            <Text style={styles.statLabel}>Dangerous</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#FF8800' }]}>{stats.suspicious}</Text>
            <Text style={styles.statLabel}>Suspicious</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#00C851' }]}>{stats.safe}</Text>
            <Text style={styles.statLabel}>Safe</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderScanResult = () => {
    if (!scanResult || !scanResult.isValid) return null;

    const riskColor = getRiskColor(scanResult.riskLevel);
    const riskIcon = getRiskIcon(scanResult.riskLevel);

    return (
      <View style={styles.resultContainer}>
        <View style={[styles.resultHeader, { backgroundColor: riskColor + '20' }]}>
          <Ionicons name={riskIcon} size={24} color={riskColor} />
          <Text style={[styles.riskLevel, { color: riskColor }]}>
            {scanResult.riskLevel}
          </Text>
          <Text style={styles.riskScore}>
            {scanResult.riskScore}/100
          </Text>
        </View>

        <Text style={styles.summary}>{scanResult.summary}</Text>

        {/* Recommendations */}
        {scanResult.recommendations && (
          <View style={styles.recommendationsContainer}>
            <Text style={styles.sectionTitle}>💡 Recommendations</Text>
            {scanResult.recommendations.map((rec, index) => (
              <Text key={index} style={styles.recommendation}>
                {rec}
              </Text>
            ))}
          </View>
        )}

        {/* Threats Found */}
        {scanResult.threats && scanResult.threats.length > 0 && (
          <View style={styles.threatsContainer}>
            <Text style={styles.sectionTitle}>⚠️ Threats Detected</Text>
            {scanResult.threats.map((threat, index) => (
              <View key={index} style={styles.threatItem}>
                <Text style={[styles.threatType, { color: getRiskColor(threat.severity) }]}>
                  {threat.type.replace(/_/g, ' ').toUpperCase()}
                </Text>
                <Text style={styles.threatDetails}>{threat.details}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.shareButton}
            onPress={shareResults}
          >
            <Ionicons name="share" size={18} color="#007AFF" />
            <Text style={styles.shareButtonText}>Share Results</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.newScanButton}
            onPress={() => {
              setScanResult(null);
              setUrl('');
            }}
          >
            <Ionicons name="refresh" size={18} color="#4CAF50" />
            <Text style={styles.newScanButtonText}>New Scan</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="link" size={32} color="#4CAF50" />
          <Text style={styles.title}>Link Scanner</Text>
          <Text style={styles.subtitle}>
            Detect malicious links from WhatsApp, SMS, and other messages
          </Text>
        </View>

        {/* URL Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>🔗 Enter URL to scan:</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.urlInput}
              value={url}
              onChangeText={setUrl}
              placeholder="https://example.com or paste link here"
              placeholderTextColor="#666"
              multiline
              textAlignVertical="top"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {url.length > 0 && (
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={clearInput}
              >
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.inputActions}>
            <TouchableOpacity 
              style={styles.pasteButton}
              onPress={pasteFromClipboard}
            >
              <Ionicons name="clipboard" size={16} color="#007AFF" />
              <Text style={styles.pasteButtonText}>Paste</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Scan Button */}
        <TouchableOpacity 
          style={[styles.scanButton, isScanning && styles.scanButtonDisabled]}
          onPress={() => performScan()}
          disabled={isScanning || !url.trim()}
        >
          {isScanning ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="shield-checkmark" size={20} color="#fff" />
          )}
          <Text style={styles.scanButtonText}>
            {isScanning ? 'Scanning...' : 'Scan Link'}
          </Text>
        </TouchableOpacity>

        {/* Scan Result */}
        {renderScanResult()}

        {/* Quick Actions */}
        {!scanResult && (
          <View style={styles.quickActions}>
            <Text style={styles.quickActionsTitle}>⚡ Quick Actions</Text>
            
            {/* Temporarily disabled - QR Scanner will be re-enabled after successful build */}
            {/* <TouchableOpacity 
              style={styles.quickActionItem}
              onPress={() => navigation.navigate('QRScanner')}
            >
              <Ionicons name="qr-code" size={20} color="#4CAF50" />
              <Text style={styles.quickActionText}>QR Code Scanner</Text>
            </TouchableOpacity> */}

            <TouchableOpacity 
              style={styles.quickActionItem}
              onPress={checkClipboard}
            >
              <Ionicons name="clipboard" size={20} color="#4CAF50" />
              <Text style={styles.quickActionText}>Check Clipboard</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickActionItem}
              onPress={() => navigation.navigate('Settings')}
            >
              <Ionicons name="settings" size={20} color="#4CAF50" />
              <Text style={styles.quickActionText}>Scanner Settings</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Statistics */}
        {renderScanStats()}

        {/* Tips */}
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>💡 Security Tips</Text>
          <Text style={styles.tip}>
            • Always scan links from unknown sources before clicking
          </Text>
          <Text style={styles.tip}>
            • Be extra cautious with shortened URLs (bit.ly, tinyurl.com)
          </Text>
          <Text style={styles.tip}>
            • Check for spelling errors in website names
          </Text>
          <Text style={styles.tip}>
            • Verify the sender before clicking links in messages
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginTop: 5,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 25,
  },
  inputLabel: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 10,
    fontWeight: '600',
  },
  inputWrapper: {
    position: 'relative',
  },
  urlInput: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 15,
    paddingRight: 45,
    color: '#fff',
    fontSize: 16,
    minHeight: 50,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    top: 15,
  },
  inputActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  pasteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF20',
    borderRadius: 8,
  },
  pasteButtonText: {
    color: '#007AFF',
    marginLeft: 4,
    fontSize: 14,
  },
  scanButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    marginBottom: 25,
  },
  scanButtonDisabled: {
    backgroundColor: '#666',
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  resultContainer: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 20,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 15,
  },
  riskLevel: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginLeft: 10,
  },
  riskScore: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  summary: {
    color: '#ccc',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  recommendationsContainer: {
    marginBottom: 20,
  },
  recommendation: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 5,
    lineHeight: 20,
  },
  threatsContainer: {
    marginBottom: 20,
  },
  threatItem: {
    backgroundColor: '#0f3460',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  threatType: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  threatDetails: {
    color: '#ccc',
    fontSize: 13,
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF20',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 0.48,
    justifyContent: 'center',
  },
  shareButtonText: {
    color: '#007AFF',
    marginLeft: 5,
    fontSize: 14,
    fontWeight: '600',
  },
  newScanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF5020',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 0.48,
    justifyContent: 'center',
  },
  newScanButtonText: {
    color: '#4CAF50',
    marginLeft: 5,
    fontSize: 14,
    fontWeight: '600',
  },
  quickActions: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 20,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  quickActionsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  quickActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
  },
  quickActionText: {
    color: '#ccc',
    marginLeft: 12,
    fontSize: 16,
  },
  statsContainer: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 20,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  statsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    color: '#4CAF50',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },
  tipsContainer: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  tipsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  tip: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
});

export default LinkScannerScreen;
