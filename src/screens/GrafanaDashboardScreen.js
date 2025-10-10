import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSecurity } from '../state/SecurityProvider';
import * as Animatable from 'react-native-animatable';
import { LineChart, BarChart, PieChart, ProgressChart } from 'react-native-chart-kit';

const { width, height } = Dimensions.get('window');

export default function GrafanaDashboardScreen({ navigation }) {
  const { securityState, performSecurityScan } = useSecurity();
  const [refreshing, setRefreshing] = useState(false);
  const [realTimeData, setRealTimeData] = useState({
    threats: [],
    connections: [],
    vulnerabilities: [],
    metrics: {},
  });
  const [timeRange, setTimeRange] = useState('24h');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Animate dashboard entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Start real-time data updates
    startRealTimeUpdates();
  }, []);

  const startRealTimeUpdates = () => {
    const interval = setInterval(() => {
      updateRealTimeData();
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  };

  const updateRealTimeData = () => {
    // Simulate real-time data updates
    const newData = {
      threats: generateMockThreats(),
      connections: generateMockConnections(),
      vulnerabilities: generateMockVulnerabilities(),
      metrics: generateMockMetrics(),
    };
    setRealTimeData(newData);
  };

  const generateMockThreats = () => {
    return [
      { timestamp: Date.now() - 300000, count: 2, severity: 'high' },
      { timestamp: Date.now() - 240000, count: 1, severity: 'medium' },
      { timestamp: Date.now() - 180000, count: 3, severity: 'high' },
      { timestamp: Date.now() - 120000, count: 0, severity: 'low' },
      { timestamp: Date.now() - 60000, count: 1, severity: 'medium' },
      { timestamp: Date.now(), count: 2, severity: 'high' },
    ];
  };

  const generateMockConnections = () => {
    return [
      { timestamp: Date.now() - 300000, active: 12, secure: 8, suspicious: 4 },
      { timestamp: Date.now() - 240000, active: 15, secure: 10, suspicious: 5 },
      { timestamp: Date.now() - 180000, active: 18, secure: 12, suspicious: 6 },
      { timestamp: Date.now() - 120000, active: 14, secure: 11, suspicious: 3 },
      { timestamp: Date.now() - 60000, active: 16, secure: 13, suspicious: 3 },
      { timestamp: Date.now(), active: 20, secure: 15, suspicious: 5 },
    ];
  };

  const generateMockVulnerabilities = () => {
    return [
      { type: 'Critical', count: 2, color: '#F44336' },
      { type: 'High', count: 5, color: '#FF5722' },
      { type: 'Medium', count: 8, color: '#FF9800' },
      { type: 'Low', count: 12, color: '#4CAF50' },
    ];
  };

  const generateMockMetrics = () => {
    return {
      securityScore: 78,
      threatLevel: 'medium',
      activeConnections: 20,
      blockedThreats: 15,
      dataTransferred: '2.3 GB',
      uptime: '99.8%',
    };
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await performSecurityScan();
    updateRealTimeData();
    setRefreshing(false);
  };

  const chartConfig = {
    backgroundColor: '#1a1a2e',
    backgroundGradientFrom: '#1a1a2e',
    backgroundGradientTo: '#16213e',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#4CAF50',
    },
  };

  const threatData = {
    labels: ['6h ago', '5h ago', '4h ago', '3h ago', '2h ago', '1h ago', 'Now'],
    datasets: [
      {
        data: realTimeData.threats.map(t => t.count),
        color: (opacity = 1) => `rgba(244, 67, 54, ${opacity})`,
        strokeWidth: 3,
      },
    ],
  };

  const connectionData = {
    labels: ['6h ago', '5h ago', '4h ago', '3h ago', '2h ago', '1h ago', 'Now'],
    datasets: [
      {
        data: realTimeData.connections.map(c => c.active),
        color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
        strokeWidth: 2,
      },
      {
        data: realTimeData.connections.map(c => c.secure),
        color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  const vulnerabilityData = realTimeData.vulnerabilities.map(v => ({
    name: v.type,
    population: v.count,
    color: v.color,
    legendFontColor: '#FFFFFF',
    legendFontSize: 12,
  }));

  const progressData = [
    {
      name: 'Security Score',
      color: '#4CAF50',
      progress: realTimeData.metrics.securityScore / 100,
    },
    {
      name: 'Threat Protection',
      color: '#2196F3',
      progress: 0.85,
    },
    {
      name: 'Network Security',
      color: '#FF9800',
      progress: 0.72,
    },
  ];

  const MetricCard = ({ title, value, icon, color, trend, subtitle }) => (
    <Animatable.View 
      animation="fadeInUp" 
      duration={600}
      style={[styles.metricCard, { borderLeftColor: color }]}
    >
      <View style={styles.metricHeader}>
        <Ionicons name={icon} size={24} color={color} />
        <Text style={styles.metricTitle}>{title}</Text>
        {trend && (
          <View style={[styles.trendBadge, { backgroundColor: trend > 0 ? '#4CAF50' : '#F44336' }]}>
            <Ionicons 
              name={trend > 0 ? 'trending-up' : 'trending-down'} 
              size={12} 
              color="#fff" 
            />
            <Text style={styles.trendText}>{Math.abs(trend)}%</Text>
          </View>
        )}
      </View>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
    </Animatable.View>
  );

  const ChartPanel = ({ title, children, height = 200 }) => (
    <Animatable.View 
      animation="fadeInUp" 
      duration={800}
      style={[styles.chartPanel, { height }]}
    >
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>{title}</Text>
        <TouchableOpacity style={styles.panelMenu}>
          <Ionicons name="ellipsis-horizontal" size={16} color="#666" />
        </TouchableOpacity>
      </View>
      <View style={styles.panelContent}>
        {children}
      </View>
    </Animatable.View>
  );

  const TimeRangeSelector = () => (
    <View style={styles.timeRangeContainer}>
      {['1h', '6h', '24h', '7d'].map((range) => (
        <TouchableOpacity
          key={range}
          style={[
            styles.timeRangeButton,
            timeRange === range && styles.timeRangeButtonActive
          ]}
          onPress={() => setTimeRange(range)}
        >
          <Text style={[
            styles.timeRangeText,
            timeRange === range && styles.timeRangeTextActive
          ]}>
            {range}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Ionicons name="analytics" size={24} color="#4CAF50" />
            <Text style={styles.headerTitle}>Security Dashboard</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="refresh" size={20} color="#4CAF50" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="settings" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Time Range Selector */}
          <Animated.View 
            style={[
              styles.timeRangeWrapper,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <TimeRangeSelector />
          </Animated.View>

          {/* Key Metrics */}
          <View style={styles.metricsGrid}>
            <MetricCard
              title="Security Score"
              value={`${realTimeData.metrics.securityScore}/100`}
              icon="shield-checkmark"
              color="#4CAF50"
              trend={5}
              subtitle="Good"
            />
            <MetricCard
              title="Active Threats"
              value={realTimeData.threats[realTimeData.threats.length - 1]?.count || 0}
              icon="warning"
              color="#F44336"
              trend={-12}
              subtitle="Blocked"
            />
            <MetricCard
              title="Connections"
              value={realTimeData.metrics.activeConnections}
              icon="globe"
              color="#2196F3"
              trend={8}
              subtitle="Active"
            />
            <MetricCard
              title="Data Transferred"
              value={realTimeData.metrics.dataTransferred}
              icon="cloud-upload"
              color="#FF9800"
              trend={15}
              subtitle="Today"
            />
          </View>

          {/* Threat Timeline Chart */}
          <ChartPanel title="Threat Detection Timeline" height={250}>
            <LineChart
              data={threatData}
              width={width - 60}
              height={200}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          </ChartPanel>

          {/* Network Connections Chart */}
          <ChartPanel title="Network Connections" height={250}>
            <LineChart
              data={connectionData}
              width={width - 60}
              height={200}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          </ChartPanel>

          {/* Vulnerability Distribution */}
          <ChartPanel title="Vulnerability Distribution" height={250}>
            <PieChart
              data={vulnerabilityData}
              width={width - 60}
              height={200}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </ChartPanel>

          {/* Security Progress */}
          <ChartPanel title="Security Progress" height={200}>
            <ProgressChart
              data={progressData}
              width={width - 60}
              height={150}
              strokeWidth={8}
              radius={32}
              chartConfig={chartConfig}
              hideLegend={false}
            />
          </ChartPanel>

          {/* Real-time Alerts */}
          <Animatable.View 
            animation="fadeInUp" 
            duration={1000}
            style={styles.alertsPanel}
          >
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>🚨 Real-time Alerts</Text>
              <View style={styles.alertBadge}>
                <Text style={styles.alertBadgeText}>3</Text>
              </View>
            </View>
            <View style={styles.alertsList}>
              <View style={[styles.alertItem, { borderLeftColor: '#F44336' }]}>
                <Ionicons name="warning" size={16} color="#F44336" />
                <View style={styles.alertContent}>
                  <Text style={styles.alertTitle}>High Risk Connection Detected</Text>
                  <Text style={styles.alertDescription}>Suspicious traffic to unknown domain</Text>
                  <Text style={styles.alertTime}>2 minutes ago</Text>
                </View>
              </View>
              <View style={[styles.alertItem, { borderLeftColor: '#FF9800' }]}>
                <Ionicons name="shield" size={16} color="#FF9800" />
                <View style={styles.alertContent}>
                  <Text style={styles.alertTitle}>Vulnerability Scan Complete</Text>
                  <Text style={styles.alertDescription}>5 new vulnerabilities found</Text>
                  <Text style={styles.alertTime}>5 minutes ago</Text>
                </View>
              </View>
              <View style={[styles.alertItem, { borderLeftColor: '#4CAF50' }]}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                <View style={styles.alertContent}>
                  <Text style={styles.alertTitle}>Threat Blocked Successfully</Text>
                  <Text style={styles.alertDescription}>Malicious connection terminated</Text>
                  <Text style={styles.alertTime}>8 minutes ago</Text>
                </View>
              </View>
            </View>
          </Animatable.View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('AI Chat')}
            >
              <Ionicons name="chatbubble" size={20} color="#4CAF50" />
              <Text style={styles.actionText}>Ask AI</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('Network')}
            >
              <Ionicons name="globe" size={20} color="#2196F3" />
              <Text style={styles.actionText}>Network</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('Vulnerabilities')}
            >
              <Ionicons name="warning" size={20} color="#FF9800" />
              <Text style={styles.actionText}>Vulns</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={onRefresh}
            >
              <Ionicons name="refresh" size={20} color="#9C27B0" />
              <Text style={styles.actionText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 10,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
    marginLeft: 10,
    borderRadius: 8,
    backgroundColor: '#2a2a3e',
  },
  scrollView: {
    flex: 1,
  },
  timeRangeWrapper: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: '#2a2a3e',
    borderRadius: 8,
    padding: 4,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  timeRangeButtonActive: {
    backgroundColor: '#4CAF50',
  },
  timeRangeText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  timeRangeTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    marginHorizontal: '1%',
    borderLeftWidth: 4,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metricTitle: {
    fontSize: 12,
    color: '#ccc',
    marginLeft: 8,
    flex: 1,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  trendText: {
    fontSize: 10,
    color: '#fff',
    marginLeft: 2,
    fontWeight: 'bold',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricSubtitle: {
    fontSize: 10,
    color: '#666',
  },
  chartPanel: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 15,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  panelMenu: {
    padding: 4,
  },
  panelContent: {
    flex: 1,
  },
  chart: {
    borderRadius: 8,
  },
  alertsPanel: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 15,
  },
  alertBadge: {
    backgroundColor: '#F44336',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  alertBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  alertsList: {
    marginTop: 10,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    borderLeftWidth: 3,
    paddingLeft: 15,
  },
  alertContent: {
    flex: 1,
    marginLeft: 12,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  alertDescription: {
    fontSize: 12,
    color: '#ccc',
    marginBottom: 2,
  },
  alertTime: {
    fontSize: 10,
    color: '#666',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    justifyContent: 'space-around',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a3e',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#444',
  },
  actionText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '500',
  },
});
