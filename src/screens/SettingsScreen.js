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
import { useSecurity } from '../state/SecurityProvider';
import { LinearGradient } from 'expo-linear-gradient';

export default function SettingsScreen({ navigation }) {
  const { settings, updateSettings } = useSecurity();
  const [localSettings, setLocalSettings] = useState(settings);

  const handleSettingChange = (key, value) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    updateSettings(newSettings);
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
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
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        {/* Monitoring Settings */}
        {renderSection('Monitoring', (
          <>
            {renderSettingItem(
              'shield-checkmark',
              'Auto Security Scan',
              'Automatically scan for vulnerabilities',
              'toggle',
              'autoScan'
            )}
            {renderSettingItem(
              'eye',
              'Background Monitoring',
              'Monitor device activity in background',
              'toggle',
              'backgroundMonitoring'
            )}
            {renderSettingItem(
              'notifications',
              'Security Notifications',
              'Receive alerts for security threats',
              'toggle',
              'notifications'
            )}
            {renderSettingItem(
              'analytics',
              'AI Analysis',
              'Enable AI-powered security insights',
              'toggle',
              'aiAnalysis'
            )}
          </>
        ))}

        {/* Privacy Settings */}
        {renderSection('Privacy', (
          <>
            {renderSettingItem(
              'lock-closed',
              'Data Retention',
              `${localSettings.dataRetention} days`,
              'arrow',
              null,
              () => Alert.alert('Data Retention', 'Configure how long to keep security data')
            )}
            {renderSettingItem(
              'eye-off',
              'Privacy Mode',
              'Hide sensitive information',
              'toggle',
              'privacyMode'
            )}
            {renderSettingItem(
              'cloud-upload',
              'Cloud Backup',
              'Backup security data to cloud',
              'toggle',
              'cloudBackup'
            )}
          </>
        ))}

        {/* Security Configuration */}
        {renderSection('Security Configuration', (
          <>
            {renderSettingItem(
              'finger-print',
              'Biometric Authentication',
              'Use fingerprint or face ID',
              'toggle',
              'biometricAuth'
            )}
            {renderSettingItem(
              'key',
              'Encryption',
              'Encrypt stored security data',
              'toggle',
              'encryption'
            )}
            {renderSettingItem(
              'shield',
              'VPN Integration',
              'Connect to VPN for enhanced security',
              'toggle',
              'vpnIntegration'
            )}
          </>
        ))}

        {/* Data Management */}
        {renderSection('Data Management', (
          <>
            {renderSettingItem(
              'trash',
              'Clear Security Data',
              'Delete all stored security information',
              'arrow',
              null,
              () => Alert.alert('Clear Data', 'This will delete all security scan history and settings')
            )}
            {renderSettingItem(
              'download',
              'Export Security Report',
              'Download comprehensive security report',
              'arrow',
              null,
              () => navigation.navigate('SecurityReport')
            )}
            {renderSettingItem(
              'refresh',
              'Reset to Defaults',
              'Restore default security settings',
              'arrow',
              null,
              () => Alert.alert('Reset Settings', 'This will restore all settings to their default values')
            )}
          </>
        ))}

        {/* About */}
        {renderSection('About', (
          <>
            {renderSettingItem(
              'information-circle',
              'App Version',
              '1.0.0',
              'info'
            )}
            {renderSettingItem(
              'document-text',
              'Privacy Policy',
              'Read our privacy policy',
              'arrow',
              null,
              () => Alert.alert('Privacy Policy', 'Privacy policy content would be displayed here')
            )}
            {renderSettingItem(
              'help-circle',
              'Help & Support',
              'Get help and contact support',
              'arrow',
              null,
              () => Alert.alert('Help & Support', 'Support information would be displayed here')
            )}
            {renderSettingItem(
              'star',
              'Rate App',
              'Rate us on the app store',
              'arrow',
              null,
              () => Alert.alert('Rate App', 'This would open the app store rating page')
            )}
          </>
        ))}

        {/* Account */}
        {renderSection('Account', (
          <>
            {renderSettingItem(
              'person',
              'Profile Settings',
              'Manage your account profile',
              'arrow',
              null,
              () => Alert.alert('Profile Settings', 'Profile management would be available here')
            )}
            {renderSettingItem(
              'card',
              'Subscription',
              'Manage your subscription',
              'arrow',
              null,
              () => Alert.alert('Subscription', 'Subscription management would be available here')
            )}
            {renderSettingItem(
              'log-out',
              'Sign Out',
              'Sign out of your account',
              'arrow',
              null,
              handleLogout
            )}
          </>
        ))}

        {/* Demo Info */}
        <View style={styles.demoInfo}>
          <Text style={styles.demoInfoText}>
            This is a demo version of the Mobile Security app. 
            All security features are simulated for demonstration purposes.
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
}); 