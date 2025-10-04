import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSecurity } from '../state/SecurityProvider';
import Toast from 'react-native-toast-message';

export default function SecurityReportScreen({ navigation }) {
  const { securityState } = useSecurity();
  const [selectedReportType, setSelectedReportType] = useState('comprehensive');

  const reportTypes = [
    { id: 'comprehensive', label: 'Comprehensive', icon: 'document-text' },
    { id: 'vulnerabilities', label: 'Vulnerabilities', icon: 'warning' },
    { id: 'network', label: 'Network', icon: 'wifi' },
    { id: 'apps', label: 'Apps', icon: 'apps' },
  ];

  const generateReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      securityScore: securityState.securityScore,
      vulnerabilities: securityState.vulnerabilities.length,
      threats: securityState.threats.length,
      networkConnections: securityState.networkConnections.length,
      installedApps: securityState.installedApps.length,
      lastScan: securityState.lastScan,
      deviceInfo: securityState.deviceInfo,
    };

    Alert.alert(
      'Generate Report',
      'Security report has been generated successfully!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Share',
          onPress: () => {
            Share.share({
              message: `Security Report\nScore: ${report.securityScore}/100\nVulnerabilities: ${report.vulnerabilities}\nThreats: ${report.threats}`,
              title: 'Security Report',
            });
          },
        },
      ]
    );
  };

  const ReportTypeButton = ({ reportType }) => (
    <TouchableOpacity
      style={[
        styles.reportTypeButton,
        selectedReportType === reportType.id && styles.reportTypeButtonActive
      ]}
      onPress={() => setSelectedReportType(reportType.id)}
    >
      <Ionicons 
        name={reportType.icon} 
        size={24} 
        color={selectedReportType === reportType.id ? '#FFFFFF' : '#4CAF50'} 
      />
      <Text style={[
        styles.reportTypeText,
        selectedReportType === reportType.id && styles.reportTypeTextActive
      ]}>
        {reportType.label}
      </Text>
    </TouchableOpacity>
  );

  const ReportSection = ({ title, icon, children }) => (
    <View style={styles.reportSection}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={20} color="#4CAF50" />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );

  const MetricCard = ({ title, value, icon, color, subtitle }) => (
    <View style={styles.metricCard}>
      <LinearGradient
        colors={[color, color + '80']}
        style={styles.metricGradient}
      >
        <Ionicons name={icon} size={24} color="#FFFFFF" />
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricTitle}>{title}</Text>
        {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
      </LinearGradient>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Security Report</Text>
          <TouchableOpacity style={styles.generateButton} onPress={generateReport}>
            <Ionicons name="refresh" size={20} color="#4CAF50" />
            <Text style={styles.generateButtonText}>Generate</Text>
          </TouchableOpacity>
        </View>

        {/* Report Type Selection */}
        <View style={styles.reportTypeContainer}>
          <Text style={styles.reportTypeTitle}>Select Report Type</Text>
          <View style={styles.reportTypeGrid}>
            {reportTypes.map((reportType) => (
              <ReportTypeButton key={reportType.id} reportType={reportType} />
            ))}
          </View>
        </View>

        {/* Security Overview */}
        <ReportSection title="Security Overview" icon="shield">
          <View style={styles.overviewContainer}>
            <MetricCard
              title="Security Score"
              value={`${securityState.securityScore}/100`}
              icon="shield-check"
              color="#4CAF50"
              subtitle="Overall security rating"
            />
            
            <MetricCard
              title="Vulnerabilities"
              value={securityState.vulnerabilities.length}
              icon="warning"
              color="#F44336"
              subtitle="Active security issues"
            />
            
            <MetricCard
              title="Threats"
              value={securityState.threats.length}
              icon="bug"
              color="#FF9800"
              subtitle="Detected threats"
            />
            
            <MetricCard
              title="Last Scan"
              value={securityState.lastScan ? new Date(securityState.lastScan).toLocaleDateString() : 'Never'}
              icon="time"
              color="#2196F3"
              subtitle="Last security scan"
            />
          </View>
        </ReportSection>

        {/* Network Security */}
        <ReportSection title="Network Security" icon="wifi">
          <View style={styles.networkContainer}>
            <View style={styles.networkItem}>
              <Text style={styles.networkLabel}>Active Connections</Text>
              <Text style={styles.networkValue}>{securityState.networkConnections.length}</Text>
            </View>
            
            <View style={styles.networkItem}>
              <Text style={styles.networkLabel}>Secure Connections</Text>
              <Text style={styles.networkValue}>
                {securityState.networkTraffic.filter(t => t.status === 'secure').length}
              </Text>
            </View>
            
            <View style={styles.networkItem}>
              <Text style={styles.networkLabel}>Risky Connections</Text>
              <Text style={styles.networkValue}>
                {securityState.networkTraffic.filter(t => t.status !== 'secure').length}
              </Text>
            </View>
          </View>
        </ReportSection>

        {/* App Security */}
        <ReportSection title="App Security" icon="apps">
          <View style={styles.appContainer}>
            <View style={styles.appItem}>
              <Text style={styles.appLabel}>Total Apps</Text>
              <Text style={styles.appValue}>{securityState.installedApps.length}</Text>
            </View>
            
            <View style={styles.appItem}>
              <Text style={styles.appLabel}>High Risk Apps</Text>
              <Text style={styles.appValue}>
                {securityState.installedApps.filter(app => app.risk === 'high').length}
              </Text>
            </View>
            
            <View style={styles.appItem}>
              <Text style={styles.appLabel}>Safe Apps</Text>
              <Text style={styles.appValue}>
                {securityState.installedApps.filter(app => app.risk === 'low').length}
              </Text>
            </View>
          </View>
        </ReportSection>

        {/* Device Information */}
        <ReportSection title="Device Information" icon="phone-portrait">
          <View style={styles.deviceContainer}>
            <View style={styles.deviceItem}>
              <Text style={styles.deviceLabel}>Device Name</Text>
              <Text style={styles.deviceValue}>{securityState.deviceInfo.deviceName || 'Unknown'}</Text>
            </View>
            
            <View style={styles.deviceItem}>
              <Text style={styles.deviceLabel}>System Version</Text>
              <Text style={styles.deviceValue}>{securityState.deviceInfo.systemVersion || 'Unknown'}</Text>
            </View>
            
            <View style={styles.deviceItem}>
              <Text style={styles.deviceLabel}>App Version</Text>
              <Text style={styles.deviceValue}>{securityState.deviceInfo.appVersion || '1.0.0'}</Text>
            </View>
            
            <View style={styles.deviceItem}>
              <Text style={styles.deviceLabel}>Brand</Text>
              <Text style={styles.deviceValue}>{securityState.deviceInfo.brand || 'Unknown'}</Text>
            </View>
          </View>
        </ReportSection>

        {/* Recommendations */}
        <ReportSection title="Security Recommendations" icon="bulb">
          <View style={styles.recommendationsContainer}>
            {securityState.vulnerabilities.length > 0 && (
              <View style={styles.recommendationItem}>
                <Ionicons name="warning" size={16} color="#FF9800" />
                <Text style={styles.recommendationText}>
                  Fix {securityState.vulnerabilities.length} detected vulnerabilities
                </Text>
              </View>
            )}
            
            {securityState.threats.length > 0 && (
              <View style={styles.recommendationItem}>
                <Ionicons name="bug" size={16} color="#F44336" />
                <Text style={styles.recommendationText}>
                  Address {securityState.threats.length} security threats
                </Text>
              </View>
            )}
            
            {securityState.installedApps.filter(app => app.risk === 'high').length > 0 && (
              <View style={styles.recommendationItem}>
                <Ionicons name="apps" size={16} color="#FF9800" />
                <Text style={styles.recommendationText}>
                  Review {securityState.installedApps.filter(app => app.risk === 'high').length} high-risk apps
                </Text>
              </View>
            )}
            
            <View style={styles.recommendationItem}>
              <Ionicons name="shield-check" size={16} color="#4CAF50" />
              <Text style={styles.recommendationText}>
                Enable automatic security scans
              </Text>
            </View>
            
            <View style={styles.recommendationItem}>
              <Ionicons name="wifi" size={16} color="#2196F3" />
              <Text style={styles.recommendationText}>
                Use VPN for secure browsing
              </Text>
            </View>
          </View>
        </ReportSection>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.quickActionsTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity style={styles.quickActionButton}>
              <Ionicons name="share" size={24} color="#4CAF50" />
              <Text style={styles.quickActionText}>Share Report</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickActionButton}>
              <Ionicons name="download" size={24} color="#2196F3" />
              <Text style={styles.quickActionText}>Export PDF</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickActionButton}>
              <Ionicons name="mail" size={24} color="#FF9800" />
              <Text style={styles.quickActionText}>Email Report</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickActionButton}>
              <Ionicons name="print" size={24} color="#9C27B0" />
              <Text style={styles.quickActionText}>Print Report</Text>
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
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  generateButtonText: {
    color: '#4CAF50',
    marginLeft: 4,
    fontWeight: 'bold',
  },
  reportTypeContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  reportTypeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  reportTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  reportTypeButton: {
    width: '48%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  reportTypeButtonActive: {
    backgroundColor: '#4CAF50',
  },
  reportTypeText: {
    color: '#4CAF50',
    marginTop: 8,
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  reportTypeTextActive: {
    color: '#FFFFFF',
  },
  reportSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#1a1a1a',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 10,
  },
  overviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  metricCard: {
    width: '48%',
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  metricGradient: {
    padding: 15,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8,
  },
  metricTitle: {
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 4,
    textAlign: 'center',
  },
  metricSubtitle: {
    fontSize: 10,
    color: '#FFFFFF',
    marginTop: 2,
    textAlign: 'center',
    opacity: 0.8,
  },
  networkContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  networkItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 15,
    marginBottom: 1,
  },
  networkLabel: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  networkValue: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  appContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  appItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 15,
    marginBottom: 1,
  },
  appLabel: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  appValue: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  deviceContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  deviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 15,
    marginBottom: 1,
  },
  deviceLabel: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  deviceValue: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  recommendationsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 15,
    marginBottom: 1,
  },
  recommendationText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 10,
    flex: 1,
  },
  quickActionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: '48%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  quickActionText: {
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 8,
    textAlign: 'center',
  },
}); 