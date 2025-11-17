import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { useTranslation } from 'react-i18next';
import networkMonitoringService from '../services/networkMonitoringService';
import realAppMonitorService from '../services/realAppMonitorService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const chartWidth = screenWidth - 32;

export default function NetworkTrafficScreen({ navigation }) {
  const { t } = useTranslation();
  const [networkStats, setNetworkStats] = useState(null);
  const [performanceMetrics, setPerformanceMetrics] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('hourly');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [realAppData, setRealAppData] = useState(null);
  const [installedApps, setInstalledApps] = useState([]);

  // Load network data on component mount
  useEffect(() => {
    initializeNetworkMonitoring();
    return () => {
      networkMonitoringService.stopMonitoring();
    };
  }, []);

  // Real-time data updates
  useEffect(() => {
    if (isMonitoring) {
      const interval = setInterval(() => {
        updateNetworkData();
        updateRealAppData();
      }, 5000); // Update every 5 seconds

      return () => clearInterval(interval);
    }
  }, [isMonitoring]);

  const initializeNetworkMonitoring = async () => {
    setIsLoading(true);
    try {
      // Initialize real app monitor
      await realAppMonitorService.initialize();
      realAppMonitorService.startMonitoring();
      
      // Initialize network monitoring
      await networkMonitoringService.startMonitoring();
      setIsMonitoring(true);
      
      // Update all data
      updateNetworkData();
      updateRealAppData();
    } catch (error) {
      console.error('Failed to initialize network monitoring:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateNetworkData = () => {
    const stats = networkMonitoringService.getCurrentStats();
    const metrics = networkMonitoringService.getPerformanceMetrics();
    const historical = networkMonitoringService.getHistoricalData(selectedPeriod);
    
    setNetworkStats(stats);
    setPerformanceMetrics(metrics);
    setHistoricalData(historical);
  };

  const updateRealAppData = () => {
    const appData = realAppMonitorService.getRealAppData();
    const apps = realAppMonitorService.getInstalledApps();
    
    setRealAppData(appData);
    setInstalledApps(apps);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    networkMonitoringService.resetData();
    updateNetworkData();
    updateRealAppData();
    setRefreshing(false);
  };

  const toggleMonitoring = () => {
    if (isMonitoring) {
      networkMonitoringService.stopMonitoring();
      realAppMonitorService.stopMonitoring();
      setIsMonitoring(false);
    } else {
      networkMonitoringService.startMonitoring();
      realAppMonitorService.startMonitoring();
      setIsMonitoring(true);
    }
  };

  // Chart configurations
  const chartConfig = {
    backgroundColor: '#1a1a2e',
    backgroundGradientFrom: '#1a1a2e',
    backgroundGradientTo: '#16213e',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#4CAF50'
    }
  };

  // Format data for line chart
  const formatLineChartData = () => {
    if (!historicalData.length) return null;

    return {
      labels: historicalData.map(item => 
        selectedPeriod === 'hourly' ? item.label : item.date.split(' ')[0]
      ),
      datasets: [
        {
          data: historicalData.map(item => (item.download + item.upload) / 1024), // Convert to MB
          color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
          strokeWidth: 2
        }
      ]
    };
  };

  // Helper function to format bytes
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Format data for app usage pie chart
  const formatPieChartData = () => {
    if (!realAppData?.topApps || realAppData.topApps.length === 0) return [];

    const colors = [
      '#4CAF50', '#2196F3', '#FF9800', '#F44336', '#9C27B0',
      '#607D8B', '#795548', '#E91E63', '#00BCD4', '#8BC34A'
    ];

    const totalUsage = realAppData.totalBandwidth.total;
    
    return realAppData.topApps.slice(0, 5).map((app, index) => ({
      name: app.name,
      population: totalUsage > 0 ? Math.round((app.dataUsage.total / totalUsage) * 100) : 0,
      color: colors[index % colors.length],
      legendFontColor: '#ffffff',
      legendFontSize: 12
    }));
  };

  // Format data for app usage bar chart
  const formatBarChartData = () => {
    if (!realAppData?.topApps || realAppData.topApps.length === 0) return null;

    const topApps = realAppData.topApps.slice(0, 6);
    return {
      labels: topApps.map(app => app.name.substring(0, 8)),
      datasets: [{
        data: topApps.map(app => app.dataUsage.total) // Data already in KB
      }]
    };
  };

  // Real-time status indicator
  const StatusIndicator = () => (
    <View style={styles.statusContainer}>
      <View style={[styles.statusDot, { backgroundColor: isMonitoring ? '#4CAF50' : '#F44336' }]} />
      <Text style={styles.statusText}>
        {isMonitoring ? 'Live Monitoring' : 'Monitoring Stopped'}
      </Text>
      <TouchableOpacity onPress={toggleMonitoring} style={styles.toggleButton}>
        <Ionicons 
          name={isMonitoring ? 'pause' : 'play'} 
          size={16} 
          color="#fff" 
        />
              </TouchableOpacity>
            </View>
  );

  // Header with controls
  const DashboardHeader = () => (
    <View style={styles.header}>
      <View>
        <Text style={styles.headerTitle}>Network Dashboard</Text>
        <Text style={styles.headerSubtitle}>Real-time bandwidth monitoring</Text>
                </View>
      <StatusIndicator />
                </View>
  );

  // Performance metrics cards
  const MetricsCards = () => {
    if (!performanceMetrics) return null;

    return (
      <View style={styles.metricsContainer}>
        <View style={styles.metricCard}>
          <LinearGradient colors={['#4CAF50', '#45a049']} style={styles.metricGradient}>
            <Ionicons name="download" size={24} color="#fff" />
            <Text style={styles.metricValue}>
              {networkMonitoringService.formatBytes(performanceMetrics.downloadSpeed)}
                  </Text>
            <Text style={styles.metricLabel}>Download</Text>
          </LinearGradient>
              </View>

        <View style={styles.metricCard}>
          <LinearGradient colors={['#2196F3', '#1976D2']} style={styles.metricGradient}>
            <Ionicons name="cloud-upload" size={24} color="#fff" />
            <Text style={styles.metricValue}>
              {networkMonitoringService.formatBytes(performanceMetrics.uploadSpeed)}
            </Text>
            <Text style={styles.metricLabel}>Upload</Text>
          </LinearGradient>
              </View>

        <View style={styles.metricCard}>
          <LinearGradient colors={['#FF9800', '#F57C00']} style={styles.metricGradient}>
            <Ionicons name="analytics" size={24} color="#fff" />
            <Text style={styles.metricValue}>
              {networkMonitoringService.formatBytes(performanceMetrics.totalUsage)}
            </Text>
            <Text style={styles.metricLabel}>Total Usage</Text>
          </LinearGradient>
              </View>

        <View style={styles.metricCard}>
          <LinearGradient colors={['#9C27B0', '#7B1FA2']} style={styles.metricGradient}>
            <Ionicons name="speedometer" size={24} color="#fff" />
            <Text style={styles.metricValue}>
              {Math.round(performanceMetrics.efficiency)}%
                  </Text>
            <Text style={styles.metricLabel}>Efficiency</Text>
          </LinearGradient>
        </View>
      </View>
    );
  };

  // Time period selector
  const PeriodSelector = () => (
    <View style={styles.periodSelector}>
      {['hourly', 'daily', 'realtime'].map(period => (
    <TouchableOpacity
          key={period}
          style={[
            styles.periodButton,
            selectedPeriod === period && styles.periodButtonActive
          ]}
      onPress={() => {
            setSelectedPeriod(period);
            const historical = networkMonitoringService.getHistoricalData(period);
            setHistoricalData(historical);
          }}
        >
          <Text style={[
            styles.periodButtonText,
            selectedPeriod === period && styles.periodButtonTextActive
          ]}>
            {period.charAt(0).toUpperCase() + period.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
        </View>
  );

  // Bandwidth usage chart
  const BandwidthChart = () => {
    const lineData = formatLineChartData();
    if (!lineData) return null;

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Bandwidth Usage Over Time</Text>
        <PeriodSelector />
        <LineChart
          data={lineData}
          width={chartWidth}
          height={200}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
        />
      </View>
    );
  };

  // App usage breakdown
  const AppUsageChart = () => {
    const barData = formatBarChartData();
    if (!barData) return null;

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Top Apps by Data Usage</Text>
        <BarChart
          data={barData}
          width={chartWidth}
          height={200}
          chartConfig={{
            ...chartConfig,
            color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
          }}
          style={styles.chart}
        />
      </View>
    );
  };

  // App usage pie chart
  const AppUsagePieChart = () => {
    const pieData = formatPieChartData();
    if (!pieData.length) return null;

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>App Usage Distribution</Text>
        <PieChart
          data={pieData}
          width={chartWidth}
          height={220}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          center={[10, 10]}
          style={styles.chart}
        />
      </View>
    );
  };

  // Real app usage list
  const AppUsageList = () => {
    if (!realAppData?.topApps || realAppData.topApps.length === 0) {
  return (
        <View style={styles.appListContainer}>
          <Text style={styles.chartTitle}>📱 Installed Apps Usage</Text>
          <View style={styles.noDataContainer}>
            <Ionicons name="apps-outline" size={48} color="#888" />
            <Text style={styles.noDataText}>Detecting installed apps...</Text>
          </View>
        </View>
      );
    }

    const totalUsage = realAppData.totalBandwidth.total;

    return (
      <View style={styles.appListContainer}>
        <Text style={styles.chartTitle}>📱 Installed Apps Usage</Text>
        <Text style={styles.subTitle}>
          {installedApps.length} apps detected • Total: {formatBytes(totalUsage)}
            </Text>
        {realAppData.topApps.map((app, index) => (
          <View key={app.packageName} style={styles.appItem}>
            <View style={styles.appInfo}>
              <View style={[styles.appRank, { backgroundColor: getAppColor(index) }]}>
                <Text style={styles.appRankText}>{app.icon}</Text>
          </View>
              <View style={styles.appDetails}>
                <Text style={styles.appName}>{app.name}</Text>
                <View style={styles.appStats}>
                  <Text style={styles.appStatsText}>
                    ↓ {formatBytes(app.dataUsage.download * 1024)}
                  </Text>
                  <Text style={styles.appStatsText}>
                    ↑ {formatBytes(app.dataUsage.upload * 1024)}
                  </Text>
                  <Text style={styles.appStatsText}>
                    📱 {Math.round(app.screenTime)}m
            </Text>
          </View>
          </View>
        </View>
            <View style={styles.appUsage}>
              <Text style={styles.appTotal}>
                {formatBytes(app.dataUsage.total * 1024)}
              </Text>
              <Text style={styles.appPercentage}>
                {totalUsage > 0 ? ((app.dataUsage.total / totalUsage) * 100).toFixed(1) : 0}%
              </Text>
            </View>
          </View>
        ))}
        
        {installedApps.length > realAppData.topApps.length && (
          <TouchableOpacity style={styles.showMoreButton}>
            <Text style={styles.showMoreText}>
              Show all {installedApps.length} apps →
              </Text>
            </TouchableOpacity>
        )}
        </View>
    );
  };

  const getAppColor = (index) => {
    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#F44336', '#9C27B0'];
    return colors[index % colors.length];
  };

  if (isLoading) {
  return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Initializing Network Monitor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
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
        <DashboardHeader />
        <MetricsCards />
        <BandwidthChart />
        <AppUsageChart />
        <AppUsagePieChart />
        <AppUsageList />
      </ScrollView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  toggleButton: {
    marginLeft: 8,
    padding: 4,
  },
  metricsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  metricGradient: {
    padding: 16,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: '#fff',
    marginTop: 4,
    opacity: 0.9,
  },
  chartContainer: {
    backgroundColor: '#1a1a2e',
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    padding: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#16213e',
    borderRadius: 8,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  periodButtonActive: {
    backgroundColor: '#4CAF50',
  },
  periodButtonText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  appListContainer: {
    backgroundColor: '#1a1a2e',
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    padding: 16,
  },
  appItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  appInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  appRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  appRankText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  appDetails: {
    flex: 1,
  },
  appName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  appStats: {
    flexDirection: 'row',
    marginTop: 4,
  },
  appStatsText: {
    color: '#888',
    fontSize: 12,
    marginRight: 16,
  },
  appUsage: {
    alignItems: 'flex-end',
  },
  appTotal: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  appPercentage: {
    color: '#4CAF50',
    fontSize: 12,
    marginTop: 2,
  },
  subTitle: {
    color: '#888',
    fontSize: 14,
    marginBottom: 15,
    textAlign: 'center',
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noDataText: {
    color: '#888',
    fontSize: 16,
    marginTop: 10,
  },
  showMoreButton: {
    marginTop: 15,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 8,
  },
  showMoreText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '500',
  },
}); 