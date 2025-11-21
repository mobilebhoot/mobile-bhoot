import React, { useState, useEffect, useRef } from 'react';
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
  RefreshControl,
  Modal,
  FlatList,
  Dimensions,
  Switch,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { PieChart } from 'react-native-chart-kit';
import { useTranslation } from 'react-i18next';
import * as Linking from 'expo-linking';
import Toast from 'react-native-toast-message';
import bulkUrlScanner from '../services/bulkUrlScanner';
import messageMonitoringService from '../services/messageMonitoringService';
import enhancedQRScannerService from '../services/enhancedQRScannerService';
import fileSecurityService from '../services/fileSecurityService';
import fileMonitoringService from '../services/fileMonitoringService';

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - 32;

export default function UltimateSecurityScreen({ navigation }) {
  const { t } = useTranslation();
  
  // Main state
  const [activeTab, setActiveTab] = useState('scanner'); // 'scanner', 'monitor', 'threats'
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Scanner state
  const [scanMode, setScanMode] = useState('single');
  const [inputText, setInputText] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState([]);
  const [scanProgress, setScanProgress] = useState({ completed: 0, total: 0, percentage: 0 });

  // Message monitoring state
  const [isMonitoringEnabled, setIsMonitoringEnabled] = useState(false);
  const [realTimeThreats, setRealTimeThreats] = useState([]);
  const [monitoringStats, setMonitoringStats] = useState(null);
  const [showMonitoringModal, setShowMonitoringModal] = useState(false);

  // QR scanner state
  const [qrScanHistory, setQrScanHistory] = useState([]);
  const [showQRModal, setShowQRModal] = useState(false);

  // File security state
  const [fileSecurityStats, setFileSecurityStats] = useState(null);
  const [fileMonitoringActive, setFileMonitoringActive] = useState(false);

  // Analytics state
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [combinedStats, setCombinedStats] = useState(null);

  // Refs
  const scrollViewRef = useRef(null);
  const threatUpdateInterval = useRef(null);

  useEffect(() => {
    initializeServices();
    startRealTimeUpdates();
    setupLinkInterception();
    
    return () => {
      if (threatUpdateInterval.current) {
        clearInterval(threatUpdateInterval.current);
      }
    };
  }, []);

  // Setup automatic link interception for phishing protection
  const setupLinkInterception = async () => {
    try {
      // Handle deep links when app is opened from a link (cold start)
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        console.log('🔗 App opened with URL:', initialUrl);
        await handleIncomingLink(initialUrl);
      }

      // Handle deep links when app is already running (warm start)
      const subscription = Linking.addEventListener('url', (event) => {
        console.log('🔗 Received URL while app running:', event.url);
        handleIncomingLink(event.url);
      });

      console.log('✅ Automatic link interception enabled');
      
      return () => {
        subscription.remove();
      };
    } catch (error) {
      console.error('❌ Failed to setup link interception:', error);
    }
  };

  // Handle incoming links (from email, SMS, social media, etc.)
  const handleIncomingLink = async (url) => {
    try {
      // Extract the actual URL if it's a deep link
      let urlToScan = url;
      
      // Parse deep link format: pocketshield://scan?url=https://example.com
      if (url.startsWith('pocketshield://')) {
        const parsed = Linking.parse(url);
        urlToScan = parsed.queryParams?.url || url;
      }
      
      // Extract HTTP/HTTPS URLs
      const urlMatch = urlToScan.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        urlToScan = urlMatch[1];
      }

      // Validate it's a real URL
      if (!urlToScan.startsWith('http://') && !urlToScan.startsWith('https://')) {
        console.log('⚠️ Not a valid HTTP/HTTPS URL, skipping scan');
        return;
      }

      console.log('🔍 Automatically scanning URL:', urlToScan);

      // Show notification that we're scanning
      Toast.show({
        type: 'info',
        text1: '🔍 Scanning Link',
        text2: 'Checking for phishing threats...',
        position: 'top',
        visibilityTime: 2000,
      });

      // Switch to scanner tab and set the URL
      setActiveTab('scanner');
      setInputText(urlToScan);

      // Automatically scan the URL
      await handleScanSingle(urlToScan);

    } catch (error) {
      console.error('❌ Error handling incoming link:', error);
      Toast.show({
        type: 'error',
        text1: 'Scan Failed',
        text2: 'Could not scan the received link',
        position: 'top',
      });
    }
  };

  const initializeServices = async () => {
    setIsLoading(true);
    try {
      // Load monitoring status
      const monitoringStatus = messageMonitoringService.getMonitoringStats();
      setIsMonitoringEnabled(monitoringStatus.isMonitoring);
      setMonitoringStats(monitoringStatus);

      // Load real-time threats
      const threats = messageMonitoringService.getRealTimeThreats();
      setRealTimeThreats(threats);

      // Load QR scan history
      const qrHistory = enhancedQRScannerService.getScanHistory();
      setQrScanHistory(qrHistory);

      // Load file security stats
      const fileStats = fileSecurityService.getScanStats();
      const fileMonitoringStatus = fileMonitoringService.getMonitoringStats();
      setFileSecurityStats(fileStats);
      setFileMonitoringActive(fileMonitoringStatus.isMonitoring);

      // Generate combined statistics
      await generateCombinedStats();

    } catch (error) {
      console.error('Failed to initialize services:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startRealTimeUpdates = () => {
    // Update threat data every 5 seconds
    threatUpdateInterval.current = setInterval(() => {
      const threats = messageMonitoringService.getRealTimeThreats();
      const stats = messageMonitoringService.getMonitoringStats();
      
      setRealTimeThreats(threats);
      setMonitoringStats(stats);
    }, 5000);
  };

  const generateCombinedStats = async () => {
    const urlStats = bulkUrlScanner.getScanStats();
    const messageStats = messageMonitoringService.getMonitoringStats();
    const qrStats = enhancedQRScannerService.getScanStats();
    const fileStats = fileSecurityService.getScanStats();

    const combined = {
      totalScanned: urlStats.totalScanned + qrStats.totalScans + fileStats.totalScanned,
      totalThreats: urlStats.maliciousFound + urlStats.suspiciousFound + messageStats.totalThreats + fileStats.maliciousFound + fileStats.suspiciousFound,
      messagesMonitored: messageStats.totalThreats,
      qrCodesScanned: qrStats.totalScans,
      paymentQRs: qrStats.paymentScans,
      filesScanned: fileStats.totalScanned,
      filesQuarantined: fileStats.quarantinedCount || 0,
      activeMonitoring: messageStats.isMonitoring || fileMonitoringActive,
      last24hThreats: messageStats.threats24h + urlStats.maliciousFound + fileStats.maliciousFound,
    };

    setCombinedStats(combined);
  };

  const toggleMessageMonitoring = async () => {
    try {
      if (isMonitoringEnabled) {
        await messageMonitoringService.stopMonitoring();
        setIsMonitoringEnabled(false);
        Alert.alert('Monitoring Stopped', 'Real-time message monitoring has been disabled.');
      } else {
        const result = await messageMonitoringService.startMonitoring();
        if (result.success) {
          setIsMonitoringEnabled(true);
          Alert.alert('Monitoring Started', result.message);
        } else {
          Alert.alert('Failed to Start Monitoring', result.error);
        }
      }
      
      const stats = messageMonitoringService.getMonitoringStats();
      setMonitoringStats(stats);
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle message monitoring');
    }
  };

  const handleBulkScan = async () => {
    const urls = extractUrlsFromText(inputText);
    if (urls.length === 0) {
      Alert.alert('No URLs Found', 'Please enter URLs to scan.');
      return;
    }

    setIsScanning(true);
    setScanResults([]);
    setScanProgress({ completed: 0, total: urls.length, percentage: 0 });

    try {
      const scanJob = await bulkUrlScanner.bulkScan(urls, {
        maxConcurrent: 5,
        batchSize: 10,
        onProgress: (progress) => setScanProgress(progress),
        onBatchComplete: (batchResults) => {
          setScanResults(prev => [...prev, ...batchResults]);
        }
      });

      if (!scanJob.success) {
        Alert.alert('Scan Error', scanJob.error);
      }
    } catch (error) {
      Alert.alert('Scan Failed', 'Failed to scan URLs');
    } finally {
      setIsScanning(false);
      await generateCombinedStats();
    }
  };

  const extractUrlsFromText = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex) || [];
    const domainRegex = /(?:^|\s)((?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})(?:\s|$)/g;
    const domainMatches = text.match(domainRegex) || [];
    
    const allUrls = [
      ...matches,
      ...domainMatches.map(match => `https://${match.trim()}`)
    ];
    
    return [...new Set(allUrls)];
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await initializeServices();
    setRefreshing(false);
  };

  // Header with live status
  const LiveSecurityHeader = () => (
    <View style={styles.liveHeader}>
      <View style={styles.headerLeft}>
        <Text style={styles.headerTitle}>URL Guard</Text>
        <View style={styles.liveStatus}>
          <View style={[styles.statusDot, { backgroundColor: isMonitoringEnabled ? '#4CAF50' : '#F44336' }]} />
          <Text style={styles.statusText}>
            {isMonitoringEnabled ? 'Live Monitoring' : 'Monitoring Off'}
          </Text>
        </View>
      </View>
      
      <View style={styles.headerActions}>
        <TouchableOpacity onPress={() => setShowAnalytics(true)} style={styles.headerButton}>
          <Ionicons name="analytics" size={20} color="#4CAF50" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('QRScanner')} style={styles.headerButton}>
          <Ionicons name="qr-code" size={20} color="#4CAF50" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Live threat feed
  const LiveThreatFeed = () => (
    <View style={styles.threatFeed}>
      <View style={styles.feedHeader}>
        <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
        <Text style={styles.feedTitle}>Live Threat Feed</Text>
        <TouchableOpacity onPress={() => setShowMonitoringModal(true)}>
          <Ionicons name="settings" size={18} color="#888" />
        </TouchableOpacity>
      </View>
      
      {realTimeThreats.length === 0 ? (
        <View style={styles.noThreats}>
          <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
          <Text style={styles.noThreatsText}>No threats detected</Text>
          <Text style={styles.noThreatsSubtext}>Your device is secure</Text>
        </View>
      ) : (
        <FlatList
          data={realTimeThreats.slice(0, 3)}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ThreatItem threat={item} />}
          style={styles.threatList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );

  // Threat item component
  const ThreatItem = ({ threat }) => {
    const getRiskColor = (level) => {
      switch (level) {
        case 'critical': return '#F44336';
        case 'high': return '#FF5722';
        case 'medium': return '#FF9800';
        default: return '#FFC107';
      }
    };

    return (
      <View style={styles.threatItem}>
        <View style={styles.threatHeader}>
          <View style={[styles.riskIndicator, { backgroundColor: getRiskColor(threat.riskLevel) }]} />
          <Text style={styles.threatSource}>{threat.source}</Text>
          <Text style={styles.threatTime}>
            {new Date(threat.timestamp).toLocaleTimeString()}
          </Text>
        </View>
        <Text style={styles.threatMessage} numberOfLines={2}>
          {threat.messageText}
        </Text>
        <Text style={styles.threatCount}>
          {threat.threats.length} threat{threat.threats.length > 1 ? 's' : ''} detected
        </Text>
      </View>
    );
  };

  // Security stats overview
  const SecurityOverview = () => {
    if (!combinedStats) return null;

    return (
      <View style={styles.securityOverview}>
        <Text style={styles.overviewTitle}>Security Overview</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{combinedStats.totalScanned}</Text>
            <Text style={styles.statLabel}>Total Scanned</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{combinedStats.totalThreats}</Text>
            <Text style={styles.statLabel}>Threats Found</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{combinedStats.messagesMonitored}</Text>
            <Text style={styles.statLabel}>Messages</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{combinedStats.qrCodesScanned}</Text>
            <Text style={styles.statLabel}>QR Codes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{combinedStats.filesScanned}</Text>
            <Text style={styles.statLabel}>Files</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{combinedStats.filesQuarantined}</Text>
            <Text style={styles.statLabel}>Quarantined</Text>
          </View>
        </View>
      </View>
    );
  };

  // Tab navigation
  const TabNavigation = () => (
    <View style={styles.tabNavigation}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'scanner' && styles.activeTab]}
        onPress={() => setActiveTab('scanner')}
      >
        <Ionicons name="link" size={20} color={activeTab === 'scanner' ? '#4CAF50' : '#888'} />
        <Text style={[styles.tabText, activeTab === 'scanner' && styles.activeTabText]}>
          Scanner
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tab, activeTab === 'monitor' && styles.activeTab]}
        onPress={() => setActiveTab('monitor')}
      >
        <Ionicons name="eye" size={20} color={activeTab === 'monitor' ? '#4CAF50' : '#888'} />
        <Text style={[styles.tabText, activeTab === 'monitor' && styles.activeTabText]}>
          Monitor
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tab, activeTab === 'threats' && styles.activeTab]}
        onPress={() => setActiveTab('threats')}
      >
        <Ionicons name="warning" size={20} color={activeTab === 'threats' ? '#4CAF50' : '#888'} />
        <Text style={[styles.tabText, activeTab === 'threats' && styles.activeTabText]}>
          Threats
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Scanner tab content
  const ScannerTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.scannerSection}>
        <Text style={styles.sectionTitle}>URL Security Scanner</Text>
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Enter URLs or paste text with links..."
            placeholderTextColor="#666"
            multiline
            numberOfLines={4}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        
        <TouchableOpacity
          style={[styles.scanButton, (isScanning || !inputText.trim()) && styles.scanButtonDisabled]}
          onPress={handleBulkScan}
          disabled={isScanning || !inputText.trim()}
        >
          {isScanning ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="shield-checkmark" size={20} color="#fff" />
          )}
          <Text style={styles.scanButtonText}>
            {isScanning ? `Scanning... (${scanProgress.completed}/${scanProgress.total})` : 'Scan URLs'}
          </Text>
        </TouchableOpacity>

        {isScanning && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${scanProgress.percentage}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {scanProgress.percentage}% Complete
            </Text>
          </View>
        )}
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => navigation.navigate('QRScanner')}
        >
          <Ionicons name="qr-code" size={24} color="#4CAF50" />
          <Text style={styles.quickActionText}>QR Scanner</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => navigation.navigate('FileSecurity')}
        >
          <Ionicons name="document-lock" size={24} color="#4CAF50" />
          <Text style={styles.quickActionText}>File Scanner</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => setShowAnalytics(true)}
        >
          <Ionicons name="analytics" size={24} color="#4CAF50" />
          <Text style={styles.quickActionText}>Analytics</Text>
        </TouchableOpacity>
      </View>

      {scanResults.length > 0 && (
        <View style={styles.resultsSection}>
          <Text style={styles.sectionTitle}>Scan Results ({scanResults.length})</Text>
          <FlatList
            data={scanResults.slice(0, 5)}
            keyExtractor={(item, index) => `${item.url}-${index}`}
            renderItem={({ item }) => <ScanResultItem result={item} />}
            scrollEnabled={false}
          />
        </View>
      )}
    </View>
  );

  // Monitor tab content
  const MonitorTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.monitoringSection}>
        <View style={styles.monitoringHeader}>
          <Text style={styles.sectionTitle}>Real-time Monitoring</Text>
          <Switch
            value={isMonitoringEnabled}
            onValueChange={toggleMessageMonitoring}
            trackColor={{ false: '#333', true: '#4CAF50' }}
            thumbColor={isMonitoringEnabled ? '#FFFFFF' : '#757575'}
          />
        </View>
        
        <Text style={styles.monitoringDescription}>
          Automatically scan incoming messages for suspicious links
        </Text>

        {monitoringStats && (
          <View style={styles.monitoringStats}>
            <View style={styles.monitoringStat}>
              <Text style={styles.statNumber}>{monitoringStats.totalThreats}</Text>
              <Text style={styles.statLabel}>Total Threats</Text>
            </View>
            <View style={styles.monitoringStat}>
              <Text style={styles.statNumber}>{monitoringStats.threats24h}</Text>
              <Text style={styles.statLabel}>Last 24h</Text>
            </View>
            <View style={styles.monitoringStat}>
              <Text style={styles.statNumber}>{monitoringStats.criticalThreats}</Text>
              <Text style={styles.statLabel}>Critical</Text>
            </View>
          </View>
        )}
      </View>
      
      <LiveThreatFeed />
    </View>
  );

  // Threats tab content
  const ThreatsTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Threat History</Text>
      
      {realTimeThreats.length === 0 ? (
        <View style={styles.noThreats}>
          <Ionicons name="shield-checkmark" size={48} color="#4CAF50" />
          <Text style={styles.noThreatsText}>No threats detected</Text>
          <Text style={styles.noThreatsSubtext}>Your device is secure</Text>
        </View>
      ) : (
        <FlatList
          data={realTimeThreats}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <DetailedThreatItem threat={item} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );

  // Scan result item
  const ScanResultItem = ({ result }) => (
    <View style={styles.resultItem}>
      <View style={styles.resultHeader}>
        <View style={[styles.statusIndicator, { backgroundColor: getRiskColor(result.status) }]} />
        <Text style={styles.resultUrl} numberOfLines={1}>{result.url}</Text>
        <Text style={styles.riskScore}>{result.riskScore || 0}</Text>
      </View>
      {result.threats && result.threats.length > 0 && (
        <Text style={styles.threatText} numberOfLines={1}>
          ⚠️ {result.threats[0]}
        </Text>
      )}
    </View>
  );

  // Detailed threat item
  const DetailedThreatItem = ({ threat }) => (
    <View style={styles.detailedThreatItem}>
      <View style={styles.threatItemHeader}>
        <View style={[styles.riskIndicator, { backgroundColor: getRiskColor(threat.riskLevel) }]} />
        <View style={styles.threatInfo}>
          <Text style={styles.threatSource}>{threat.source} • {threat.sender}</Text>
          <Text style={styles.threatTimestamp}>
            {new Date(threat.timestamp).toLocaleString()}
          </Text>
        </View>
        <Text style={styles.threatRiskLevel}>{threat.riskLevel.toUpperCase()}</Text>
      </View>
      
      <Text style={styles.threatMessage}>{threat.messageText}</Text>
      
      <View style={styles.threatDetails}>
        <Text style={styles.threatCount}>
          {threat.threats.length} malicious link{threat.threats.length > 1 ? 's' : ''}
        </Text>
        {threat.threats.slice(0, 2).map((threatItem, index) => (
          <Text key={index} style={styles.threatDetail}>• {threatItem.url}</Text>
        ))}
      </View>
    </View>
  );

  const getRiskColor = (status) => {
    switch (status) {
      case 'malicious':
      case 'critical': return '#F44336';
      case 'suspicious':
      case 'high': return '#FF9800';
      case 'warning':
      case 'medium': return '#FFC107';
      case 'safe':
      case 'low': return '#4CAF50';
      default: return '#757575';
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Initializing Security Center...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
          />
        }
      >
        <LiveSecurityHeader />
        <SecurityOverview />
        <TabNavigation />
        
        {activeTab === 'scanner' && <ScannerTab />}
        {activeTab === 'monitor' && <MonitorTab />}
        {activeTab === 'threats' && <ThreatsTab />}
      </ScrollView>
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
  liveHeader: {
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
  liveStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
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
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  securityOverview: {
    backgroundColor: '#1a1a2e',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 16,
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  statLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
  },
  tabNavigation: {
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
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
  tabContent: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  scannerSection: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  textInput: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  scanButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
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
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  progressText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quickAction: {
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 20,
    width: '48%',
    marginBottom: 12,
  },
  quickActionText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '600',
  },
  monitoringSection: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  monitoringHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  monitoringDescription: {
    color: '#888',
    fontSize: 14,
    marginBottom: 16,
  },
  monitoringStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  monitoringStat: {
    alignItems: 'center',
  },
  threatFeed: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
  },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  feedTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
    flex: 1,
  },
  threatList: {
    maxHeight: 200,
  },
  threatItem: {
    backgroundColor: '#2a2a2e',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  threatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  riskIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  threatSource: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: 'bold',
    flex: 1,
  },
  threatTime: {
    color: '#888',
    fontSize: 10,
  },
  threatMessage: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 4,
  },
  threatCount: {
    color: '#FF9800',
    fontSize: 10,
    fontWeight: '600',
  },
  noThreats: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noThreatsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  noThreatsSubtext: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  resultsSection: {
    marginBottom: 20,
  },
  resultItem: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  resultUrl: {
    flex: 1,
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  riskScore: {
    color: '#888',
    fontSize: 10,
    fontWeight: 'bold',
  },
  threatText: {
    color: '#FF9800',
    fontSize: 10,
    marginTop: 4,
    marginLeft: 14,
  },
  detailedThreatItem: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  threatItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  threatInfo: {
    flex: 1,
    marginLeft: 8,
  },
  threatTimestamp: {
    color: '#888',
    fontSize: 10,
    marginTop: 2,
  },
  threatRiskLevel: {
    color: '#F44336',
    fontSize: 10,
    fontWeight: 'bold',
  },
  threatDetails: {
    marginTop: 8,
  },
  threatDetail: {
    color: '#FFCCCC',
    fontSize: 11,
    marginTop: 2,
  },
});
