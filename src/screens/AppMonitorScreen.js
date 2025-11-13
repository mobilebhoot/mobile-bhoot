import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSecurity } from '../state/SecurityProvider';
import Toast from 'react-native-toast-message';
import appSecurityService from '../services/appSecurityService';

export default function AppMonitorScreen({ navigation }) {
  const { t } = useTranslation();
  const { securityState } = useSecurity();
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [appMonitoring, setAppMonitoring] = useState(true);
  const [installedApps, setInstalledApps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [securityReport, setSecurityReport] = useState(null);

  // Load installed apps on component mount
  useEffect(() => {
    loadInstalledApps();
  }, []);

  const filters = [
    { id: 'all', label: 'All Apps', icon: 'apps' },
    { id: 'high', label: 'High Risk', icon: 'warning' },
    { id: 'medium', label: 'Medium Risk', icon: 'alert-circle' },
    { id: 'low', label: 'Low Risk', icon: 'checkmark-circle' },
    { id: 'outdated', label: 'Outdated', icon: 'time' },
  ];

  const filteredApps = installedApps.filter(app => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'outdated') return app.securityAnalysis?.hasUpdate;
    return app.securityAnalysis?.riskLevel === selectedFilter;
  });

  // Load installed apps and perform security analysis
  const loadInstalledApps = async () => {
    setIsLoading(true);
    try {
      // Get installed apps
      const apps = await appSecurityService.getInstalledApps();
      
      // Check versions against Play Store
      const appsWithPlayStoreInfo = await appSecurityService.checkPlayStoreVersions(apps);
      
      // Generate security report
      const report = appSecurityService.generateSecurityReport(appsWithPlayStoreInfo);
      
      setInstalledApps(appsWithPlayStoreInfo);
      setSecurityReport(report);
      
      Toast.show({
        type: 'success',
        text1: 'Apps Scanned',
        text2: `Found ${apps.length} apps, ${report.highRiskApps + report.mediumRiskApps} need attention`,
      });
      
    } catch (error) {
      console.error('Error loading installed apps:', error);
      Toast.show({
        type: 'error',
        text1: 'Scan Failed',
        text2: 'Failed to scan installed apps',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh apps data
  const onRefresh = async () => {
    setRefreshing(true);
    await loadInstalledApps();
    setRefreshing(false);
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'high': return '#F44336';
      case 'medium': return '#FF9800';
      case 'low': return '#4CAF50';
      default: return '#757575';
    }
  };

  const getAppIcon = (app) => {
    if (app.icon) return app.icon;
    
    const iconMap = {
      'Chrome': 'logo-chrome',
      'Facebook': 'logo-facebook',
      'WhatsApp': 'logo-whatsapp',
      'Instagram': 'logo-instagram',
      'YouTube': 'logo-youtube',
      'Gmail': 'mail',
      'Maps': 'map',
      'Camera': 'camera',
      'Settings': 'settings',
      'PhonePe': 'card',
      'Paytm': 'wallet',
    };
    return iconMap[app.name] || 'apps';
  };

  const handleUninstallApp = (app) => {
    Alert.alert(
      'Uninstall App',
      `Are you sure you want to uninstall "${app.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Uninstall',
          style: 'destructive',
          onPress: () => {
            Toast.show({
              type: 'success',
              text1: 'App Uninstalled',
              text2: `${app.name} has been removed`,
            });
          },
        },
      ]
    );
  };

  const handleRevokePermissions = (app) => {
    Alert.alert(
      'Revoke Permissions',
      `Are you sure you want to revoke permissions for "${app.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          onPress: () => {
            Toast.show({
              type: 'success',
              text1: 'Permissions Revoked',
              text2: `${app.name} permissions have been revoked`,
            });
          },
        },
      ]
    );
  };

  const AppCard = ({ app }) => {
    const riskLevel = app.securityAnalysis?.riskLevel || 'low';
    const hasUpdate = app.securityAnalysis?.hasUpdate;
    const playStoreVersion = app.playStoreInfo?.latestVersion;
    
    return (
      <View style={[styles.appCard, { borderLeftColor: getRiskColor(riskLevel) }]}>
        <View style={styles.appHeader}>
          <View style={styles.appInfo}>
            <Ionicons 
              name={getAppIcon(app)} 
              size={32} 
              color={getRiskColor(riskLevel)} 
            />
            <View style={styles.appDetails}>
              <Text style={styles.appName}>{app.name}</Text>
              <Text style={styles.appPackage}>{app.packageName}</Text>
              <View style={styles.versionContainer}>
                <Text style={styles.appVersion}>v{app.version}</Text>
                {hasUpdate && playStoreVersion && (
                  <Text style={styles.updateAvailable}>
                    Update: v{playStoreVersion}
                  </Text>
                )}
              </View>
            </View>
          </View>
          <View style={styles.appStatus}>
            <Text style={[styles.riskBadge, { backgroundColor: getRiskColor(riskLevel) }]}>
              {riskLevel.toUpperCase()} RISK
            </Text>
            {hasUpdate && (
              <View style={styles.updateBadge}>
                <Ionicons name="arrow-up-circle" size={12} color="#FF9800" />
                <Text style={styles.updateText}>Update Available</Text>
              </View>
            )}
          </View>
        </View>

        {/* Security Issues */}
        {app.securityAnalysis?.issues?.length > 0 && (
          <View style={styles.securityIssues}>
            <Text style={styles.issuesTitle}>⚠️ Security Issues:</Text>
            {app.securityAnalysis.issues.slice(0, 2).map((issue, index) => (
              <Text key={index} style={styles.issueText}>• {issue}</Text>
            ))}
            {app.securityAnalysis.issues.length > 2 && (
              <Text style={styles.moreIssues}>
                +{app.securityAnalysis.issues.length - 2} more issues
              </Text>
            )}
          </View>
        )}

        {/* App Stats */}
        <View style={styles.appStats}>
          <View style={styles.statItem}>
            <Ionicons name="download" size={14} color="#888" />
            <Text style={styles.statText}>{(app.size || 0).toFixed(1)} MB</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="shield" size={14} color="#888" />
            <Text style={styles.statText}>{app.permissions.length} permissions</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="battery-half" size={14} color="#888" />
            <Text style={styles.statText}>{(app.batteryUsage || 0).toFixed(1)}%</Text>
          </View>
        </View>

        <View style={styles.permissionsContainer}>
          <Text style={styles.permissionsTitle}>Permissions ({app.permissions.length})</Text>
          <View style={styles.permissionsList}>
            {app.permissions.slice(0, 3).map((permission, index) => (
              <View key={index} style={styles.permissionItem}>
                <Ionicons name="shield" size={12} color="#FF9800" />
                <Text style={styles.permissionText}>{permission}</Text>
              </View>
            ))}
            {app.permissions.length > 3 && (
              <Text style={styles.morePermissions}>+{app.permissions.length - 3} more</Text>
            )}
          </View>
        </View>

        <View style={styles.appActions}>
          {hasUpdate && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.updateButton]}
              onPress={() => {
                Alert.alert(
                  'Update Available',
                  `A newer version (${playStoreVersion}) is available on Google Play Store with security improvements.`,
                  [
                    { text: 'Later', style: 'cancel' },
                    { text: 'Update Now', onPress: () => {
                      Toast.show({
                        type: 'info',
                        text1: 'Opening Play Store',
                        text2: `Redirecting to ${app.name} on Play Store`,
                      });
                    }}
                  ]
                );
              }}
            >
              <Ionicons name="arrow-up-circle" size={16} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Update</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.detailsButton]}
            onPress={() => {
              const details = [
                `Name: ${app.name}`,
                `Package: ${app.packageName}`,
                `Version: ${app.version}`,
                `Risk Level: ${riskLevel}`,
                `Risk Score: ${app.securityAnalysis?.riskScore || 0}`,
                `Size: ${(app.size || 0).toFixed(1)} MB`,
                `Battery Usage: ${(app.batteryUsage || 0).toFixed(1)}%`,
                `Category: ${app.category || 'Unknown'}`,
                `Permissions: ${app.permissions.join(', ')}`,
              ];
              
              if (app.securityAnalysis?.issues?.length > 0) {
                details.push(`\nSecurity Issues:\n• ${app.securityAnalysis.issues.join('\n• ')}`);
              }
              
              if (app.securityAnalysis?.recommendations?.length > 0) {
                details.push(`\nRecommendations:\n• ${app.securityAnalysis.recommendations.join('\n• ')}`);
              }
              
              Alert.alert('App Security Details', details.join('\n'));
            }}
          >
            <Ionicons name="information-circle" size={16} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const FilterButton = ({ filter }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        selectedFilter === filter.id && styles.filterButtonActive
      ]}
      onPress={() => setSelectedFilter(filter.id)}
    >
      <Ionicons 
        name={filter.icon} 
        size={16} 
        color={selectedFilter === filter.id ? '#FFFFFF' : '#757575'} 
      />
      <Text style={[
        styles.filterButtonText,
        selectedFilter === filter.id && styles.filterButtonTextActive
      ]}>
        {filter.label}
      </Text>
    </TouchableOpacity>
  );

  // Security Summary Component
  const SecuritySummary = () => {
    if (!securityReport) return null;

    return (
      <View style={styles.securitySummaryContainer}>
        <View style={styles.summaryHeader}>
          <Ionicons name="shield-checkmark" size={24} color="#4CAF50" />
          <Text style={styles.summaryHeaderText}>Security Overview</Text>
          <Text style={styles.summarySubText}>
            {securityReport.totalApps} apps scanned • {securityReport.appsNeedingUpdates} updates available
          </Text>
        </View>
        
        <View style={styles.summaryCards}>
          <View style={[styles.summaryCard, styles.highRiskCard]}>
            <Ionicons name="warning" size={20} color="#F44336" />
            <Text style={styles.summaryNumber}>{securityReport.highRiskApps}</Text>
            <Text style={styles.summaryCardLabel}>High Risk</Text>
          </View>
          
          <View style={[styles.summaryCard, styles.mediumRiskCard]}>
            <Ionicons name="alert-circle" size={20} color="#FF9800" />
            <Text style={styles.summaryNumber}>{securityReport.mediumRiskApps}</Text>
            <Text style={styles.summaryCardLabel}>Medium Risk</Text>
          </View>
          
          <View style={[styles.summaryCard, styles.lowRiskCard]}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.summaryNumber}>{securityReport.lowRiskApps}</Text>
            <Text style={styles.summaryCardLabel}>Low Risk</Text>
          </View>
          
          <View style={[styles.summaryCard, styles.updateCard]}>
            <Ionicons name="arrow-up-circle" size={20} color="#2196F3" />
            <Text style={styles.summaryNumber}>{securityReport.appsNeedingUpdates}</Text>
            <Text style={styles.summaryCardLabel}>Updates</Text>
          </View>
        </View>
      </View>
    );
  };

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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>App Security Monitor</Text>
          <TouchableOpacity 
            style={styles.scanButton}
            onPress={onRefresh}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#4CAF50" />
            ) : (
              <Ionicons name="refresh" size={20} color="#4CAF50" />
            )}
            <Text style={styles.scanButtonText}>
              {isLoading ? 'Scanning...' : 'Scan'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Security Summary */}
        <SecuritySummary />

        {/* App Monitoring Toggle */}
        <View style={styles.monitoringContainer}>
          <View style={styles.monitoringHeader}>
            <Ionicons name="apps" size={20} color="#FFFFFF" />
            <Text style={styles.monitoringTitle}>Real-time App Monitoring</Text>
          </View>
          <Switch
            value={appMonitoring}
            onValueChange={setAppMonitoring}
            trackColor={{ false: '#333', true: '#4CAF50' }}
            thumbColor={appMonitoring ? '#FFFFFF' : '#757575'}
          />
        </View>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <Text style={styles.filtersTitle}>Filter by Risk Level</Text>
          <View style={styles.filtersList}>
            {filters.map((filter) => (
              <FilterButton key={filter.id} filter={filter} />
            ))}
          </View>
        </View>

        {/* Apps List */}
        <View style={styles.appsContainer}>
          <View style={styles.appsHeader}>
            <Text style={styles.appsTitle}>
              {isLoading ? 'Scanning Apps...' : `${filteredApps.length} Apps Found`}
            </Text>
            {!isLoading && selectedFilter !== 'all' && (
              <TouchableOpacity onPress={() => setSelectedFilter('all')}>
                <Text style={styles.clearFilterText}>Clear Filter</Text>
              </TouchableOpacity>
            )}
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4CAF50" />
              <Text style={styles.loadingText}>Analyzing installed apps...</Text>
              <Text style={styles.loadingSubText}>Checking versions and security risks</Text>
            </View>
          ) : filteredApps.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
              <Text style={styles.emptyStateTitle}>
                {selectedFilter === 'all' ? 'No Apps Found' : `No ${selectedFilter} Risk Apps`}
              </Text>
              <Text style={styles.emptyStateDescription}>
                {selectedFilter === 'all' 
                  ? 'Unable to scan installed apps' 
                  : `No ${selectedFilter} risk apps detected. Your device is secure!`
                }
              </Text>
            </View>
          ) : (
            filteredApps.map((app) => (
              <AppCard key={app.id} app={app} />
            ))
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.quickActionsTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity style={styles.quickActionButton}>
              <Ionicons name="shield-checkmark" size={24} color="#4CAF50" />
              <Text style={styles.quickActionText}>Secure All Apps</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickActionButton}>
              <Ionicons name="document-text" size={24} color="#2196F3" />
              <Text style={styles.quickActionText}>Export Report</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickActionButton}>
              <Ionicons name="notifications" size={24} color="#FF9800" />
              <Text style={styles.quickActionText}>Set Alerts</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickActionButton}>
              <Ionicons name="settings" size={24} color="#9C27B0" />
              <Text style={styles.quickActionText}>Settings</Text>
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
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  scanButtonText: {
    color: '#4CAF50',
    marginLeft: 4,
    fontWeight: 'bold',
  },
  monitoringContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 15,
    borderRadius: 12,
  },
  monitoringHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monitoringTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 10,
  },
  // Security Summary Styles
  securitySummaryContainer: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 15,
  },
  summaryHeader: {
    alignItems: 'center',
    marginBottom: 15,
  },
  summaryHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8,
  },
  summarySubText: {
    fontSize: 12,
    color: '#B0B0B0',
    marginTop: 4,
  },
  summaryCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 3,
    alignItems: 'center',
  },
  highRiskCard: {
    borderTopWidth: 3,
    borderTopColor: '#F44336',
  },
  mediumRiskCard: {
    borderTopWidth: 3,
    borderTopColor: '#FF9800',
  },
  lowRiskCard: {
    borderTopWidth: 3,
    borderTopColor: '#4CAF50',
  },
  updateCard: {
    borderTopWidth: 3,
    borderTopColor: '#2196F3',
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 5,
  },
  summaryCardLabel: {
    fontSize: 10,
    color: '#B0B0B0',
    marginTop: 2,
  },
  // Loading Styles
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 15,
    fontWeight: '600',
  },
  loadingSubText: {
    fontSize: 12,
    color: '#B0B0B0',
    marginTop: 5,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  filtersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
  },
  filterButtonActive: {
    backgroundColor: '#4CAF50',
  },
  filterButtonText: {
    color: '#757575',
    marginLeft: 4,
    fontSize: 12,
    fontWeight: 'bold',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  appsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  appsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  appsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  clearFilterText: {
    fontSize: 14,
    color: '#4CAF50',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#B0B0B0',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  appCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
  },
  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  appInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  appDetails: {
    marginLeft: 12,
    flex: 1,
  },
  appName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  appPackage: {
    fontSize: 12,
    color: '#B0B0B0',
    marginBottom: 2,
  },
  versionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  appVersion: {
    fontSize: 10,
    color: '#757575',
  },
  updateAvailable: {
    fontSize: 9,
    color: '#FF9800',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  appStatus: {
    alignItems: 'flex-end',
  },
  riskBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 4,
  },
  updateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  updateText: {
    fontSize: 8,
    color: '#FFFFFF',
    marginLeft: 2,
    fontWeight: 'bold',
  },
  // Security Issues Styles
  securityIssues: {
    backgroundColor: '#2a1a1a',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#F44336',
  },
  issuesTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 5,
  },
  issueText: {
    fontSize: 11,
    color: '#FFCCCC',
    marginBottom: 2,
    lineHeight: 16,
  },
  moreIssues: {
    fontSize: 10,
    color: '#FF9800',
    fontStyle: 'italic',
    marginTop: 2,
  },
  // App Stats Styles
  appStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#2a2a2a',
    borderRadius: 6,
    padding: 8,
    marginBottom: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 10,
    color: '#B0B0B0',
    marginLeft: 4,
  },
  permissionsContainer: {
    marginBottom: 12,
  },
  permissionsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  permissionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  permissionText: {
    fontSize: 10,
    color: '#FFFFFF',
    marginLeft: 4,
  },
  morePermissions: {
    fontSize: 10,
    color: '#4CAF50',
    fontStyle: 'italic',
  },
  appActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 2,
    justifyContent: 'center',
  },
  revokeButton: {
    backgroundColor: '#FF9800',
  },
  detailsButton: {
    backgroundColor: '#2196F3',
  },
  uninstallButton: {
    backgroundColor: '#F44336',
  },
  updateButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
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