import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useSecurity } from '../state/SecurityProvider';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }) {
  const { securityState, performSecurityScan } = useSecurity();
  const [refreshing, setRefreshing] = useState(false);

  // Add null safety check
  if (!securityState) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Initializing Security Dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await performSecurityScan();
    setRefreshing(false);
    Toast.show({
      type: 'success',
      text1: 'Security Scan Complete',
      text2: 'Your device has been scanned for vulnerabilities',
    });
  };

  const getSecurityColor = (score) => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#FF9800';
    return '#F44336';
  };

  const getSecurityStatus = (score) => {
    if (score >= 80) return 'Secure';
    if (score >= 60) return 'Moderate';
    return 'At Risk';
  };

  const chartConfig = {
    backgroundColor: '#1a1a1a',
    backgroundGradientFrom: '#1a1a1a',
    backgroundGradientTo: '#1a1a1a',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#4CAF50',
    },
  };

  const pieChartData = [
    {
      name: 'Secure',
      population: (securityState?.vulnerabilities ?? []).filter(v => v.severity === 'low').length,
      color: '#4CAF50',
      legendFontColor: '#FFFFFF',
      legendFontSize: 12,
    },
    {
      name: 'Medium Risk',
      population: (securityState?.vulnerabilities ?? []).filter(v => v.severity === 'medium').length,
      color: '#FF9800',
      legendFontColor: '#FFFFFF',
      legendFontSize: 12,
    },
    {
      name: 'High Risk',
      population: (securityState?.vulnerabilities ?? []).filter(v => v.severity === 'high').length,
      color: '#F44336',
      legendFontColor: '#FFFFFF',
      legendFontSize: 12,
    },
  ];

  const networkData = {
    labels: ['Chrome', 'Facebook', 'WhatsApp', 'Instagram', 'YouTube'],
    datasets: [
      {
        data: [1024, 2048, 1536, 768, 3072],
      },
    ],
  };

  const deviceHealthData = {
    labels: ['Battery', 'Storage', 'Memory', 'Temperature'],
    datasets: [
      {
        data: [
          securityState?.deviceHealth?.battery ?? 0,
          securityState?.deviceHealth?.storage ?? 0,
          securityState?.deviceHealth?.memory ?? 0,
          securityState?.deviceHealth?.temperature ?? 0,
        ],
      },
    ],
  };

  const SecurityCard = ({ title, value, icon, color, onPress }) => (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <LinearGradient
        colors={[color, color + '80']}
        style={styles.cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name={icon} size={24} color="#FFFFFF" />
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardValue}>{value}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  const VulnerabilityCard = ({ vulnerability }) => (
    <View style={[styles.vulnerabilityCard, { borderLeftColor: getSeverityColor(vulnerability.severity) }]}>
      <View style={styles.vulnerabilityHeader}>
        <Ionicons 
          name={getVulnerabilityIcon(vulnerability.type)} 
          size={20} 
          color={getSeverityColor(vulnerability.severity)} 
        />
        <Text style={[styles.severityBadge, { backgroundColor: getSeverityColor(vulnerability.severity) }]}>
          {vulnerability.severity.toUpperCase()}
        </Text>
      </View>
      <Text style={styles.vulnerabilityTitle}>{vulnerability.title}</Text>
      <Text style={styles.vulnerabilityDescription}>{vulnerability.description}</Text>
      <Text style={styles.vulnerabilityTime}>
        {new Date(vulnerability.timestamp).toLocaleTimeString()}
      </Text>
    </View>
  );

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return '#F44336';
      case 'medium': return '#FF9800';
      case 'low': return '#4CAF50';
      default: return '#757575';
    }
  };

  const getVulnerabilityIcon = (type) => {
    switch (type) {
      case 'network': return 'wifi';
      case 'app': return 'apps';
      case 'device': return 'phone-portrait';
      default: return 'warning';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Security Dashboard</Text>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color="#4CAF50" />
          </TouchableOpacity>
        </View>

        {/* Security Score */}
        <View style={styles.securityScoreContainer}>
          <LinearGradient
            colors={['#1a1a1a', '#2a2a2a']}
            style={styles.securityScoreCard}
          >
            <View style={styles.scoreHeader}>
              <Text style={styles.scoreTitle}>Security Score</Text>
              <Text style={styles.scoreStatus}>{getSecurityStatus(securityState.securityScore)}</Text>
            </View>
            <View style={styles.scoreCircle}>
              <Text style={[styles.scoreValue, { color: getSecurityColor(securityState.securityScore) }]}>
                {securityState.securityScore}
              </Text>
              <Text style={styles.scoreLabel}>/ 100</Text>
            </View>
            <Text style={styles.lastScan}>
              Last scan: {securityState.lastScan ? new Date(securityState.lastScan).toLocaleString() : 'Never'}
            </Text>
          </LinearGradient>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <SecurityCard
            title="Vulnerabilities"
            value={securityState?.vulnerabilities?.length ?? 0}
            icon="warning"
            color="#F44336"
            onPress={() => navigation.navigate('Vulnerabilities')}
          />
          <SecurityCard
            title="Threats"
            value={securityState?.threats?.length ?? 0}
            icon="shield"
            color="#FF9800"
            onPress={() => navigation.navigate('Vulnerabilities')}
          />
          <SecurityCard
            title="Apps Monitored"
            value={securityState?.installedApps?.length ?? 0}
            icon="apps"
            color="#2196F3"
            onPress={() => navigation.navigate('Apps')}
          />
          <SecurityCard
            title="Network Connections"
            value={securityState?.networkConnections?.length ?? 0}
            icon="wifi"
            color="#9C27B0"
            onPress={() => navigation.navigate('Network')}
          />
        </View>

        {/* Vulnerability Chart */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Vulnerability Distribution</Text>
          <PieChart
            data={pieChartData}
            width={width - 40}
            height={200}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </View>

        {/* Network Traffic Chart */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Network Traffic (Last 24h)</Text>
          <BarChart
            data={networkData}
            width={width - 40}
            height={200}
            chartConfig={chartConfig}
            verticalLabelRotation={30}
            fromZero
          />
        </View>

        {/* Device Health Chart */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Device Health</Text>
          <BarChart
            data={deviceHealthData}
            width={width - 40}
            height={200}
            chartConfig={chartConfig}
            verticalLabelRotation={30}
            fromZero
          />
        </View>

        {/* Recent Vulnerabilities */}
        <View style={styles.vulnerabilitiesContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Vulnerabilities</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Vulnerabilities')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {(securityState?.vulnerabilities ?? []).slice(0, 3).map((vulnerability) => (
            <VulnerabilityCard key={vulnerability.id} vulnerability={vulnerability} />
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionButton} onPress={onRefresh}>
              <Ionicons name="scan" size={24} color="#4CAF50" />
              <Text style={styles.actionText}>Scan Now</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => navigation.navigate('SecurityReport')}
            >
              <Ionicons name="document-text" size={24} color="#2196F3" />
              <Text style={styles.actionText}>Generate Report</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => navigation.navigate('Settings')}
            >
              <Ionicons name="settings" size={24} color="#FF9800" />
              <Text style={styles.actionText}>Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => navigation.navigate('Network')}
            >
              <Ionicons name="wifi" size={24} color="#9C27B0" />
              <Text style={styles.actionText}>Network Monitor</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  refreshButton: {
    padding: 8,
  },
  securityScoreContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  securityScoreCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  scoreTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scoreStatus: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  scoreCircle: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 18,
    color: '#757575',
  },
  lastScan: {
    fontSize: 12,
    color: '#757575',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  card: {
    width: '48%',
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 15,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 8,
    textAlign: 'center',
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  chartContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 15,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  vulnerabilitiesContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  seeAllText: {
    fontSize: 14,
    color: '#4CAF50',
  },
  vulnerabilityCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  vulnerabilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  severityBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  vulnerabilityTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  vulnerabilityDescription: {
    fontSize: 12,
    color: '#B0B0B0',
    marginBottom: 8,
  },
  vulnerabilityTime: {
    fontSize: 10,
    color: '#757575',
  },
  quickActionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  actionText: {
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 8,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f23',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
  },
}); 