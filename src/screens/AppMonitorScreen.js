import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSecurity } from '../state/SecurityProvider';
import Toast from 'react-native-toast-message';

export default function AppMonitorScreen({ navigation }) {
  const { securityState } = useSecurity();
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [appMonitoring, setAppMonitoring] = useState(true);

  const filters = [
    { id: 'all', label: 'All Apps', icon: 'apps' },
    { id: 'high', label: 'High Risk', icon: 'warning' },
    { id: 'medium', label: 'Medium Risk', icon: 'alert-circle' },
    { id: 'low', label: 'Low Risk', icon: 'checkmark-circle' },
  ];

  const filteredApps = securityState.installedApps.filter(app => {
    if (selectedFilter === 'all') return true;
    return app.risk === selectedFilter;
  });

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'high': return '#F44336';
      case 'medium': return '#FF9800';
      case 'low': return '#4CAF50';
      default: return '#757575';
    }
  };

  const getAppIcon = (appName) => {
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
    };
    return iconMap[appName] || 'apps';
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

  const AppCard = ({ app }) => (
    <View style={[styles.appCard, { borderLeftColor: getRiskColor(app.risk) }]}>
      <View style={styles.appHeader}>
        <View style={styles.appInfo}>
          <Ionicons 
            name={getAppIcon(app.name)} 
            size={32} 
            color={getRiskColor(app.risk)} 
          />
          <View style={styles.appDetails}>
            <Text style={styles.appName}>{app.name}</Text>
            <Text style={styles.appPackage}>{app.package}</Text>
            <Text style={styles.appVersion}>v{app.version}</Text>
          </View>
        </View>
        <View style={styles.appStatus}>
          <Text style={[styles.riskBadge, { backgroundColor: getRiskColor(app.risk) }]}>
            {app.risk.toUpperCase()} RISK
          </Text>
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
        <TouchableOpacity 
          style={[styles.actionButton, styles.revokeButton]}
          onPress={() => handleRevokePermissions(app)}
        >
          <Ionicons name="shield" size={16} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Revoke Permissions</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.detailsButton]}
          onPress={() => {
            Alert.alert('App Details', 
              `Name: ${app.name}\nPackage: ${app.package}\nVersion: ${app.version}\nRisk Level: ${app.risk}\nPermissions: ${app.permissions.join(', ')}`
            );
          }}
        >
          <Ionicons name="information-circle" size={16} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Details</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.uninstallButton]}
          onPress={() => handleUninstallApp(app)}
        >
          <Ionicons name="trash" size={16} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Uninstall</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>App Monitor</Text>
          <TouchableOpacity style={styles.scanButton}>
            <Ionicons name="refresh" size={20} color="#4CAF50" />
            <Text style={styles.scanButtonText}>Scan</Text>
          </TouchableOpacity>
        </View>

        {/* App Monitoring Toggle */}
        <View style={styles.monitoringContainer}>
          <View style={styles.monitoringHeader}>
            <Ionicons name="apps" size={20} color="#FFFFFF" />
            <Text style={styles.monitoringTitle}>App Monitoring</Text>
          </View>
          <Switch
            value={appMonitoring}
            onValueChange={setAppMonitoring}
            trackColor={{ false: '#333', true: '#4CAF50' }}
            thumbColor={appMonitoring ? '#FFFFFF' : '#757575'}
          />
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <LinearGradient
              colors={['#F44336', '#F4433680']}
              style={styles.summaryGradient}
            >
              <Ionicons name="warning" size={24} color="#FFFFFF" />
              <Text style={styles.summaryValue}>
                {securityState.installedApps.filter(app => app.risk === 'high').length}
              </Text>
              <Text style={styles.summaryLabel}>High Risk Apps</Text>
            </LinearGradient>
          </View>

          <View style={styles.summaryCard}>
            <LinearGradient
              colors={['#FF9800', '#FF980080']}
              style={styles.summaryGradient}
            >
              <Ionicons name="alert-circle" size={24} color="#FFFFFF" />
              <Text style={styles.summaryValue}>
                {securityState.installedApps.filter(app => app.risk === 'medium').length}
              </Text>
              <Text style={styles.summaryLabel}>Medium Risk Apps</Text>
            </LinearGradient>
          </View>

          <View style={styles.summaryCard}>
            <LinearGradient
              colors={['#4CAF50', '#4CAF5080']}
              style={styles.summaryGradient}
            >
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              <Text style={styles.summaryValue}>
                {securityState.installedApps.filter(app => app.risk === 'low').length}
              </Text>
              <Text style={styles.summaryLabel}>Safe Apps</Text>
            </LinearGradient>
          </View>
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
              {filteredApps.length} Apps Found
            </Text>
            <TouchableOpacity onPress={() => setSelectedFilter('all')}>
              <Text style={styles.clearFilterText}>Clear Filter</Text>
            </TouchableOpacity>
          </View>

          {filteredApps.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
              <Text style={styles.emptyStateTitle}>No Apps Found</Text>
              <Text style={styles.emptyStateDescription}>
                No {selectedFilter !== 'all' ? selectedFilter : ''} risk apps detected.
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
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    marginHorizontal: 5,
    borderRadius: 12,
    overflow: 'hidden',
  },
  summaryGradient: {
    padding: 15,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 4,
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
  appVersion: {
    fontSize: 10,
    color: '#757575',
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