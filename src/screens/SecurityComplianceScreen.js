import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import securityComplianceService from '../services/securityComplianceService';
import Toast from 'react-native-toast-message';

export default function SecurityComplianceScreen({ navigation }) {
  const [complianceStatus, setComplianceStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [securityCheck, setSecurityCheck] = useState(null);

  useEffect(() => {
    loadComplianceStatus();
    performSecurityCheck();
  }, []);

  const loadComplianceStatus = async () => {
    try {
      setLoading(true);
      const report = await securityComplianceService.getComplianceReport();
      setComplianceStatus(report);
    } catch (error) {
      console.error('Failed to load compliance status:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load compliance status',
      });
    } finally {
      setLoading(false);
    }
  };

  const performSecurityCheck = async () => {
    try {
      const check = await securityComplianceService.performSecurityCheck();
      setSecurityCheck(check);
    } catch (error) {
      console.error('Security check failed:', error);
    }
  };

  const handleExportData = async () => {
    try {
      Alert.alert(
        'Export Your Data',
        'This will export all your data in a portable format (GDPR Right to Access).',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Export',
            onPress: async () => {
              const data = await securityComplianceService.exportUserData('current_user');
              Alert.alert(
                'Data Export',
                `Your data has been prepared. Data includes:\n- Settings\n- Scan History\n- Preferences`,
                [{ text: 'OK' }]
              );
            },
          },
        ]
      );
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Export Failed',
        text2: 'Could not export your data',
      });
    }
  };

  const handleDeleteData = async () => {
    Alert.alert(
      'Delete All Data',
      'This will permanently delete all your data from this device (GDPR Right to Erasure). This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await securityComplianceService.deleteUserData('current_user');
              Toast.show({
                type: 'success',
                text1: 'Data Deleted',
                text2: 'All your data has been deleted',
              });
              // Navigate back to auth
              navigation.reset({
                index: 0,
                routes: [{ name: 'Auth' }],
              });
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: 'Deletion Failed',
                text2: 'Could not delete your data',
              });
            }
          },
        },
      ]
    );
  };

  const renderComplianceCard = (title, compliant, features, icon) => (
    <View style={styles.complianceCard}>
      <View style={styles.cardHeader}>
        <Ionicons
          name={icon}
          size={24}
          color={compliant ? '#4CAF50' : '#FF9800'}
        />
        <Text style={styles.cardTitle}>{title}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: compliant ? '#4CAF50' : '#FF9800' },
          ]}
        >
          <Text style={styles.statusText}>
            {compliant ? 'Compliant' : 'Action Required'}
          </Text>
        </View>
      </View>
      <View style={styles.featuresList}>
        {features.map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderSecurityFeature = (title, enabled, description) => (
    <View style={styles.securityFeature}>
      <View style={styles.featureHeader}>
        <Text style={styles.featureTitle}>{title}</Text>
        <View
          style={[
            styles.enabledBadge,
            { backgroundColor: enabled ? '#4CAF50' : '#888' },
          ]}
        >
          <Text style={styles.enabledText}>
            {enabled ? 'Enabled' : 'Disabled'}
          </Text>
        </View>
      </View>
      <Text style={styles.featureDescription}>{description}</Text>
    </View>
  );

  if (loading) {
    return (
      <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading compliance status...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Security Compliance</Text>
        </View>

        {/* Security Status */}
        {securityCheck && (
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Ionicons
                name={securityCheck.secure ? 'shield-checkmark' : 'shield-outline'}
                size={32}
                color={securityCheck.secure ? '#4CAF50' : '#FF9800'}
              />
              <Text style={styles.statusTitle}>
                {securityCheck.secure ? 'System Secure' : 'Security Issues Detected'}
              </Text>
            </View>
            {securityCheck.vulnerabilities.length > 0 && (
              <View style={styles.vulnerabilitiesList}>
                <Text style={styles.vulnerabilitiesTitle}>Issues Found:</Text>
                {securityCheck.vulnerabilities.map((vuln, index) => (
                  <Text key={index} style={styles.vulnerabilityItem}>
                    • {vuln.replace(/([A-Z])/g, ' $1').trim()}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Compliance Standards */}
        {complianceStatus && (
          <>
            {renderComplianceCard(
              'GDPR Compliance',
              complianceStatus.compliance.gdpr.compliant,
              complianceStatus.compliance.gdpr.features,
              'document-text'
            )}

            {renderComplianceCard(
              'CCPA Compliance',
              complianceStatus.compliance.ccpa.compliant,
              complianceStatus.compliance.ccpa.features,
              'shield-checkmark'
            )}

            {/* Security Features */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Security Features</Text>
              {renderSecurityFeature(
                'Data Encryption',
                complianceStatus.compliance.security.dataEncryption,
                'All sensitive data is encrypted using industry-standard algorithms'
              )}
              {renderSecurityFeature(
                'Secure Storage',
                complianceStatus.compliance.security.secureStorage,
                'Data stored in device Keychain/Keystore for maximum security'
              )}
              {renderSecurityFeature(
                'Certificate Pinning',
                complianceStatus.compliance.security.certificatePinning,
                'Network communications are secured with certificate pinning'
              )}
              {renderSecurityFeature(
                'Biometric Authentication',
                complianceStatus.compliance.security.biometricAuth,
                'Use fingerprint or face recognition for secure access'
              )}
              {renderSecurityFeature(
                'Audit Logging',
                complianceStatus.compliance.security.auditLogging,
                'All security events are logged for compliance auditing'
              )}
            </View>

            {/* Recommendations */}
            {complianceStatus.recommendations.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recommendations</Text>
                <View style={styles.recommendationsList}>
                  {complianceStatus.recommendations.map((rec, index) => (
                    <View key={index} style={styles.recommendationItem}>
                      <Ionicons name="information-circle" size={20} color="#2196F3" />
                      <Text style={styles.recommendationText}>{rec}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* User Rights */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Privacy Rights</Text>
              
              <TouchableOpacity
                style={styles.rightButton}
                onPress={handleExportData}
              >
                <Ionicons name="download-outline" size={24} color="#4CAF50" />
                <View style={styles.rightButtonContent}>
                  <Text style={styles.rightButtonTitle}>Export Your Data</Text>
                  <Text style={styles.rightButtonSubtitle}>
                    GDPR Right to Access - Download all your data
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#888" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.rightButton, styles.deleteButton]}
                onPress={handleDeleteData}
              >
                <Ionicons name="trash-outline" size={24} color="#F44336" />
                <View style={styles.rightButtonContent}>
                  <Text style={[styles.rightButtonTitle, { color: '#F44336' }]}>
                    Delete All Data
                  </Text>
                  <Text style={styles.rightButtonSubtitle}>
                    GDPR Right to Erasure - Permanently delete all data
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#888" />
              </TouchableOpacity>
            </View>

            {/* Compliance Info */}
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={24} color="#2196F3" />
              <Text style={styles.infoText}>
                PocketShield is designed with privacy and security as core principles.
                All data is stored locally on your device and encrypted. We comply with
                GDPR, CCPA, and other privacy regulations.
              </Text>
            </View>
          </>
        )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    marginRight: 15,
    padding: 5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 12,
  },
  vulnerabilitiesList: {
    marginTop: 10,
  },
  vulnerabilitiesTitle: {
    color: '#FF9800',
    fontWeight: '600',
    marginBottom: 8,
  },
  vulnerabilityItem: {
    color: '#fff',
    marginLeft: 10,
    marginBottom: 4,
  },
  complianceCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    margin: 20,
    marginBottom: 10,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 12,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  featuresList: {
    marginTop: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    color: '#ccc',
    marginLeft: 8,
    fontSize: 14,
  },
  section: {
    margin: 20,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  securityFeature: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  featureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  enabledBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  enabledText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  featureDescription: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  },
  recommendationsList: {
    marginTop: 10,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.3)',
  },
  recommendationText: {
    color: '#fff',
    marginLeft: 10,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  rightButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  deleteButton: {
    borderColor: 'rgba(244, 67, 54, 0.3)',
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  rightButtonContent: {
    flex: 1,
    marginLeft: 15,
  },
  rightButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  rightButtonSubtitle: {
    fontSize: 12,
    color: '#ccc',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    margin: 20,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.3)',
  },
  infoText: {
    color: '#fff',
    marginLeft: 12,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});

