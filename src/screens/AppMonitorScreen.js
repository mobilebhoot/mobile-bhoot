import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSecurity } from '../state/SecurityProvider';
import { COLORS, SIZES, GRADIENTS, SHADOWS } from '../app/theme';
import Toast from 'react-native-toast-message';
import * as Application from 'expo-application';
import AsyncStorage from '@react-native-async-storage/async-storage';
import installedAppsService from '../services/installedAppsService';
import playStoreService from '../services/playStoreService';

const { width } = Dimensions.get('window');

export default function AppMonitorScreen({ navigation }) {
  const { t } = useTranslation();
  const { securityState } = useSecurity();
  const [isScanning, setIsScanning] = useState(false);
  const [installedApps, setInstalledApps] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [scanProgress, setScanProgress] = useState(0);
  const [currentApp, setCurrentApp] = useState('');
  const [scanResults, setScanResults] = useState({
    totalApps: 0,
    outdatedApps: 0,
    securityIssues: 0,
    suspiciousApps: 0,
    unknownSources: 0,
    highRiskPermissions: 0
  });

  // Filter options
  const filterOptions = [
    { id: 'all', label: 'All Apps', icon: 'apps' },
    { id: 'outdated', label: 'Outdated', icon: 'time', color: COLORS.warning },
    { id: 'security', label: 'Security Issues', icon: 'shield', color: COLORS.error },
    { id: 'suspicious', label: 'Suspicious', icon: 'warning', color: COLORS.error },
    { id: 'system', label: 'System Apps', icon: 'settings', color: COLORS.info },
    { id: 'user', label: 'User Apps', icon: 'person', color: COLORS.success }
  ];

  useEffect(() => {
    loadInstalledApps();
  }, []);

  const loadInstalledApps = async () => {
    try {
      setIsScanning(true);
      const apps = await installedAppsService.getInstalledApps();
      setInstalledApps(apps);
      setScanResults(prev => ({ ...prev, totalApps: apps.length }));
    } catch (error) {
      console.error('Failed to load apps:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to load apps',
        text2: 'Please try again',
        position: 'bottom'
      });
    } finally {
      setIsScanning(false);
    }
  };

  const startComprehensiveScan = async () => {
    if (isScanning) return;

    setIsScanning(true);
    setScanProgress(0);
    setCurrentApp('');

    try {
      const apps = await installedAppsService.getInstalledApps();
      setInstalledApps(apps);
      
      let scannedResults = {
        totalApps: apps.length,
        outdatedApps: 0,
        securityIssues: 0,
        suspiciousApps: 0,
        unknownSources: 0,
        highRiskPermissions: 0
      };

      // Scan each app
      for (let i = 0; i < apps.length; i++) {
        const app = apps[i];
        setCurrentApp(app.appName || app.packageName);
        setScanProgress(((i + 1) / apps.length) * 100);

        // Version comparison with Play Store
        try {
          const playStoreInfo = await playStoreService.getAppInfo(app.packageName);
          if (playStoreInfo && playStoreInfo.version !== app.versionName) {
            scannedResults.outdatedApps++;
            app.isOutdated = true;
            app.playStoreVersion = playStoreInfo.version;
            app.hasUpdate = true;
          }
        } catch (error) {
          console.log(`Failed to check Play Store version for ${app.packageName}`);
        }

        // Security analysis
        const securityAnalysis = await analyzeAppSecurity(app);
        if (securityAnalysis.hasSecurityIssues) {
          scannedResults.securityIssues++;
          app.securityIssues = securityAnalysis.issues;
        }

        if (securityAnalysis.isSuspicious) {
          scannedResults.suspiciousApps++;
          app.isSuspicious = true;
          app.suspiciousReasons = securityAnalysis.suspiciousReasons;
        }

        if (securityAnalysis.isUnknownSource) {
          scannedResults.unknownSources++;
          app.isUnknownSource = true;
        }

        if (securityAnalysis.hasHighRiskPermissions) {
          scannedResults.highRiskPermissions++;
          app.hasHighRiskPermissions = true;
          app.highRiskPermissions = securityAnalysis.highRiskPermissions;
        }

        // Add brief delay to show progress
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setScanResults(scannedResults);
      setInstalledApps(apps);

      Toast.show({
        type: scannedResults.securityIssues > 0 ? 'error' : 'success',
        text1: 'App Scan Complete',
        text2: `Scanned ${scannedResults.totalApps} apps, found ${scannedResults.securityIssues + scannedResults.outdatedApps} issues`,
        position: 'bottom'
      });

    } catch (error) {
      console.error('App scan failed:', error);
      Toast.show({
        type: 'error',
        text1: 'App Scan Failed',
        text2: error.message || 'Please try again',
        position: 'bottom'
      });
    } finally {
      setIsScanning(false);
      setCurrentApp('');
      setScanProgress(0);
    }
  };

  // Analyze app security
  const analyzeAppSecurity = async (app) => {
    const analysis = {
      hasSecurityIssues: false,
      isSuspicious: false,
      isUnknownSource: false,
      hasHighRiskPermissions: false,
      issues: [],
      suspiciousReasons: [],
      highRiskPermissions: []
    };

    // Check for suspicious permissions
    const highRiskPermissions = [
      'android.permission.READ_SMS',
      'android.permission.SEND_SMS',
      'android.permission.READ_CONTACTS',
      'android.permission.CAMERA',
      'android.permission.RECORD_AUDIO',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.READ_PHONE_STATE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.WRITE_SETTINGS',
      'android.permission.DEVICE_ADMIN'
    ];

    if (app.permissions) {
      const appHighRiskPerms = app.permissions.filter(perm => 
        highRiskPermissions.includes(perm)
      );
      
      if (appHighRiskPerms.length > 0) {
        analysis.hasHighRiskPermissions = true;
        analysis.highRiskPermissions = appHighRiskPerms;
      }

      // Too many permissions is suspicious
      if (app.permissions.length > 20) {
        analysis.isSuspicious = true;
        analysis.suspiciousReasons.push('App requests too many permissions');
      }
    }

    // Check for outdated apps (potential security risk)
    if (app.isOutdated) {
      analysis.hasSecurityIssues = true;
      analysis.issues.push('App version is outdated');
    }

    // Check installation source
    if (app.installerPackageName !== 'com.android.vending') {
      analysis.isUnknownSource = true;
      if (!app.installerPackageName) {
        analysis.isSuspicious = true;
        analysis.suspiciousReasons.push('App installed from unknown source');
      }
    }

    // Check for suspicious package names
    const suspiciousKeywords = ['hack', 'crack', 'mod', 'fake', 'virus', 'trojan'];
    const packageName = app.packageName.toLowerCase();
    
    if (suspiciousKeywords.some(keyword => packageName.includes(keyword))) {
      analysis.isSuspicious = true;
      analysis.suspiciousReasons.push('App has suspicious package name');
    }

    return analysis;
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInstalledApps();
    setRefreshing(false);
  };

  const getFilteredApps = () => {
    switch (selectedFilter) {
      case 'outdated':
        return installedApps.filter(app => app.isOutdated);
      case 'security':
        return installedApps.filter(app => app.securityIssues && app.securityIssues.length > 0);
      case 'suspicious':
        return installedApps.filter(app => app.isSuspicious);
      case 'system':
        return installedApps.filter(app => app.isSystemApp);
      case 'user':
        return installedApps.filter(app => !app.isSystemApp);
      default:
        return installedApps;
    }
  };

  const renderFilterButton = (filter) => {
    const isSelected = selectedFilter === filter.id;
    return (
      <TouchableOpacity
        key={filter.id}
        style={[
          styles.filterButton,
          isSelected && { backgroundColor: filter.color || COLORS.primary }
        ]}
        onPress={() => setSelectedFilter(filter.id)}
      >
        <Ionicons 
          name={filter.icon} 
          size={SIZES.iconSm} 
          color={isSelected ? COLORS.textPrimary : COLORS.textSecondary}
        />
        <Text style={[
          styles.filterText,
          isSelected && { color: COLORS.textPrimary }
        ]}>
          {filter.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderAppItem = ({ item: app }) => {
    const hasIssues = app.isOutdated || app.isSuspicious || (app.securityIssues && app.securityIssues.length > 0);
    
    return (
      <TouchableOpacity 
        style={[
          styles.appItem,
          hasIssues && { borderLeftColor: COLORS.error, borderLeftWidth: 4 }
        ]}
        onPress={() => showAppDetails(app)}
      >
        <View style={styles.appIcon}>
          {app.icon ? (
            <Image source={{ uri: app.icon }} style={styles.appIconImage} />
          ) : (
            <Ionicons name="apps" size={SIZES.iconLg} color={COLORS.textSecondary} />
          )}
        </View>
        
        <View style={styles.appInfo}>
          <Text style={styles.appName} numberOfLines={1}>
            {app.appName || app.packageName}
          </Text>
          <Text style={styles.appPackage} numberOfLines={1}>
            {app.packageName}
          </Text>
          
          <View style={styles.appMeta}>
            <Text style={styles.appVersion}>
              v{app.versionName || 'Unknown'}
            </Text>
            
            {app.isOutdated && (
              <View style={styles.issueTag}>
                <Ionicons name="time" size={12} color={COLORS.warning} />
                <Text style={[styles.issueText, { color: COLORS.warning }]}>
                  Update Available
                </Text>
              </View>
            )}
            
            {app.isSuspicious && (
              <View style={styles.issueTag}>
                <Ionicons name="warning" size={12} color={COLORS.error} />
                <Text style={[styles.issueText, { color: COLORS.error }]}>
                  Suspicious
                </Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.appActions}>
          <Ionicons name="chevron-forward" size={SIZES.iconMd} color={COLORS.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  };

  const showAppDetails = (app) => {
    const issues = [];
    
    if (app.isOutdated) {
      issues.push(`Current Version: ${app.versionName}`);
      issues.push(`Latest Version: ${app.playStoreVersion}`);
    }
    
    if (app.isSuspicious && app.suspiciousReasons) {
      issues.push(...app.suspiciousReasons);
    }
    
    if (app.securityIssues) {
      issues.push(...app.securityIssues);
    }

    Alert.alert(
      app.appName || app.packageName,
      issues.length > 0 ? issues.join('\n\n') : 'No issues found with this app',
      [
        { text: 'OK', style: 'default' },
        ...(app.hasUpdate ? [{ 
          text: 'Update App', 
          onPress: () => openPlayStore(app.packageName)
        }] : [])
      ]
    );
  };

  const openPlayStore = (packageName) => {
    // This would open the Play Store app page
    Toast.show({
      type: 'info',
      text1: 'Opening Play Store',
      text2: packageName,
      position: 'bottom'
    });
  };

  const renderResultsGrid = () => (
    <View style={styles.resultsContainer}>
      <Text style={styles.resultsTitle}>Scan Results</Text>
      <View style={styles.resultsGrid}>
        <View style={styles.resultItem}>
          <Text style={styles.resultNumber}>{scanResults.totalApps}</Text>
          <Text style={styles.resultLabel}>Total Apps</Text>
          </View>
        <View style={styles.resultItem}>
          <Text style={[styles.resultNumber, { color: COLORS.warning }]}>
            {scanResults.outdatedApps}
          </Text>
          <Text style={styles.resultLabel}>Outdated Apps</Text>
        </View>
        <View style={styles.resultItem}>
          <Text style={[styles.resultNumber, { color: COLORS.error }]}>
            {scanResults.securityIssues}
          </Text>
          <Text style={styles.resultLabel}>Security Issues</Text>
        </View>
        <View style={styles.resultItem}>
          <Text style={[styles.resultNumber, { color: COLORS.error }]}>
            {scanResults.suspiciousApps}
          </Text>
          <Text style={styles.resultLabel}>Suspicious Apps</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={GRADIENTS.primary} style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
        {/* Header */}
        <View style={styles.header}>
            <Text style={styles.title}>App Security Scanner</Text>
            <Text style={styles.subtitle}>Analyze installed apps and compare with Play Store versions</Text>
        </View>

          {/* Scan Button */}
          <TouchableOpacity
            style={[
              styles.scanButton,
              { backgroundColor: isScanning ? COLORS.warning : COLORS.primary }
            ]}
            onPress={startComprehensiveScan}
            disabled={isScanning}
          >
            {isScanning ? (
              <ActivityIndicator size="small" color={COLORS.textPrimary} />
            ) : (
              <Ionicons name="scan" size={SIZES.iconLg} color={COLORS.textPrimary} />
            )}
            <Text style={styles.scanButtonText}>
              {isScanning ? 'Scanning Apps...' : 'Start App Scan'}
            </Text>
          </TouchableOpacity>

          {/* Progress */}
          {isScanning && (
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                Scanning: {currentApp}
              </Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${scanProgress}%`,
                      backgroundColor: COLORS.primary
                    }
                  ]} 
                />
          </View>
              <Text style={styles.progressPercentage}>
                {Math.round(scanProgress)}%
              </Text>
          </View>
          )}

          {/* Results Grid */}
          {scanResults.totalApps > 0 && renderResultsGrid()}

          {/* Filter Buttons */}
          <View style={styles.filtersContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersContent}
            >
              {filterOptions.map(renderFilterButton)}
            </ScrollView>
        </View>

        {/* Apps List */}
        <View style={styles.appsContainer}>
            <Text style={styles.appsTitle}>
              Installed Apps ({getFilteredApps().length})
            </Text>
            
            <FlatList
              data={getFilteredApps()}
              keyExtractor={(item) => item.packageName}
              renderItem={renderAppItem}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={() => (
            <View style={styles.emptyState}>
                  <Ionicons name="apps" size={SIZES.iconXxl} color={COLORS.textTertiary} />
                  <Text style={styles.emptyText}>
                    {isScanning ? 'Loading apps...' : 'No apps found matching the current filter'}
              </Text>
            </View>
              )}
            />
        </View>
      </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: SIZES.lg,
  },
  header: {
    paddingTop: SIZES.lg,
    paddingBottom: SIZES.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: SIZES.fontSizeLarge,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SIZES.sm,
  },
  subtitle: {
    fontSize: SIZES.fontSizeLg,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  scanButton: {
    paddingVertical: SIZES.lg,
    paddingHorizontal: SIZES.lg,
    borderRadius: SIZES.radiusMd,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.lg,
    ...SHADOWS.medium,
  },
  scanButtonText: {
    color: COLORS.textPrimary,
    fontSize: SIZES.fontSizeXl,
    fontWeight: 'bold',
    marginLeft: SIZES.sm,
  },
  progressContainer: {
    backgroundColor: COLORS.surface,
    padding: SIZES.lg,
    borderRadius: SIZES.radiusMd,
    marginBottom: SIZES.lg,
  },
  progressText: {
    color: COLORS.textPrimary,
    fontSize: SIZES.fontSizeMd,
    marginBottom: SIZES.sm,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.borderLight,
    borderRadius: SIZES.radiusXs,
    marginBottom: SIZES.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: SIZES.radiusXs,
  },
  progressPercentage: {
    color: COLORS.primary,
    fontSize: SIZES.fontSizeSm,
    textAlign: 'right',
  },
  resultsContainer: {
    backgroundColor: COLORS.surface,
    padding: SIZES.lg,
    borderRadius: SIZES.radiusMd,
    marginBottom: SIZES.lg,
  },
  resultsTitle: {
    color: COLORS.textPrimary,
    fontSize: SIZES.fontSizeXl,
    fontWeight: 'bold',
    marginBottom: SIZES.lg,
  },
  resultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  resultItem: {
    width: '48%',
    backgroundColor: COLORS.borderLight,
    padding: SIZES.lg,
    borderRadius: SIZES.radiusSm,
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  resultNumber: {
    fontSize: SIZES.fontSizeXxl,
    fontWeight: 'bold',
    color: COLORS.success,
    marginBottom: SIZES.xs,
  },
  resultLabel: {
    color: COLORS.textSecondary,
    fontSize: SIZES.fontSizeSm,
    textAlign: 'center',
  },
  filtersContainer: {
    marginBottom: SIZES.lg,
  },
  filtersContent: {
    paddingVertical: SIZES.sm,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusSm,
    marginRight: SIZES.sm,
  },
  filterText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.fontSizeSm,
    marginLeft: SIZES.xs,
  },
  appsContainer: {
    marginBottom: SIZES.xl,
  },
  appsTitle: {
    color: COLORS.textPrimary,
    fontSize: SIZES.fontSizeXl,
    fontWeight: 'bold',
    marginBottom: SIZES.lg,
  },
  appItem: {
    backgroundColor: COLORS.surface,
    padding: SIZES.lg,
    borderRadius: SIZES.radiusMd,
    flexDirection: 'row',
    alignItems: 'center',
  },
  appIcon: {
    width: SIZES.iconXxl,
    height: SIZES.iconXxl,
    borderRadius: SIZES.radiusSm,
    backgroundColor: COLORS.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.md,
  },
  appIconImage: {
    width: SIZES.iconXxl,
    height: SIZES.iconXxl,
    borderRadius: SIZES.radiusSm,
  },
  appInfo: {
    flex: 1,
  },
  appName: {
    color: COLORS.textPrimary,
    fontSize: SIZES.fontSizeLg,
    fontWeight: 'bold',
    marginBottom: SIZES.xs,
  },
  appPackage: {
    color: COLORS.textSecondary,
    fontSize: SIZES.fontSizeSm,
    marginBottom: SIZES.sm,
  },
  appMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  appVersion: {
    color: COLORS.textSecondary,
    fontSize: SIZES.fontSizeSm,
    marginRight: SIZES.md,
  },
  issueTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.borderLight,
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusXs,
    marginRight: SIZES.sm,
  },
  issueText: {
    fontSize: SIZES.fontSizeXs,
    marginLeft: SIZES.xs,
  },
  appActions: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  separator: {
    height: SIZES.sm,
  },
  emptyState: {
    alignItems: 'center',
    padding: SIZES.xxl,
  },
  emptyText: {
    color: COLORS.textTertiary,
    fontSize: SIZES.fontSizeLg,
    marginTop: SIZES.lg,
    textAlign: 'center',
  },
}); 