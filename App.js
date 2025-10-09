import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import SimpleSecurityEventsScreen from './src/screens/SimpleSecurityEventsScreen';
import SimpleSafeBrowsingService from './src/services/SimpleSafeBrowsingService';

const { width } = Dimensions.get('window');

export default function App() {
  const [selectedTab, setSelectedTab] = useState('Dashboard');
  const [refreshing, setRefreshing] = useState(false);
  const [securityData, setSecurityData] = useState({
    securityScore: 85,
    threats: 2,
    vulnerabilities: 4,
    networkConnections: 12,
    lastScan: new Date(),
    deviceHealth: {
      battery: 78,
      storage: 65,
      memory: 45,
      temperature: 32,
    },
    networkStatus: 'Secure',
    appsAnalyzed: 45,
    highRiskApps: 1,
  });

  // Initialize security services
  useEffect(() => {
    const initializeSecurity = async () => {
      try {
        await SimpleSafeBrowsingService.initialize();
        console.log('Security services initialized');
      } catch (error) {
        console.error('Error initializing security services:', error);
      }
    };
    
    initializeSecurity();
  }, []);

  const tabs = [
    { id: 'Dashboard', name: 'Dashboard', icon: '🏠' },
    { id: 'Security', name: 'Security', icon: '🛡️' },
    { id: 'Events', name: 'Events', icon: '🚨' },
    { id: 'Network', name: 'Network', icon: '📶' },
    { id: 'Apps', name: 'Apps', icon: '📱' },
    { id: 'AI Chat', name: 'AI Chat', icon: '💬' },
    { id: 'Settings', name: 'Settings', icon: '⚙️' },
  ];

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setSecurityData(prev => ({
        ...prev,
        securityScore: Math.floor(Math.random() * 20) + 80,
        threats: Math.floor(Math.random() * 5),
        lastScan: new Date(),
      }));
      setRefreshing(false);
    }, 2000);
  };

  const runSecurityScan = () => {
    Alert.alert(
      'Security Scan',
      'Starting comprehensive security scan...',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start Scan', onPress: () => onRefresh() }
      ]
    );
  };

  const renderDashboard = () => (
    <ScrollView 
      style={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Security Dashboard</Text>
      
      {/* Security Score Card */}
      <View style={styles.scoreCard}>
        <View style={styles.scoreHeader}>
          <Text style={styles.scoreTitle}>Security Score</Text>
          <Text style={styles.scoreValue}>{securityData.securityScore}/100</Text>
        </View>
        <View style={styles.scoreBar}>
          <View style={[styles.scoreFill, { width: `${securityData.securityScore}%` }]} />
        </View>
        <Text style={styles.scoreStatus}>
          {securityData.securityScore >= 80 ? 'Excellent' : 
           securityData.securityScore >= 60 ? 'Good' : 'Needs Attention'}
        </Text>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.iconText}>🚨</Text>
          <Text style={styles.statValue}>{SimpleSafeBrowsingService.getSecurityStats()?.criticalEvents || 0}</Text>
          <Text style={styles.statLabel}>Security Events</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.iconText}>🎣</Text>
          <Text style={styles.statValue}>{SimpleSafeBrowsingService.getSecurityStats()?.phishingAttempts || 0}</Text>
          <Text style={styles.statLabel}>Phishing Blocked</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.iconText}>🛡️</Text>
          <Text style={styles.statValue}>{SimpleSafeBrowsingService.getSafetyScore() || 85}</Text>
          <Text style={styles.statLabel}>Safety Score</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.iconText}>📱</Text>
          <Text style={styles.statValue}>{securityData.appsAnalyzed}</Text>
          <Text style={styles.statLabel}>Apps Analyzed</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsGrid}>
        <TouchableOpacity style={styles.actionButton} onPress={runSecurityScan}>
          <Text style={styles.actionIcon}>🔍</Text>
          <Text style={styles.actionText}>Scan Now</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>🛠️</Text>
          <Text style={styles.actionText}>Fix Issues</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>📄</Text>
          <Text style={styles.actionText}>Report</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>⚙️</Text>
          <Text style={styles.actionText}>Settings</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderContent = () => {
    switch (selectedTab) {
      case 'Dashboard': return renderDashboard();
      case 'Security': return (
        <ScrollView style={styles.content}>
          <Text style={styles.title}>Security Scanner</Text>
          <View style={styles.scanCard}>
            <Text style={styles.scanTitle}>Last Scan: {securityData.lastScan.toLocaleTimeString()}</Text>
            <Text style={styles.scanResult}>
              {securityData.threats === 0 ? 'No threats detected' : `${securityData.threats} threats found`}
            </Text>
            <TouchableOpacity style={styles.scanButton} onPress={runSecurityScan}>
              <Text style={styles.scanButtonText}>Run Security Scan</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      );
      case 'Events': return <SimpleSecurityEventsScreen />;
      case 'Network': return (
        <ScrollView style={styles.content}>
          <Text style={styles.title}>Network Monitor</Text>
          <View style={styles.networkCard}>
            <Text style={styles.networkTitle}>Network Status</Text>
            <Text style={styles.networkStatus}>{securityData.networkStatus}</Text>
            <Text style={styles.networkConnections}>{securityData.networkConnections} active connections</Text>
          </View>
        </ScrollView>
      );
      case 'Apps': return (
        <ScrollView style={styles.content}>
          <Text style={styles.title}>App Monitor</Text>
          <View style={styles.appsCard}>
            <Text style={styles.appsTitle}>Installed Apps</Text>
            <Text style={styles.appsCount}>{securityData.appsAnalyzed} apps analyzed</Text>
            <Text style={styles.appsStatus}>
              {securityData.highRiskApps} high-risk app{securityData.highRiskApps !== 1 ? 's' : ''} found
            </Text>
          </View>
        </ScrollView>
      );
      case 'AI Chat': return (
        <ScrollView style={styles.content}>
          <Text style={styles.title}>AI Security Assistant</Text>
          <View style={styles.chatCard}>
            <Text style={styles.chatTitle}>Ask me anything about your security</Text>
            <Text style={styles.chatSubtitle}>I can help you understand threats, analyze apps, and provide security recommendations</Text>
          </View>
        </ScrollView>
      );
      case 'Settings': return (
        <ScrollView style={styles.content}>
          <Text style={styles.title}>Settings</Text>
          <View style={styles.settingsCard}>
            <Text style={styles.aboutTitle}>About</Text>
            <Text style={styles.aboutText}>Mobile Security App v1.0.0</Text>
            <Text style={styles.aboutText}>Advanced security monitoring for mobile devices</Text>
          </View>
        </ScrollView>
      );
      default: return renderDashboard();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mobile Security</Text>
        <Text style={styles.headerSubtitle}>Protect your device</Text>
      </View>

      {/* Content */}
      {renderContent()}

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              selectedTab === tab.id && styles.activeTab
            ]}
            onPress={() => setSelectedTab(tab.id)}
          >
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text style={[
              styles.tabText,
              selectedTab === tab.id && styles.activeTabText
            ]}>
              {tab.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    padding: 20,
    backgroundColor: '#2a2a3e',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#ccc',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  scoreCard: {
    backgroundColor: '#2a2a3e',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  scoreTitle: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  scoreBar: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    marginBottom: 10,
  },
  scoreFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  scoreStatus: {
    fontSize: 14,
    color: '#4CAF50',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#2a2a3e',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#ccc',
    marginTop: 4,
    textAlign: 'center',
  },
  iconText: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    backgroundColor: '#2a2a3e',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
  scanCard: {
    backgroundColor: '#2a2a3e',
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  scanTitle: {
    fontSize: 16,
    color: '#fff',
    marginTop: 15,
    marginBottom: 10,
  },
  scanResult: {
    fontSize: 14,
    color: '#4CAF50',
    marginBottom: 20,
  },
  scanButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  networkCard: {
    backgroundColor: '#2a2a3e',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  networkTitle: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  networkStatus: {
    fontSize: 16,
    color: '#4CAF50',
    marginBottom: 5,
  },
  networkConnections: {
    fontSize: 14,
    color: '#ccc',
  },
  appsCard: {
    backgroundColor: '#2a2a3e',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  appsTitle: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  appsCount: {
    fontSize: 16,
    color: '#2196F3',
    marginBottom: 5,
  },
  appsStatus: {
    fontSize: 14,
    color: '#FF9800',
  },
  chatCard: {
    backgroundColor: '#2a2a3e',
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  chatTitle: {
    fontSize: 18,
    color: '#fff',
    marginTop: 15,
    marginBottom: 10,
    textAlign: 'center',
  },
  chatSubtitle: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 20,
  },
  settingsCard: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    marginBottom: 20,
    padding: 20,
  },
  aboutTitle: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 15,
  },
  aboutText: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 8,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#2a2a3e',
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingVertical: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeTab: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  tabText: {
    fontSize: 10,
    color: '#888',
  },
  activeTabText: {
    color: '#4CAF50',
  },
});

// App component - registration is handled in index.js
