import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
  Dimensions,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import FilesystemScanService from '../services/filesystem/FilesystemScanService';

const { width } = Dimensions.get('window');

export default function FilesystemScanScreen({ navigation }) {
  const { t } = useTranslation();
  const [scanStatus, setScanStatus] = useState({ isScanning: false });
  const [scanProgress, setScanProgress] = useState({});
  const [scanResults, setScanResults] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const [serviceStats, setServiceStats] = useState({});
  const [showDetails, setShowDetails] = useState(false);
  const [selectedScan, setSelectedScan] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const scanIntervalRef = useRef(null);

  useEffect(() => {
    initializeService();
    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Poll scan status during active scan
    if (scanStatus.isScanning) {
      scanIntervalRef.current = setInterval(updateScanStatus, 1000);
    } else {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    }

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, [scanStatus.isScanning]);

  const initializeService = async () => {
    try {
      await FilesystemScanService.initialize();
      updateScanStatus();
      updateScanHistory();
      updateServiceStats();
    } catch (error) {
      console.error('Error initializing filesystem scan service:', error);
      Alert.alert('Error', 'Failed to initialize filesystem scanner');
    }
  };

  const updateScanStatus = () => {
    const status = FilesystemScanService.getCurrentScanStatus();
    setScanStatus(status);
  };

  const updateScanHistory = () => {
    const history = FilesystemScanService.getScanHistory();
    setScanHistory(history);
  };

  const updateServiceStats = () => {
    const stats = FilesystemScanService.getStatistics();
    setServiceStats(stats);
  };

  const startFullScan = async () => {
    try {
      Alert.alert(
        'Full Filesystem Scan',
        'This will scan all accessible files on your device. This may take several minutes and consume battery. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Start Scan', 
            onPress: () => performFullScan()
          }
        ]
      );
    } catch (error) {
      console.error('Error starting scan:', error);
      Alert.alert('Error', 'Failed to start filesystem scan');
    }
  };

  const performFullScan = async () => {
    try {
      setScanResults(null);
      setScanProgress({});

      const result = await FilesystemScanService.startFullScan({
        scanType: 'full',
        includeMediaStore: true,
        includeSAF: false,
        includeAppFiles: true,
        maxFiles: 5000, // Limit for demo
        onProgress: (progress) => {
          setScanProgress(progress);
        },
        onFileComplete: (fileResult) => {
          // Could update a live feed here
        },
        onPhaseChange: (phase) => {
          setScanProgress(prev => ({ ...prev, ...phase }));
        },
        onComplete: (result) => {
          setScanResults(result);
          updateScanHistory();
          updateServiceStats();
          
          // Show completion notification
          const { stats } = result;
          Alert.alert(
            'Scan Complete',
            `Scanned ${stats.processedFiles} files.\n${stats.threatsFound} threats detected.`,
            [{ text: 'View Results', onPress: () => setShowDetails(true) }]
          );
        }
      });

    } catch (error) {
      console.error('Scan failed:', error);
      Alert.alert('Scan Failed', error.message);
    }
  };

  const startQuickScan = async () => {
    try {
      setScanResults(null);
      setScanProgress({});

      const result = await FilesystemScanService.startFullScan({
        scanType: 'quick',
        includeMediaStore: false,
        includeSAF: false,
        includeAppFiles: true,
        maxFiles: 500,
        skipReputationCheck: true,
        onProgress: (progress) => {
          setScanProgress(progress);
        },
        onPhaseChange: (phase) => {
          setScanProgress(prev => ({ ...prev, ...phase }));
        },
        onComplete: (result) => {
          setScanResults(result);
          updateScanHistory();
          updateServiceStats();
          
          Alert.alert(
            'Quick Scan Complete',
            `Scanned ${result.stats.processedFiles} app files.\n${result.stats.threatsFound} threats detected.`
          );
        }
      });

    } catch (error) {
      console.error('Quick scan failed:', error);
      Alert.alert('Quick Scan Failed', error.message);
    }
  };

  const stopScan = async () => {
    try {
      await FilesystemScanService.stopCurrentScan();
      Alert.alert('Scan Stopped', 'Filesystem scan has been cancelled.');
    } catch (error) {
      console.error('Error stopping scan:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    updateScanStatus();
    updateScanHistory();
    updateServiceStats();
    setRefreshing(false);
  };

  const renderScanProgress = () => {
    if (!scanStatus.isScanning) return null;

    return (
      <View style={styles.progressContainer}>
        <LinearGradient colors={['#FF6B6B', '#4ECDC4']} style={styles.progressCard}>
          <Text style={styles.progressTitle}>🔍 {scanProgress.phase || 'Scanning'}</Text>
          <Text style={styles.progressDescription}>
            {scanProgress.description || 'Processing files...'}
          </Text>
          
          {scanProgress.processed && scanProgress.total && (
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${(scanProgress.processed / scanProgress.total) * 100}%` }
                ]} 
              />
            </View>
          )}
          
          <View style={styles.progressStats}>
            <Text style={styles.progressText}>
              Files: {scanProgress.processed || 0} / {scanProgress.total || '?'}
            </Text>
            <Text style={styles.progressText}>
              Threats: {scanProgress.threatsFound || 0}
            </Text>
          </View>

          {scanProgress.currentFile && (
            <Text style={styles.currentFile} numberOfLines={1}>
              📄 {scanProgress.currentFile}
            </Text>
          )}

          <TouchableOpacity style={styles.stopButton} onPress={stopScan}>
            <Text style={styles.stopButtonText}>Stop Scan</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  };

  const renderScanResults = () => {
    if (!scanResults) return null;

    const { stats, analysis } = scanResults;
    const riskLevel = analysis?.threatSummary?.riskScore || 0;
    const riskColor = riskLevel > 75 ? '#FF6B6B' : riskLevel > 40 ? '#FFA726' : '#4CAF50';

    return (
      <View style={styles.resultsContainer}>
        <LinearGradient colors={['#667db6', '#0082c8']} style={styles.resultsCard}>
          <Text style={styles.resultsTitle}>📊 Last Scan Results</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.processedFiles}</Text>
              <Text style={styles.statLabel}>Files Scanned</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#FF6B6B' }]}>{stats.threatsFound}</Text>
              <Text style={styles.statLabel}>Threats Found</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: riskColor }]}>{riskLevel}</Text>
              <Text style={styles.statLabel}>Risk Score</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.detailsButton} 
            onPress={() => {
              setSelectedScan(scanResults);
              setShowDetails(true);
            }}
          >
            <Text style={styles.detailsButtonText}>View Details</Text>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  };

  const renderScanHistory = () => {
    return (
      <View style={styles.historyContainer}>
        <Text style={styles.sectionTitle}>📋 Scan History</Text>
        
        <FlatList
          data={scanHistory.slice(0, 5)} // Show last 5 scans
          keyExtractor={(item) => item.sessionId}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.historyItem}
              onPress={() => {
                setSelectedScan(item);
                setShowDetails(true);
              }}
            >
              <View style={styles.historyInfo}>
                <Text style={styles.historyTitle}>
                  {item.scanType.charAt(0).toUpperCase() + item.scanType.slice(1)} Scan
                </Text>
                <Text style={styles.historyDate}>
                  {new Date(item.endTime).toLocaleString()}
                </Text>
                <Text style={styles.historyStats}>
                  {item.stats.processedFiles} files • {item.stats.threatsFound} threats
                </Text>
              </View>
              <View style={styles.historyStatus}>
                <Ionicons 
                  name={item.stats.threatsFound > 0 ? "warning" : "checkmark-circle"} 
                  size={24} 
                  color={item.stats.threatsFound > 0 ? "#FFA726" : "#4CAF50"} 
                />
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No scan history available</Text>
          }
        />
      </View>
    );
  };

  const renderServiceStats = () => {
    return (
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>⚙️ Service Statistics</Text>
        
        <View style={styles.serviceStatsGrid}>
          <View style={styles.serviceStatItem}>
            <Text style={styles.serviceStatNumber}>{serviceStats.totalScans || 0}</Text>
            <Text style={styles.serviceStatLabel}>Total Scans</Text>
          </View>
          <View style={styles.serviceStatItem}>
            <Text style={styles.serviceStatNumber}>{serviceStats.totalFilesScanned || 0}</Text>
            <Text style={styles.serviceStatLabel}>Files Scanned</Text>
          </View>
          <View style={styles.serviceStatItem}>
            <Text style={styles.serviceStatNumber}>{serviceStats.totalThreatsFound || 0}</Text>
            <Text style={styles.serviceStatLabel}>Threats Found</Text>
          </View>
        </View>

        {serviceStats.subServices && (
          <View style={styles.subServicesStatus}>
            <Text style={styles.subServicesTitle}>Sub-Services Status:</Text>
            <Text style={styles.subServiceText}>
              🔍 YARA Rules: {serviceStats.subServices.yara?.totalRules || 0}
            </Text>
            <Text style={styles.subServiceText}>
              🛡️ Reputation Cache: {serviceStats.subServices.reputation?.cacheSize || 0} entries
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderScanDetails = () => {
    if (!selectedScan) return null;

    const { stats, analysis, duration } = selectedScan;

    return (
      <Modal
        visible={showDetails}
        animationType="slide"
        onRequestClose={() => setShowDetails(false)}
      >
        <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Scan Details</Text>
            <TouchableOpacity onPress={() => setShowDetails(false)}>
              <Ionicons name="close" size={30} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Scan Overview */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>📊 Scan Overview</Text>
              <View style={styles.detailGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Duration</Text>
                  <Text style={styles.detailValue}>
                    {Math.round((duration || 0) / 1000)}s
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Files Processed</Text>
                  <Text style={styles.detailValue}>{stats.processedFiles}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Threats Found</Text>
                  <Text style={[styles.detailValue, { color: '#FF6B6B' }]}>
                    {stats.threatsFound}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Errors</Text>
                  <Text style={styles.detailValue}>{stats.errors || 0}</Text>
                </View>
              </View>
            </View>

            {/* Threat Summary */}
            {analysis?.threatSummary && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>🚨 Threat Summary</Text>
                <View style={styles.threatSummary}>
                  <Text style={styles.threatText}>
                    Malicious Files: {analysis.threatSummary.maliciousFiles}
                  </Text>
                  <Text style={styles.threatText}>
                    Suspicious Files: {analysis.threatSummary.suspiciousFiles}
                  </Text>
                  <Text style={styles.threatText}>
                    Clean Files: {analysis.threatSummary.cleanFiles}
                  </Text>
                  <Text style={styles.riskScore}>
                    Risk Score: {analysis.threatSummary.riskScore}/100
                  </Text>
                </View>

                {analysis.threatSummary.topThreats.length > 0 && (
                  <View style={styles.topThreats}>
                    <Text style={styles.topThreatsTitle}>Top Threats:</Text>
                    {analysis.threatSummary.topThreats.map((threat, index) => (
                      <Text key={index} style={styles.threatItem}>
                        • {threat.name} ({threat.count}x) - {threat.severity}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Recommendations */}
            {analysis?.recommendations && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>💡 Recommendations</Text>
                {analysis.recommendations.map((recommendation, index) => (
                  <View key={index} style={styles.recommendationItem}>
                    <Text style={[
                      styles.recommendationPriority,
                      { 
                        color: recommendation.priority === 'critical' ? '#FF6B6B' :
                               recommendation.priority === 'high' ? '#FFA726' : '#4CAF50'
                      }
                    ]}>
                      {recommendation.priority.toUpperCase()}
                    </Text>
                    <Text style={styles.recommendationTitle}>{recommendation.title}</Text>
                    <Text style={styles.recommendationDescription}>{recommendation.description}</Text>
                    <Text style={styles.recommendationAction}>{recommendation.action}</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </LinearGradient>
      </Modal>
    );
  };

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="folder-open" size={24} color="#4CAF50" />
          <Text style={styles.headerTitle}>Filesystem Scanner</Text>
        </View>

        {/* Scan Progress */}
        {renderScanProgress()}

        {/* Scan Results */}
        {renderScanResults()}

        {/* Scan Controls */}
        {!scanStatus.isScanning && (
          <View style={styles.controlsContainer}>
            <TouchableOpacity style={styles.scanButton} onPress={startFullScan}>
              <LinearGradient colors={['#4CAF50', '#45a049']} style={styles.scanButtonGradient}>
                <Ionicons name="scan" size={24} color="#fff" />
                <Text style={styles.scanButtonText}>Full Scan</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickScanButton} onPress={startQuickScan}>
              <LinearGradient colors={['#2196F3', '#1976D2']} style={styles.scanButtonGradient}>
                <Ionicons name="flash" size={24} color="#fff" />
                <Text style={styles.scanButtonText}>Quick Scan</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Scan History */}
        {renderScanHistory()}

        {/* Service Statistics */}
        {renderServiceStats()}
      </ScrollView>

      {/* Scan Details Modal */}
      {renderScanDetails()}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 15,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressCard: {
    padding: 20,
    borderRadius: 15,
    elevation: 5,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  progressDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 15,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    marginBottom: 15,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  progressText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  currentFile: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginBottom: 15,
    fontFamily: 'monospace',
  },
  stopButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignSelf: 'center',
  },
  stopButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  resultsContainer: {
    marginBottom: 20,
  },
  resultsCard: {
    padding: 20,
    borderRadius: 15,
    elevation: 5,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    borderRadius: 25,
  },
  detailsButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginRight: 5,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  scanButton: {
    flex: 1,
    marginRight: 10,
    borderRadius: 15,
    elevation: 5,
  },
  quickScanButton: {
    flex: 1,
    marginLeft: 10,
    borderRadius: 15,
    elevation: 5,
  },
  scanButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 15,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  historyContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  historyInfo: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  historyDate: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  historyStats: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5,
  },
  historyStatus: {
    marginLeft: 15,
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 20,
  },
  statsContainer: {
    marginBottom: 30,
  },
  serviceStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
  },
  serviceStatItem: {
    alignItems: 'center',
  },
  serviceStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  serviceStatLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5,
    textAlign: 'center',
  },
  subServicesStatus: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 15,
    borderRadius: 10,
  },
  subServicesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  subServiceText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 5,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    paddingTop: 50,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  detailSection: {
    marginVertical: 20,
  },
  detailSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  detailItem: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 5,
  },
  detailValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  threatSummary: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  threatText: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 5,
  },
  riskScore: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFA726',
    marginTop: 10,
  },
  topThreats: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    padding: 15,
    borderRadius: 10,
  },
  topThreatsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 10,
  },
  threatItem: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 5,
  },
  recommendationItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  recommendationPriority: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  recommendationDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 10,
  },
  recommendationAction: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
});

