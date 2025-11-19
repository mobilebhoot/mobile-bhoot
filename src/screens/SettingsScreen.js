import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSecurity } from '../state/SecurityProvider';
import { LinearGradient } from 'expo-linear-gradient';
import LanguageSelector from '../components/LanguageSelector';

export default function SettingsScreen({ navigation }) {
  const { t } = useTranslation();
  const { settings, updateSettings } = useSecurity();
  const [localSettings, setLocalSettings] = useState(settings);

  const handleSettingChange = (key, value) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    updateSettings(newSettings);
  };

  const handleLogout = () => {
    Alert.alert(
      t('settings.signOutConfirm') || 'Sign Out',
      t('settings.signOutConfirmMessage') || 'Are you sure you want to sign out?',
      [
        {
          text: t('common.cancel') || 'Cancel',
          style: 'cancel',
        },
        {
          text: t('settings.signOut') || 'Sign Out',
          style: 'destructive',
          onPress: () => {
            // Navigate back to auth screen
            navigation.reset({
              index: 0,
              routes: [{ name: 'Auth' }],
            });
          },
        },
      ]
    );
  };

  const renderSettingItem = (icon, title, subtitle, type = 'toggle', value = null, onPress = null) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={type === 'toggle'}
    >
      <View style={styles.settingIcon}>
        <Ionicons name={icon} size={24} color="#4CAF50" />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {type === 'toggle' && (
        <Switch
          value={localSettings[value]}
          onValueChange={(newValue) => handleSettingChange(value, newValue)}
          trackColor={{ false: '#333', true: '#4CAF50' }}
          thumbColor={localSettings[value] ? '#fff' : '#757575'}
        />
      )}
      {type === 'arrow' && (
        <Ionicons name="chevron-forward" size={20} color="#888" />
      )}
    </TouchableOpacity>
  );

  const renderSection = (title, children) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="settings" size={24} color="#4CAF50" />
          <Text style={styles.headerTitle}>{t('settings.title')}</Text>
        </View>

        {/* Language & Region - Prominently Displayed at Top */}
        {renderSection(t('settings.languageAndRegion') || '🌐 Language & Region', (
          <>
            <LanguageSelector />
          </>
        ))}

        {/* Monitoring Settings */}
        {renderSection(t('settings.monitoring') || 'Monitoring', (
          <>
            {renderSettingItem(
              'shield-checkmark',
              t('settings.autoScan') || 'Auto Security Scan',
              t('settings.autoScanDesc') || 'Automatically scan for vulnerabilities',
              'toggle',
              'autoScan'
            )}
            {renderSettingItem(
              'eye',
              t('settings.backgroundMonitoring') || 'Background Monitoring',
              t('settings.backgroundMonitoringDesc') || 'Monitor device activity in background',
              'toggle',
              'backgroundMonitoring'
            )}
            {renderSettingItem(
              'notifications',
              t('settings.notifications') || 'Security Notifications',
              t('settings.notificationsDesc') || 'Receive alerts for security threats',
              'toggle',
              'notifications'
            )}
            {renderSettingItem(
              'analytics',
              t('settings.aiAnalysis') || 'AI Analysis',
              t('settings.aiAnalysisDesc') || 'Enable AI-powered security insights',
              'toggle',
              'aiAnalysis'
            )}
          </>
        ))}

        {/* Privacy Settings */}
        {renderSection(t('settings.privacy') || 'Privacy', (
          <>
            {renderSettingItem(
              'lock-closed',
              t('settings.dataRetention') || 'Data Retention',
              `${localSettings.dataRetention} ${t('settings.days') || 'days'}`,
              'arrow',
              null,
              () => Alert.alert(t('settings.dataRetention') || 'Data Retention', t('settings.dataRetentionDesc') || 'Configure how long to keep security data')
            )}
            {renderSettingItem(
              'eye-off',
              t('settings.privacyMode') || 'Privacy Mode',
              t('settings.privacyModeDesc') || 'Hide sensitive information',
              'toggle',
              'privacyMode'
            )}
            {renderSettingItem(
              'cloud-upload',
              t('settings.cloudBackup') || 'Cloud Backup',
              t('settings.cloudBackupDesc') || 'Backup security data to cloud',
              'toggle',
              'cloudBackup'
            )}
          </>
        ))}

        {/* Security Configuration */}
        {renderSection(t('settings.security') || 'Security Configuration', (
          <>
            {renderSettingItem(
              'finger-print',
              t('settings.biometricAuth') || 'Biometric Authentication',
              t('settings.biometricAuthDesc') || 'Use fingerprint or face ID',
              'toggle',
              'biometricAuth'
            )}
            {renderSettingItem(
              'key',
              t('settings.encryption') || 'Encryption',
              t('settings.encryptionDesc') || 'Encrypt stored security data',
              'toggle',
              'encryption'
            )}
            {renderSettingItem(
              'shield',
              t('settings.vpnIntegration') || 'VPN Integration',
              t('settings.vpnIntegrationDesc') || 'Connect to VPN for enhanced security',
              'toggle',
              'vpnIntegration'
            )}
          </>
        ))}

        {/* Data Management */}
        {renderSection(t('settings.dataManagement') || 'Data Management', (
          <>
            {renderSettingItem(
              'trash',
              t('settings.clearSecurityData') || 'Clear Security Data',
              t('settings.clearSecurityDataDesc') || 'Delete all stored security information',
              'arrow',
              null,
              () => Alert.alert(t('settings.clearSecurityData') || 'Clear Data', t('settings.clearSecurityDataDesc') || 'This will delete all security scan history and settings')
            )}
            {renderSettingItem(
              'download',
              t('settings.securityReport') || 'Export Security Report',
              t('settings.securityReportDesc') || 'Download comprehensive security report',
              'arrow',
              null,
              () => navigation.navigate('SecurityReport')
            )}
            {renderSettingItem(
              'shield-checkmark',
              t('settings.securityCompliance') || 'Security Compliance',
              t('settings.securityComplianceDesc') || 'View GDPR, CCPA compliance and security status',
              'arrow',
              null,
              () => navigation.navigate('SecurityCompliance')
            )}
            {renderSettingItem(
              'refresh',
              t('settings.resetDefaults') || 'Reset to Defaults',
              t('settings.resetDefaultsDesc') || 'Restore default security settings',
              'arrow',
              null,
              () => Alert.alert(t('settings.resetDefaults') || 'Reset Settings', t('settings.resetDefaultsDesc') || 'This will restore all settings to their default values')
            )}
          </>
        ))}

        {/* About */}
        {renderSection(t('settings.about') || 'About', (
          <>
            {renderSettingItem(
              'information-circle',
              t('settings.version') || 'App Version',
              '1.2.0',
              'info'
            )}
            {renderSettingItem(
              'document-text',
              t('settings.privacyPolicy') || 'Privacy Policy',
              t('settings.privacyPolicyDesc') || 'Read our privacy policy',
              'arrow',
              null,
              () => navigation.navigate('PrivacyPolicy')
            )}
            {renderSettingItem(
              'help-circle',
              t('settings.support') || 'Help & Support',
              t('settings.supportDesc') || 'Get help and contact support',
              'arrow',
              null,
              () => Alert.alert(t('settings.support') || 'Help & Support', t('settings.supportDesc') || 'Support information would be displayed here')
            )}
            {renderSettingItem(
              'star',
              t('settings.rateApp') || 'Rate App',
              t('settings.rateAppDesc') || 'Rate us on the app store',
              'arrow',
              null,
              () => Alert.alert(t('settings.rateApp') || 'Rate App', t('settings.rateAppDesc') || 'This would open the app store rating page')
            )}
          </>
        ))}

        {/* Account */}
        {renderSection(t('settings.account') || 'Account', (
          <>
            {renderSettingItem(
              'person',
              t('settings.profileSettings') || 'Profile Settings',
              t('settings.profileSettingsDesc') || 'Manage your account profile',
              'arrow',
              null,
              () => Alert.alert(t('settings.profileSettings') || 'Profile Settings', t('settings.profileSettingsDesc') || 'Profile management would be available here')
            )}
            {renderSettingItem(
              'card',
              t('settings.subscription') || 'Subscription',
              t('settings.subscriptionDesc') || 'Manage your subscription',
              'arrow',
              null,
              () => Alert.alert(t('settings.subscription') || 'Subscription', t('settings.subscriptionDesc') || 'Subscription management would be available here')
            )}
            {renderSettingItem(
              'log-out',
              t('settings.signOut') || 'Sign Out',
              t('settings.signOutDesc') || 'Sign out of your account',
              'arrow',
              null,
              handleLogout
            )}
          </>
        ))}

        {/* Demo Info */}
        <View style={styles.demoInfo}>
          <Text style={styles.demoInfoText}>
            {t('settings.demoInfo') || 'This is a demo version of the Mobile Security app. All security features are simulated for demonstration purposes.'}
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 10,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginHorizontal: 20,
    marginBottom: 10,
  },
  sectionContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginHorizontal: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingIcon: {
    width: 40,
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
    marginLeft: 15,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#ccc',
    marginTop: 2,
  },
  demoInfo: {
    marginHorizontal: 20,
    marginBottom: 30,
    padding: 15,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  demoInfoText: {
    fontSize: 12,
    color: '#4CAF50',
    textAlign: 'center',
    lineHeight: 18,
  },
  languageSelectorContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 8,
    marginVertical: 5,
  },
  debugInfo: {
    paddingHorizontal: 15,
    paddingVertical: 5,
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderRadius: 4,
    marginVertical: 5,
  },
  debugText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontStyle: 'italic',
  },
}); 