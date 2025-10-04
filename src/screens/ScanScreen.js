import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../app/theme';
import { useSecurity } from '../state/SecurityProvider';
import RiskGauge from '../components/RiskGauge';
import StatusCard from '../components/StatusCard';
import { formatTimestamp } from '../utils/formatting';

const ScanScreen = () => {
  const { 
    securityScore, 
    vulnerabilities, 
    threats, 
    performSecurityScan, 
    isScanning 
  } = useSecurity();
  
  const [scanHistory, setScanHistory] = useState([]);
  const [lastScanTime, setLastScanTime] = useState(null);

  const handleScan = async () => {
    try {
      const startTime = Date.now();
      await performSecurityScan();
      const endTime = Date.now();
      
      setLastScanTime(new Date().toISOString());
      setScanHistory(prev => [{
        timestamp: new Date().toISOString(),
        duration: endTime - startTime,
        score: securityScore,
        vulnerabilities: vulnerabilities.length,
        threats: threats.length,
      }, ...prev.slice(0, 9)]);
      
      Alert.alert(
        'Scan Complete',
        `Security scan completed in ${Math.round((endTime - startTime) / 1000)}s`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Scan Error', 'Failed to complete security scan');
    }
  };

  const getScanStatus = () => {
    if (securityScore >= 80) return 'success';
    if (securityScore >= 60) return 'warning';
    return 'error';
  };

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Security Scanner</Text>
          <Text style={styles.subtitle}>Comprehensive Android security analysis</Text>
        </View>

        {/* Security Score */}
        <View style={styles.scoreSection}>
          <Text style={styles.sectionTitle}>Current Security Score</Text>
          <View style={styles.scoreContainer}>
            <RiskGauge score={securityScore} size="large" />
            <View style={styles.scoreInfo}>
              <Text style={styles.scoreLabel}>
                {securityScore >= 80 ? 'Excellent' : 
                 securityScore >= 60 ? 'Good' : 
                 securityScore >= 40 ? 'Poor' : 'Critical'}
              </Text>
              <Text style={styles.scoreDescription}>
                {securityScore >= 80 ? 'Your device is well protected' :
                 securityScore >= 60 ? 'Some security improvements needed' :
                 securityScore >= 40 ? 'Security issues detected' : 'Critical security issues found'}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Security Overview</Text>
          <View style={styles.statsGrid}>
            <StatusCard
              title="Vulnerabilities"
              value={vulnerabilities.length}
              status={vulnerabilities.length > 0 ? 'error' : 'success'}
              icon="warning"
              size="small"
            />
            <StatusCard
              title="Threats"
              value={threats.length}
              status={threats.length > 0 ? 'error' : 'success'}
              icon="shield"
              size="small"
            />
            <StatusCard
              title="Last Scan"
              value={lastScanTime ? formatTimestamp(lastScanTime) : 'Never'}
              status="info"
              icon="time"
              size="small"
            />
            <StatusCard
              title="Status"
              value={getScanStatus() === 'success' ? 'Secure' : 'At Risk'}
              status={getScanStatus()}
              icon="checkmark-circle"
              size="small"
            />
          </View>
        </View>

        {/* Scan Button */}
        <View style={styles.scanSection}>
          <TouchableOpacity
            style={[styles.scanButton, isScanning && styles.scanButtonDisabled]}
            onPress={handleScan}
            disabled={isScanning}
          >
            <LinearGradient
              colors={isScanning ? ['#666', '#555'] : ['#4CAF50', '#388E3C']}
              style={styles.scanButtonGradient}
            >
              <Ionicons 
                name={isScanning ? "sync" : "scan"} 
                size={24} 
                color="#fff" 
                style={isScanning && styles.rotatingIcon}
              />
              <Text style={styles.scanButtonText}>
                {isScanning ? 'Scanning...' : 'Start Security Scan'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Scan History */}
        {scanHistory.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>Scan History</Text>
            {scanHistory.map((scan, index) => (
              <View key={index} style={styles.historyItem}>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyTime}>
                    {formatTimestamp(scan.timestamp)}
                  </Text>
                  <Text style={styles.historyDuration}>
                    Duration: {Math.round(scan.duration / 1000)}s
                  </Text>
                </View>
                <View style={styles.historyStats}>
                  <Text style={styles.historyScore}>Score: {scan.score}</Text>
                  <Text style={styles.historyIssues}>
                    Issues: {scan.vulnerabilities + scan.threats}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: SIZES.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  title: {
    fontSize: SIZES.fontSizeTitle,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SIZES.xs,
  },
  subtitle: {
    fontSize: SIZES.fontSizeMd,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  scoreSection: {
    marginBottom: SIZES.lg,
  },
  sectionTitle: {
    fontSize: SIZES.fontSizeLg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.md,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.lg,
    ...SHADOWS.medium,
  },
  scoreInfo: {
    flex: 1,
    marginLeft: SIZES.lg,
  },
  scoreLabel: {
    fontSize: SIZES.fontSizeLg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SIZES.xs,
  },
  scoreDescription: {
    fontSize: SIZES.fontSizeSm,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  statsSection: {
    marginBottom: SIZES.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  scanSection: {
    marginBottom: SIZES.lg,
  },
  scanButton: {
    borderRadius: SIZES.radiusLg,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  scanButtonDisabled: {
    opacity: 0.6,
  },
  scanButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.lg,
    paddingHorizontal: SIZES.xl,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: SIZES.fontSizeLg,
    fontWeight: 'bold',
    marginLeft: SIZES.sm,
  },
  rotatingIcon: {
    transform: [{ rotate: '360deg' }],
  },
  historySection: {
    marginBottom: SIZES.lg,
  },
  historyItem: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  historyInfo: {
    flex: 1,
  },
  historyTime: {
    fontSize: SIZES.fontSizeMd,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.xs,
  },
  historyDuration: {
    fontSize: SIZES.fontSizeSm,
    color: COLORS.textTertiary,
  },
  historyStats: {
    alignItems: 'flex-end',
  },
  historyScore: {
    fontSize: SIZES.fontSizeMd,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.xs,
  },
  historyIssues: {
    fontSize: SIZES.fontSizeSm,
    color: COLORS.textTertiary,
  },
});

export default ScanScreen; 