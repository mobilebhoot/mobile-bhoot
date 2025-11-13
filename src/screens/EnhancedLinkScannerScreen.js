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
  Share,
  Modal,
  FlatList,
  RefreshControl,
  Dimensions
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { useTranslation } from 'react-i18next';
import bulkUrlScanner from '../services/bulkUrlScanner';

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - 32;

export default function EnhancedLinkScannerScreen({ navigation }) {
  const { t } = useTranslation();
  
  // State management
  const [scanMode, setScanMode] = useState('single'); // 'single' or 'bulk'
  const [inputText, setInputText] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ completed: 0, total: 0, percentage: 0 });
  const [scanResults, setScanResults] = useState([]);
  const [scanHistory, setScanHistory] = useState([]);
  const [scanStats, setScanStats] = useState(null);
  const [activeJob, setActiveJob] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Refs
  const scrollViewRef = useRef(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const stats = bulkUrlScanner.getScanStats();
      const history = bulkUrlScanner.getScanHistory();
      
      setScanStats(stats);
      setScanHistory(history);
      
      // Check clipboard on app focus
      await checkClipboard();
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  };

  const checkClipboard = async () => {
    try {
      const clipboardContent = await Clipboard.getStringAsync();
      const urls = extractUrlsFromText(clipboardContent);
      
      if (urls.length > 0) {
        Alert.alert(
          '🔗 Links Detected in Clipboard',
          `Found ${urls.length} link${urls.length > 1 ? 's' : ''} in clipboard. Scan them?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Scan Links', onPress: () => startBulkScan(urls) }
          ]
        );
      }
    } catch (error) {
      console.warn('Failed to check clipboard:', error);
    }
  };

  const extractUrlsFromText = (text) => {
    if (!text) return [];
    
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex) || [];
    
    // Also check for URLs without protocol
    const domainRegex = /(?:^|\s)((?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})(?:\s|$)/g;
    const domainMatches = text.match(domainRegex) || [];
    
    const allUrls = [
      ...matches,
      ...domainMatches.map(match => `https://${match.trim()}`)
    ];
    
    return [...new Set(allUrls)]; // Remove duplicates
  };

  const parseInputUrls = () => {
    const urls = extractUrlsFromText(inputText);
    return urls.filter(url => url.length > 0);
  };

  const startSingleScan = async () => {
    const urls = parseInputUrls();
    if (urls.length === 0) {
      Alert.alert('Error', 'Please enter a valid URL to scan.');
      return;
    }
    
    if (urls.length > 1) {
      Alert.alert(
        'Multiple URLs Detected', 
        `Found ${urls.length} URLs. Switch to bulk scan mode?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Single Scan', onPress: () => performSingleScan(urls[0]) },
          { text: 'Bulk Scan', onPress: () => startBulkScan(urls) }
        ]
      );
      return;
    }
    
    await performSingleScan(urls[0]);
  };

  const performSingleScan = async (url) => {
    setIsScanning(true);
    setScanResults([]);
    
    try {
      const result = await bulkUrlScanner.scanSingleUrl(url);
      setScanResults([result]);
      
      // Update statistics
      const updatedStats = bulkUrlScanner.getScanStats();
      setScanStats(updatedStats);
      
    } catch (error) {
      Alert.alert('Scan Error', 'Failed to scan the URL. Please try again.');
      console.error('Single scan error:', error);
    } finally {
      setIsScanning(false);
    }
  };

  const startBulkScan = async (urls = null) => {
    const urlsToScan = urls || parseInputUrls();
    
    if (urlsToScan.length === 0) {
      Alert.alert('Error', 'Please enter URLs to scan.');
      return;
    }
    
    if (urlsToScan.length > 100) {
      Alert.alert(
        'Large Batch Warning',
        `Scanning ${urlsToScan.length} URLs may take several minutes. Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => performBulkScan(urlsToScan) }
        ]
      );
      return;
    }
    
    await performBulkScan(urlsToScan);
  };

  const performBulkScan = async (urls) => {
    setIsScanning(true);
    setScanResults([]);
    setScanProgress({ completed: 0, total: urls.length, percentage: 0 });
    
    try {
      const scanJob = await bulkUrlScanner.bulkScan(urls, {
        maxConcurrent: 5,
        batchSize: 10,
        onProgress: (progress) => {
          setScanProgress(progress);
        },
        onBatchComplete: (batchResults) => {
          setScanResults(prev => [...prev, ...batchResults]);
        }
      });
      
      if (scanJob.success) {
        setActiveJob(scanJob);
        
        // Update statistics after completion
        setTimeout(() => {
          const updatedStats = bulkUrlScanner.getScanStats();
          const updatedHistory = bulkUrlScanner.getScanHistory();
          setScanStats(updatedStats);
          setScanHistory(updatedHistory);
        }, 1000);
      } else {
        Alert.alert('Scan Error', scanJob.error);
      }
      
    } catch (error) {
      Alert.alert('Bulk Scan Error', 'Failed to start bulk scan. Please try again.');
      console.error('Bulk scan error:', error);
    } finally {
      setIsScanning(false);
      setActiveJob(null);
    }
  };

  const handleExport = async (format) => {
    try {
      const exportData = await bulkUrlScanner.exportResults(format);
      
      if (format === 'json' || format === 'csv') {
        await Share.share({
          message: exportData,
          title: `PocketShield Scan Results (${format.toUpperCase()})`,
        });
      }
      
      setShowExportModal(false);
    } catch (error) {
      Alert.alert('Export Error', 'Failed to export results.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  // Filter and search results
  const getFilteredResults = () => {
    let filtered = scanResults;
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(result => result.status === filterStatus);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(result => 
        result.url.toLowerCase().includes(query) ||
        result.threats.some(threat => threat.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  };

  // Get risk color for status
  const getRiskColor = (status) => {
    switch (status) {
      case 'malicious': return '#F44336';
      case 'suspicious': return '#FF9800';
      case 'warning': return '#FFC107';
      case 'safe': return '#4CAF50';
      default: return '#757575';
    }
  };

  // Header component
  const Header = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Advanced Link Scanner</Text>
      <Text style={styles.headerSubtitle}>Bulk URL security analysis</Text>
      
      <View style={styles.headerActions}>
        <TouchableOpacity onPress={() => setShowAnalytics(true)} style={styles.headerButton}>
          <Ionicons name="analytics" size={20} color="#4CAF50" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowExportModal(true)} style={styles.headerButton}>
          <Ionicons name="share" size={20} color="#4CAF50" />
        </TouchableOpacity>
        <TouchableOpacity onPress={checkClipboard} style={styles.headerButton}>
          <Ionicons name="clipboard" size={20} color="#4CAF50" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Scan mode selector
  const ScanModeSelector = () => (
    <View style={styles.modeSelector}>
      <TouchableOpacity
        style={[styles.modeButton, scanMode === 'single' && styles.modeButtonActive]}
        onPress={() => setScanMode('single')}
      >
        <Ionicons name="link" size={16} color={scanMode === 'single' ? '#fff' : '#888'} />
        <Text style={[styles.modeButtonText, scanMode === 'single' && styles.modeButtonTextActive]}>
          Single URL
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.modeButton, scanMode === 'bulk' && styles.modeButtonActive]}
        onPress={() => setScanMode('bulk')}
      >
        <Ionicons name="layers" size={16} color={scanMode === 'bulk' ? '#fff' : '#888'} />
        <Text style={[styles.modeButtonText, scanMode === 'bulk' && styles.modeButtonTextActive]}>
          Bulk Scan
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Input section
  const InputSection = () => (
    <View style={styles.inputSection}>
      <Text style={styles.inputLabel}>
        {scanMode === 'single' ? '🔗 Enter URL:' : '📋 Enter multiple URLs (one per line):'}
      </Text>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.textInput, scanMode === 'bulk' && styles.textInputBulk]}
          value={inputText}
          onChangeText={setInputText}
          placeholder={scanMode === 'single' 
            ? 'https://example.com' 
            : 'https://site1.com\nhttps://site2.com\nhttps://site3.com'}
          placeholderTextColor="#666"
          multiline={scanMode === 'bulk'}
          numberOfLines={scanMode === 'bulk' ? 6 : 1}
          autoCapitalize="none"
          autoCorrect={false}
        />
        
        {inputText.length > 0 && (
          <TouchableOpacity 
            style={styles.clearInputButton}
            onPress={() => setInputText('')}
          >
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.inputActions}>
        <TouchableOpacity 
          style={styles.pasteButton}
          onPress={async () => {
            const clipboard = await Clipboard.getStringAsync();
            setInputText(clipboard);
          }}
        >
          <Ionicons name="clipboard" size={16} color="#007AFF" />
          <Text style={styles.pasteButtonText}>Paste</Text>
        </TouchableOpacity>
        
        <Text style={styles.urlCount}>
          {parseInputUrls().length} URL{parseInputUrls().length !== 1 ? 's' : ''} detected
        </Text>
      </View>
    </View>
  );

  // Scan button with progress
  const ScanButton = () => (
    <View style={styles.scanSection}>
      <TouchableOpacity
        style={[styles.scanButton, (isScanning || !inputText.trim()) && styles.scanButtonDisabled]}
        onPress={scanMode === 'single' ? startSingleScan : startBulkScan}
        disabled={isScanning || !inputText.trim()}
      >
        {isScanning ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name="shield-checkmark" size={20} color="#fff" />
        )}
        <Text style={styles.scanButtonText}>
          {isScanning 
            ? `Scanning... (${scanProgress.completed}/${scanProgress.total})`
            : scanMode === 'single' ? 'Scan URL' : 'Bulk Scan URLs'
          }
        </Text>
      </TouchableOpacity>
      
      {isScanning && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${scanProgress.percentage}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {scanProgress.percentage}% Complete ({scanProgress.completed}/{scanProgress.total})
          </Text>
        </View>
      )}
    </View>
  );

  // Results header with filters
  const ResultsHeader = () => (
    <View style={styles.resultsHeader}>
      <Text style={styles.resultsTitle}>
        Scan Results ({getFilteredResults().length})
      </Text>
      
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['all', 'malicious', 'suspicious', 'warning', 'safe'].map(status => (
            <TouchableOpacity
              key={status}
              style={[styles.filterButton, filterStatus === status && styles.filterButtonActive]}
              onPress={() => setFilterStatus(status)}
            >
              <Text style={[styles.filterButtonText, filterStatus === status && styles.filterButtonTextActive]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={16} color="#666" />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search results..."
          placeholderTextColor="#666"
        />
      </View>
    </View>
  );

  // Individual result item
  const ResultItem = ({ result, index }) => (
    <View style={styles.resultItem}>
      <View style={styles.resultHeader}>
        <View style={[styles.statusIndicator, { backgroundColor: getRiskColor(result.status) }]} />
        <Text style={styles.resultUrl} numberOfLines={2}>{result.url}</Text>
        <Text style={styles.riskScore}>{result.riskScore || 0}</Text>
      </View>
      
      <View style={styles.resultDetails}>
        <View style={styles.resultMeta}>
          <Text style={styles.statusText}>{result.status.toUpperCase()}</Text>
          <Text style={styles.scanTime}>{result.scanTime}ms</Text>
        </View>
        
        {result.threats && result.threats.length > 0 && (
          <View style={styles.threatsContainer}>
            <Text style={styles.threatsTitle}>⚠️ Threats Detected:</Text>
            {result.threats.slice(0, 2).map((threat, idx) => (
              <Text key={idx} style={styles.threatText}>• {threat}</Text>
            ))}
            {result.threats.length > 2 && (
              <Text style={styles.moreThreatssText}>
                +{result.threats.length - 2} more threats
              </Text>
            )}
          </View>
        )}
        
        {result.recommendations && result.recommendations.length > 0 && (
          <View style={styles.recommendationsContainer}>
            <Text style={styles.recommendationsTitle}>💡 Recommendations:</Text>
            <Text style={styles.recommendationText}>
              {result.recommendations[0]}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  // Analytics modal
  const AnalyticsModal = () => {
    if (!scanStats) return null;

    const pieData = [
      { name: 'Safe', population: scanStats.cleanUrls, color: '#4CAF50', legendFontColor: '#fff' },
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
            <Text style={styles.modalTitle}>Scan Analytics</Text>
            <TouchableOpacity onPress={() => setShowAnalytics(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{scanStats.totalScanned}</Text>
                <Text style={styles.statLabel}>Total Scanned</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{scanStats.maliciousFound}</Text>
                <Text style={styles.statLabel}>Malicious</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{scanStats.suspiciousFound}</Text>
                <Text style={styles.statLabel}>Suspicious</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{Math.round(scanStats.averageScanTime)}ms</Text>
                <Text style={styles.statLabel}>Avg Scan Time</Text>
              </View>
            </View>
            
            {pieData.length > 0 && (
              <View style={styles.chartContainer}>
                <Text style={styles.chartTitle}>Threat Distribution</Text>
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

  return (
    <SafeAreaView style={styles.container}>
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
        <Header />
        <ScanModeSelector />
        <InputSection />
        <ScanButton />
        
        {scanResults.length > 0 && (
          <>
            <ResultsHeader />
            <FlatList
              data={getFilteredResults()}
              keyExtractor={(item, index) => `${item.url}-${index}`}
              renderItem={({ item, index }) => <ResultItem result={item} index={index} />}
              scrollEnabled={false}
              style={styles.resultsList}
            />
          </>
        )}
      </ScrollView>
      
      <AnalyticsModal />
      
      {/* Export Modal */}
      <Modal
        visible={showExportModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.exportModalOverlay}>
          <View style={styles.exportModalContent}>
            <Text style={styles.exportModalTitle}>Export Results</Text>
            
            <TouchableOpacity style={styles.exportOption} onPress={() => handleExport('json')}>
              <Ionicons name="code-slash" size={24} color="#4CAF50" />
              <Text style={styles.exportOptionText}>Export as JSON</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.exportOption} onPress={() => handleExport('csv')}>
              <Ionicons name="grid" size={24} color="#4CAF50" />
              <Text style={styles.exportOptionText}>Export as CSV</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.exportCancel}
              onPress={() => setShowExportModal(false)}
            >
              <Text style={styles.exportCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  modeSelector: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 6,
  },
  modeButtonActive: {
    backgroundColor: '#4CAF50',
  },
  modeButtonText: {
    color: '#888',
    marginLeft: 8,
    fontWeight: '600',
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  inputSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  inputLabel: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 12,
    fontWeight: '600',
  },
  inputContainer: {
    position: 'relative',
  },
  textInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
    minHeight: 50,
    textAlignVertical: 'top',
  },
  textInputBulk: {
    minHeight: 120,
  },
  clearInputButton: {
    position: 'absolute',
    right: 12,
    top: 15,
  },
  inputActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  pasteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  pasteButtonText: {
    color: '#fff',
    marginLeft: 4,
    fontWeight: '600',
  },
  urlCount: {
    color: '#888',
    fontSize: 12,
  },
  scanSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
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
  progressContainer: {
    marginTop: 16,
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
  resultsHeader: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  resultsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  filterContainer: {
    marginBottom: 12,
  },
  filterButton: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#4CAF50',
  },
  filterButtonText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    paddingVertical: 10,
    marginLeft: 8,
  },
  resultsList: {
    paddingHorizontal: 20,
  },
  resultItem: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  resultUrl: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  riskScore: {
    color: '#888',
    fontSize: 12,
    fontWeight: 'bold',
  },
  resultDetails: {
    marginTop: 8,
  },
  resultMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  scanTime: {
    fontSize: 12,
    color: '#888',
  },
  threatsContainer: {
    backgroundColor: '#2a1a1a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  threatsTitle: {
    color: '#F44336',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  threatText: {
    color: '#FFCCCC',
    fontSize: 11,
    marginBottom: 2,
  },
  moreThreatssText: {
    color: '#FF9800',
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 4,
  },
  recommendationsContainer: {
    backgroundColor: '#1a2a1a',
    borderRadius: 8,
    padding: 12,
  },
  recommendationsTitle: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  recommendationText: {
    color: '#CCFFCC',
    fontSize: 11,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  chartContainer: {
    backgroundColor: '#1a1a1a',
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
  exportModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    width: '80%',
  },
  exportModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    marginBottom: 12,
  },
  exportOptionText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 12,
    fontWeight: '600',
  },
  exportCancel: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  exportCancelText: {
    color: '#888',
    fontSize: 16,
  },
});
