import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  FlatList,
  Dimensions,
  Switch,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { useTranslation } from 'react-i18next';
import fileSecurityService from '../services/fileSecurityService';
import fileMonitoringService from '../services/fileMonitoringService';

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - 40;

export default function FileSecurityScreen({ navigation }) {
  const { t } = useTranslation();
  
  // Main state
  const [activeTab, setActiveTab] = useState('scanner'); // 'scanner', 'monitor', 'quarantine'
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Scanner state
  const [scanHistory, setScanHistory] = useState([]);
  const [scanStats, setScanStats] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [currentScan, setCurrentScan] = useState(null);

  // Monitoring state
  const [isMonitoringEnabled, setIsMonitoringEnabled] = useState(false);
  const [monitoringStats, setMonitoringStats] = useState(null);
  const [realTimeAlerts, setRealTimeAlerts] = useState([]);

  // Quarantine state
  const [quarantinedFiles, setQuarantinedFiles] = useState([]);
  
  // Modal state
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showScanDetails, setShowScanDetails] = useState(false);
  const [selectedScanResult, setSelectedScanResult] = useState(null);

  // Animation
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    initializeServices();
    startRealTimeUpdates();
    startPulseAnimation();
  }, []);

  const initializeServices = async () => {
    setIsLoading(true);
    try {
      // Load scan history and stats
      const history = fileSecurityService.getScanHistory();
      const stats = fileSecurityService.getScanStats();
      setScanHistory(history);
      setScanStats(stats);

      // Load monitoring status and alerts
      const monitoringStatus = fileMonitoringService.getMonitoringStats();
      const alerts = fileMonitoringService.getRealTimeAlerts();
      setIsMonitoringEnabled(monitoringStatus.isMonitoring);
      setMonitoringStats(monitoringStatus);
      setRealTimeAlerts(alerts);

      // Load quarantined files
      const quarantined = fileSecurityService.getQuarantinedFiles();
      setQuarantinedFiles(quarantined);

    } catch (error) {
      console.error('Failed to initialize file security:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startRealTimeUpdates = () => {
    const interval = setInterval(() => {
      // Update monitoring stats and alerts
      const stats = fileMonitoringService.getMonitoringStats();
      const alerts = fileMonitoringService.getRealTimeAlerts();
      
      setMonitoringStats(stats);
      setRealTimeAlerts(alerts);
      
      // Update scan history if new scans occurred
      const newHistory = fileSecurityService.getScanHistory();
      const newStats = fileSecurityService.getScanStats();
      setScanHistory(newHistory);
      setScanStats(newStats);
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  };

  const startPulseAnimation = () => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };
    pulse();
  };

  const handlePickAndScanFiles = async () => {
    setIsScanning(true);
    try {
      const results = await fileSecurityService.pickAndScanFiles();
      
      if (results.length > 0) {
        // Update history
        const newHistory = fileSecurityService.getScanHistory();
        setScanHistory(newHistory);
        
        // Show results summary
        const maliciousCount = results.filter(r => r.status === 'malicious').length;
        const suspiciousCount = results.filter(r => 
          ['highly_suspicious', 'suspicious', 'potentially_unwanted'].includes(r.status)
        ).length;
        
        if (maliciousCount > 0) {
          Alert.alert(
            '🚨 Malicious Files Found!',
            `${maliciousCount} malicious and ${suspiciousCount} suspicious files detected!`,
            [{ text: 'View Results', onPress: () => setActiveTab('scanner') }]
          );
        } else if (suspiciousCount > 0) {
          Alert.alert(
            '⚠️ Suspicious Files Found',
            `${suspiciousCount} files require attention.`,
            [{ text: 'View Results', onPress: () => setActiveTab('scanner') }]
          );
        } else {
          Alert.alert('✅ All Files Clean', 'No threats detected in scanned files.');
        }
      }
    } catch (error) {
      Alert.alert('Scan Error', error.message);
    } finally {
      setIsScanning(false);
    }
  };

  const toggleFileMonitoring = async () => {
    try {
      if (isMonitoringEnabled) {
        await fileMonitoringService.stopMonitoring();
        setIsMonitoringEnabled(false);
        Alert.alert('Monitoring Stopped', 'Real-time file monitoring has been disabled.');
      } else {
        const result = await fileMonitoringService.startMonitoring();
        if (result.success) {
          setIsMonitoringEnabled(true);
          Alert.alert('Monitoring Started', result.message);
        } else {
          Alert.alert('Failed to Start Monitoring', result.error);
        }
      }
      
      const stats = fileMonitoringService.getMonitoringStats();
      setMonitoringStats(stats);
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle file monitoring');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await initializeServices();
    setRefreshing(false);
  };

  const getRiskColor = (status) => {
    switch (status) {
      case 'malicious': return '#F44336';
      case 'highly_suspicious': return '#FF5722';
      case 'suspicious': return '#FF9800';
      case 'potentially_unwanted': return '#FFC107';
      case 'clean': return '#4CAF50';
      default: return '#757575';
    }
  };

  // Header with monitoring status
  const SecurityHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={styles.headerTitle}>File Security</Text>
        <View style={styles.statusContainer}>
          <Animated.View 
            style={[
              styles.statusIndicator, 
              { 
                backgroundColor: isMonitoringEnabled ? '#4CAF50' : '#F44336',
                transform: [{ scale: isMonitoringEnabled ? pulseAnimation : 1 }]
              }
            ]} 
          />
          <Text style={styles.statusText}>
            {isMonitoringEnabled ? 'Live Protection Active' : 'Protection Disabled'}
          </Text>
        </View>
      </View>
      
      <TouchableOpacity onPress={() => setShowAnalytics(true)} style={styles.headerButton}>
        <Ionicons name="analytics" size={24} color="#4CAF50" />
      </TouchableOpacity>
    </View>
  );

  // Security overview cards
  const SecurityOverview = () => {
    if (!scanStats || !monitoringStats) return null;

    return (
      <View style={styles.overviewContainer}>
        <View style={styles.overviewCard}>
          <Ionicons name="shield-checkmark" size={24} color="#4CAF50" />
          <Text style={styles.overviewNumber}>{scanStats.totalScanned}</Text>
          <Text style={styles.overviewLabel}>Files Scanned</Text>
        </View>
        
        <View style={styles.overviewCard}>
          <Ionicons name="warning" size={24} color="#F44336" />
          <Text style={styles.overviewNumber}>{scanStats.maliciousFound}</Text>
          <Text style={styles.overviewLabel}>Threats Found</Text>
        </View>
        
        <View style={styles.overviewCard}>
          <Ionicons name="eye" size={24} color="#2196F3" />
          <Text style={styles.overviewNumber}>{monitoringStats.knownFiles}</Text>
          <Text style={styles.overviewLabel}>Monitored Files</Text>
        </View>
        
        <View style={styles.overviewCard}>
          <Ionicons name="lock-closed" size={24} color="#FF9800" />
          <Text style={styles.overviewNumber}>{quarantinedFiles.length}</Text>
          <Text style={styles.overviewLabel}>Quarantined</Text>
        </View>
      </View>
    );
  };

  // Tab navigation
  const TabNavigation = () => (
    <View style={styles.tabContainer}>
      {[
        { id: 'scanner', label: 'File Scanner', icon: 'document-text' },
        { id: 'monitor', label: 'Live Monitor', icon: 'eye' },
        { id: 'quarantine', label: 'Quarantine', icon: 'lock-closed' }
      ].map(tab => (
        <TouchableOpacity
          key={tab.id}
          style={[styles.tab, activeTab === tab.id && styles.activeTab]}
          onPress={() => setActiveTab(tab.id)}
        >
          <Ionicons name={tab.icon} size={20} color={activeTab === tab.id ? '#fff' : '#888'} />
          <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // File scanner tab
  const FileScannerTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.scannerActions}>
        <TouchableOpacity
          style={[styles.scanButton, isScanning && styles.scanButtonDisabled]}
          onPress={handlePickAndScanFiles}
          disabled={isScanning}
        >
          {isScanning ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="document-attach" size={24} color="#fff" />
          )}
          <Text style={styles.scanButtonText}>
            {isScanning ? 'Scanning Files...' : 'Pick & Scan Files'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Scans ({scanHistory.length})</Text>
      </View>

      {scanHistory.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-outline" size={64} color="#666" />
          <Text style={styles.emptyStateTitle}>No Files Scanned</Text>
          <Text style={styles.emptyStateText}>
            Tap "Pick & Scan Files" to analyze files for security threats
          </Text>
        </View>
      ) : (
        <FlatList
          data={scanHistory.slice(0, 10)}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ScanResultItem result={item} />}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
        />
      )}
    </View>
  );

  // Live monitor tab
  const LiveMonitorTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.monitoringControl}>
        <View style={styles.monitoringInfo}>
          <Text style={styles.monitoringTitle}>Real-time Protection</Text>
          <Text style={styles.monitoringDescription}>
            Automatically scans downloaded and new files
          </Text>
        </View>
        <Switch
          value={isMonitoringEnabled}
          onValueChange={toggleFileMonitoring}
          trackColor={{ false: '#333', true: '#4CAF50' }}
          thumbColor={isMonitoringEnabled ? '#FFFFFF' : '#757575'}
        />
      </View>

      {monitoringStats && (
        <View style={styles.monitoringStats}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Watched Directories:</Text>
            <Text style={styles.statValue}>{monitoringStats.watchedDirectories}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Pending Scans:</Text>
            <Text style={styles.statValue}>{monitoringStats.pendingScans}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Alerts (24h):</Text>
            <Text style={styles.statValue}>{monitoringStats.alerts24h}</Text>
          </View>
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Live Alerts ({realTimeAlerts.length})</Text>
      </View>

      {realTimeAlerts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="shield-checkmark" size={64} color="#4CAF50" />
          <Text style={styles.emptyStateTitle}>No Security Alerts</Text>
          <Text style={styles.emptyStateText}>
            Your system is secure. New file threats will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={realTimeAlerts.slice(0, 10)}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <AlertItem alert={item} />}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
        />
      )}
    </View>
  );

  // Quarantine tab
  const QuarantineTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Quarantined Files ({quarantinedFiles.length})</Text>
        {quarantinedFiles.length > 0 && (
          <TouchableOpacity onPress={() => Alert.alert('Clear Quarantine', 'This would clear all quarantined files.')}>
            <Text style={styles.clearButton}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {quarantinedFiles.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="lock-closed" size={64} color="#666" />
          <Text style={styles.emptyStateTitle}>No Quarantined Files</Text>
          <Text style={styles.emptyStateText}>
            Malicious files are automatically quarantined for your safety
          </Text>
        </View>
      ) : (
        <FlatList
          data={quarantinedFiles}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <QuarantineItem file={item} />}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
        />
      )}
    </View>
  );

  // Scan result item
  const ScanResultItem = ({ result }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => {
        setSelectedScanResult(result);
        setShowScanDetails(true);
      }}
    >
      <View style={styles.resultHeader}>
        <View style={[styles.statusDot, { backgroundColor: getRiskColor(result.status) }]} />
        <View style={styles.resultInfo}>
          <Text style={styles.resultFileName} numberOfLines={1}>{result.fileName}</Text>
          <Text style={styles.resultStatus}>{result.status.replace('_', ' ').toUpperCase()}</Text>
        </View>
        <View style={styles.resultMeta}>
          <Text style={styles.riskScore}>{result.riskScore}</Text>
          <Ionicons name="chevron-forward" size={16} color="#888" />
        </View>
      </View>
      {result.threats && result.threats.length > 0 && (
        <Text style={styles.threatPreview} numberOfLines={1}>
          ⚠️ {result.threats[0]}
        </Text>
      )}
    </TouchableOpacity>
  );

  // Alert item
  const AlertItem = ({ alert }) => (
    <View style={styles.alertItem}>
      <View style={styles.alertHeader}>
        <View style={[styles.alertIndicator, { backgroundColor: getRiskColor(alert.status) }]} />
        <View style={styles.alertInfo}>
          <Text style={styles.alertFileName}>{alert.fileName}</Text>
          <Text style={styles.alertTime}>
            {new Date(alert.timestamp).toLocaleTimeString()}
          </Text>
        </View>
        <Text style={styles.alertAction}>{alert.action.replace('_', ' ')}</Text>
      </View>
    </View>
  );

  // Quarantine item
  const QuarantineItem = ({ file }) => (
    <View style={styles.quarantineItem}>
      <View style={styles.quarantineHeader}>
        <Ionicons name="warning" size={20} color="#F44336" />
        <View style={styles.quarantineInfo}>
          <Text style={styles.quarantineFileName}>{file.fileName}</Text>
          <Text style={styles.quarantineDate}>
            Quarantined: {new Date(file.quarantineDate).toLocaleDateString()}
          </Text>
        </View>
        <TouchableOpacity style={styles.quarantineAction}>
          <Ionicons name="trash" size={16} color="#F44336" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Analytics modal
  const AnalyticsModal = () => {
    if (!scanStats) return null;

    const pieData = [
      { name: 'Clean', population: scanStats.cleanFiles, color: '#4CAF50', legendFontColor: '#fff' },
      { name: 'Malicious', population: scanStats.maliciousFound, color: '#F44336', legendFontColor: '#fff' },
      { name: 'Suspicious', population: scanStats.suspiciousFound, color: '#FF9800', legendFontColor: '#fff' }
    ].filter(item => item.population > 0);

    return (
      <Modal
        visible={showAnalytics}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAnalytics(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>File Security Analytics</Text>
            <TouchableOpacity onPress={() => setShowAnalytics(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.analyticsGrid}>
              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsNumber}>{scanStats.totalScanned}</Text>
                <Text style={styles.analyticsLabel}>Total Scanned</Text>
              </View>
              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsNumber}>{scanStats.maliciousFound}</Text>
                <Text style={styles.analyticsLabel}>Malicious</Text>
              </View>
              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsNumber}>{Math.round(scanStats.avgScanTime)}ms</Text>
                <Text style={styles.analyticsLabel}>Avg Scan Time</Text>
              </View>
              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsNumber}>{scanStats.quarantinedCount || 0}</Text>
                <Text style={styles.analyticsLabel}>Quarantined</Text>
              </View>
            </View>
            
            {pieData.length > 0 && (
              <View style={styles.chartContainer}>
                <Text style={styles.chartTitle}>File Security Distribution</Text>
                <PieChart
                  data={pieData}
                  width={chartWidth}
                  height={220}
                  chartConfig={{
                    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                  }}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  style={styles.chart}
                />
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Initializing File Security...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
          />
        }
      >
        <SecurityHeader />
        <SecurityOverview />
        <TabNavigation />
        
        {activeTab === 'scanner' && <FileScannerTab />}
        {activeTab === 'monitor' && <LiveMonitorTab />}
        {activeTab === 'quarantine' && <QuarantineTab />}
      </ScrollView>
      
      <AnalyticsModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
  },
  headerButton: {
    padding: 8,
  },
  overviewContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  overviewNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginVertical: 4,
  },
  overviewLabel: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#4CAF50',
  },
  tabText: {
    color: '#888',
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
  tabContent: {
    paddingHorizontal: 20,
  },
  scannerActions: {
    marginBottom: 20,
  },
  scanButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  scanButtonDisabled: {
    backgroundColor: '#333',
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  clearButton: {
    color: '#F44336',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  resultItem: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  resultInfo: {
    flex: 1,
  },
  resultFileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  resultStatus: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riskScore: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF9800',
    marginRight: 8,
  },
  threatPreview: {
    fontSize: 12,
    color: '#FF9800',
    marginTop: 8,
    marginLeft: 20,
  },
  monitoringControl: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  monitoringInfo: {
    flex: 1,
  },
  monitoringTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  monitoringDescription: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  monitoringStats: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statLabel: {
    color: '#888',
    fontSize: 14,
  },
  statValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  alertItem: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 10,
  },
  alertInfo: {
    flex: 1,
  },
  alertFileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  alertTime: {
    fontSize: 10,
    color: '#888',
  },
  alertAction: {
    fontSize: 10,
    color: '#FF9800',
    fontWeight: '600',
  },
  quarantineItem: {
    backgroundColor: '#2a1a1a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#F44336',
  },
  quarantineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quarantineInfo: {
    flex: 1,
    marginLeft: 12,
  },
  quarantineFileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  quarantineDate: {
    fontSize: 10,
    color: '#888',
  },
  quarantineAction: {
    padding: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  analyticsCard: {
    width: '48%',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  analyticsNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  analyticsLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  chartContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  chart: {
    borderRadius: 12,
  },
});
