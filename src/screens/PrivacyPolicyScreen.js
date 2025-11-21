import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

export default function PrivacyPolicyScreen({ navigation }) {
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('November 18, 2024');

  useEffect(() => {
    checkPrivacyStatus();
  }, []);

  const checkPrivacyStatus = async () => {
    try {
      const accepted = await AsyncStorage.getItem('privacy_policy_accepted');
      setPrivacyAccepted(accepted === 'true');
    } catch (error) {
      console.error('Failed to check privacy status:', error);
    }
  };

  const handleAcceptPrivacy = async () => {
    try {
      await AsyncStorage.setItem('privacy_policy_accepted', 'true');
      await AsyncStorage.setItem('privacy_policy_accepted_date', new Date().toISOString());
      setPrivacyAccepted(true);
      
      Toast.show({
        type: 'success',
        text1: 'Privacy Policy Accepted',
        text2: 'Thank you for accepting our privacy policy',
      });

      // Navigate back after acceptance
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to save privacy policy acceptance',
      });
    }
  };

  const handleDeclinePrivacy = () => {
    Alert.alert(
      'Privacy Policy Required',
      'To use PocketShield, you must accept our Privacy Policy. Would you like to review it again?',
      [
        {
          text: 'Review Again',
          onPress: () => {},
        },
        {
          text: 'Exit App',
          style: 'destructive',
          onPress: () => {
            // In production, you might want to show a message and exit
            Alert.alert('App Exit', 'Please accept the privacy policy to continue using the app.');
          },
        },
      ]
    );
  };

  const openExternalLink = (url) => {
    Linking.openURL(url).catch((err) => {
      Alert.alert('Error', 'Could not open link');
    });
  };

  const renderSection = (title, content, icon = null) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        {icon && <Ionicons name={icon} size={20} color="#4CAF50" style={styles.sectionIcon} />}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <Text style={styles.sectionContent}>{content}</Text>
    </View>
  );

  const renderListItem = (text) => (
    <View style={styles.listItem}>
      <Ionicons name="checkmark-circle" size={16} color="#4CAF50" style={styles.listIcon} />
      <Text style={styles.listText}>{text}</Text>
    </View>
  );

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
          <View style={styles.headerContent}>
            <Ionicons name="shield-checkmark" size={32} color="#4CAF50" />
            <Text style={styles.headerTitle}>Privacy Policy</Text>
            <Text style={styles.headerSubtitle}>Last Updated: {lastUpdated}</Text>
          </View>
        </View>

        {/* Introduction */}
        <View style={styles.introCard}>
          <Text style={styles.introText}>
            At PocketShield, we are committed to protecting your privacy and ensuring the security
            of your personal information. This Privacy Policy explains how we collect, use, disclose,
            and safeguard your information when you use our mobile application.
          </Text>
        </View>

        {/* Information We Collect */}
        {renderSection(
          '1. Information We Collect',
          'We collect information to provide and improve our security services. Here\'s what we collect:',
          'information-circle'
        )}

        <View style={styles.subSection}>
          <Text style={styles.subSectionTitle}>1.1 Information You Provide</Text>
          {renderListItem('Account information (email, name) when you create an account')}
          {renderListItem('Profile information you choose to provide')}
          {renderListItem('Support communications when you contact us')}
          {renderListItem('App preferences and settings')}
        </View>

        <View style={styles.subSection}>
          <Text style={styles.subSectionTitle}>1.2 Information We Collect Automatically</Text>
          {renderListItem('Device information (model, OS version, unique identifiers)')}
          {renderListItem('App usage data (features used, time spent, performance metrics)')}
          {renderListItem('Security scan results (stored locally on your device)')}
          {renderListItem('Network connection metadata')}
          {renderListItem('Crash reports and error logs')}
        </View>

        <View style={styles.subSection}>
          <Text style={styles.subSectionTitle}>1.3 Information We Do NOT Collect</Text>
          {renderListItem('Personal files, photos, or documents')}
          {renderListItem('Web browsing history')}
          {renderListItem('Precise location data (unless explicitly enabled)')}
          {renderListItem('Contact information or phone book')}
          {renderListItem('Payment or financial information')}
          {renderListItem('Passwords or authentication credentials (stored securely)')}
        </View>

        {/* How We Use Your Information */}
        {renderSection(
          '2. How We Use Your Information',
          'We use the collected information for the following purposes:',
          'settings'
        )}

        <View style={styles.subSection}>
          <Text style={styles.subSectionTitle}>2.1 Core App Functionality</Text>
          {renderListItem('Provide mobile security monitoring and threat detection')}
          {renderListItem('Perform device vulnerability assessments')}
          {renderListItem('Generate security reports and recommendations')}
          {renderListItem('Authenticate users and manage accounts')}
          {renderListItem('Enable security features and scanning capabilities')}
        </View>

        <View style={styles.subSection}>
          <Text style={styles.subSectionTitle}>2.2 App Improvement</Text>
          {renderListItem('Analyze usage patterns to improve features')}
          {renderListItem('Debug issues and fix crashes')}
          {renderListItem('Develop new security features')}
          {renderListItem('Optimize app performance')}
        </View>

        <View style={styles.subSection}>
          <Text style={styles.subSectionTitle}>2.3 Communication</Text>
          {renderListItem('Send important security alerts and notifications')}
          {renderListItem('Provide customer support')}
          {renderListItem('Send app updates and security information (with consent)')}
        </View>

        {/* Data Sharing */}
        {renderSection(
          '3. How We Share Your Information',
          'We respect your privacy and limit data sharing:',
          'share-social'
        )}

        <View style={styles.subSection}>
          <Text style={styles.subSectionTitle}>3.1 We Do Not Sell Your Data</Text>
          <Text style={styles.sectionContent}>
            We do not sell, rent, or trade your personal information to third parties for
            marketing purposes. Your data is yours.
          </Text>
        </View>

        <View style={styles.subSection}>
          <Text style={styles.subSectionTitle}>3.2 Limited Sharing Scenarios</Text>
          <Text style={styles.sectionContent}>
            We may share information only in these limited circumstances:
          </Text>
          {renderListItem('Service providers: Trusted third-party services that help us operate the app')}
          {renderListItem('Legal requirements: When required by law or legal process')}
          {renderListItem('Safety and security: To protect rights, property, or safety')}
          {renderListItem('Business transfers: In connection with merger or acquisition (with notification)')}
        </View>

        {/* Data Security */}
        {renderSection(
          '4. Data Security',
          'We implement industry-standard security measures:',
          'lock-closed'
        )}

        <View style={styles.subSection}>
          {renderListItem('Encryption: Data encrypted in transit and at rest')}
          {renderListItem('Secure Storage: Data stored in device Keychain/Keystore')}
          {renderListItem('Access Controls: Limited access on need-to-know basis')}
          {renderListItem('Regular Security Audits: Ongoing security reviews')}
          {renderListItem('Secure Infrastructure: Use of secure cloud services')}
        </View>

        <View style={styles.subSection}>
          <Text style={styles.subSectionTitle}>4.1 Local Data Storage</Text>
          {renderListItem('Security scan results stored locally on your device')}
          {renderListItem('Sensitive data encrypted using device-level encryption')}
          {renderListItem('You can delete local data by uninstalling the app')}
        </View>

        {/* Data Retention */}
        {renderSection(
          '5. Data Retention',
          'We retain data only as long as necessary:',
          'time'
        )}

        <View style={styles.subSection}>
          {renderListItem('Account Data: While account is active and 30 days after deletion')}
          {renderListItem('Security Scan Data: Stored locally; aggregated analytics for 12 months')}
          {renderListItem('Usage Data: Anonymous statistics retained for app improvement')}
          {renderListItem('Support Communications: Retained for 2 years for service quality')}
        </View>

        {/* Your Privacy Rights */}
        {renderSection(
          '6. Your Privacy Rights',
          'You have the following rights regarding your data:',
          'person'
        )}

        <View style={styles.subSection}>
          <Text style={styles.subSectionTitle}>6.1 GDPR Rights (EU Users)</Text>
          {renderListItem('Right to Access: Request a copy of your data')}
          {renderListItem('Right to Rectification: Correct inaccurate data')}
          {renderListItem('Right to Erasure: Delete your data')}
          {renderListItem('Right to Restrict Processing: Limit how we use your data')}
          {renderListItem('Right to Data Portability: Export your data')}
          {renderListItem('Right to Object: Object to certain data processing')}
        </View>

        <View style={styles.subSection}>
          <Text style={styles.subSectionTitle}>6.2 CCPA Rights (California Users)</Text>
          {renderListItem('Right to Know: Know what data we collect')}
          {renderListItem('Right to Delete: Request deletion of your data')}
          {renderListItem('Right to Opt-Out: Opt-out of data sales (we don\'t sell data)')}
          {renderListItem('Right to Non-Discrimination: No discrimination for exercising rights')}
        </View>

        <View style={styles.subSection}>
          <Text style={styles.subSectionTitle}>6.3 Exercising Your Rights</Text>
          <Text style={styles.sectionContent}>
            To exercise your privacy rights, you can:
          </Text>
          {renderListItem('Use the "Security Compliance" feature in Settings')}
          {renderListItem('Export your data directly from the app')}
          {renderListItem('Delete all data from the app settings')}
          {renderListItem('Contact us at privacy@pocketshield.io')}
        </View>

        {/* Children's Privacy */}
        {renderSection(
          '7. Children\'s Privacy',
          'PocketShield is not intended for children under 13 years of age. We do not knowingly'
          + ' collect personal information from children under 13. If you believe we have collected'
          + ' information from a child under 13, please contact us immediately.',
          'people'
        )}

        {/* Third-Party Services */}
        {renderSection(
          '8. Third-Party Services',
          'Our app may contain links to third-party services. We are not responsible for the privacy'
          + ' practices of these services. We encourage you to review their privacy policies.',
          'link'
        )}

        {/* Changes to Privacy Policy */}
        {renderSection(
          '9. Changes to This Privacy Policy',
          'We may update this Privacy Policy from time to time. We will notify you of any changes'
          + ' by posting the new Privacy Policy on this page and updating the "Last Updated" date.'
          + ' You are advised to review this Privacy Policy periodically.',
          'document-text'
        )}

        {/* Contact Information */}
        <View style={styles.contactCard}>
          <Ionicons name="mail" size={24} color="#4CAF50" />
          <View style={styles.contactContent}>
            <Text style={styles.contactTitle}>Contact Us</Text>
            <Text style={styles.contactText}>
              If you have questions about this Privacy Policy, please contact us:
            </Text>
            <TouchableOpacity
              onPress={() => openExternalLink('mailto:privacy@pocketshield.io')}
              style={styles.contactLink}
            >
              <Text style={styles.contactLinkText}>privacy@pocketshield.io</Text>
              <Ionicons name="open-outline" size={16} color="#4CAF50" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => openExternalLink('https://pocketshield.io/privacy')}
              style={styles.contactLink}
            >
              <Text style={styles.contactLinkText}>pocketshield.io/privacy</Text>
              <Ionicons name="open-outline" size={16} color="#4CAF50" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Acceptance Section */}
        {!privacyAccepted && (
          <View style={styles.acceptanceCard}>
            <Text style={styles.acceptanceTitle}>Accept Privacy Policy</Text>
            <Text style={styles.acceptanceText}>
              By using PocketShield, you agree to this Privacy Policy. Please review the policy
              above and accept to continue.
            </Text>
            <View style={styles.acceptanceButtons}>
              <TouchableOpacity
                style={[styles.button, styles.declineButton]}
                onPress={handleDeclinePrivacy}
              >
                <Text style={styles.declineButtonText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.acceptButton]}
                onPress={handleAcceptPrivacy}
              >
                <Text style={styles.acceptButtonText}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {privacyAccepted && (
          <View style={styles.acceptedCard}>
            <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
            <Text style={styles.acceptedText}>Privacy Policy Accepted</Text>
            <Text style={styles.acceptedSubtext}>
              You can review or update your acceptance in Settings at any time.
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2024 PocketShield. All rights reserved.
          </Text>
          <Text style={styles.footerText}>
            This Privacy Policy is effective as of {lastUpdated}
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
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    marginBottom: 20,
    padding: 5,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 10,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 5,
  },
  introCard: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  introText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
  },
  section: {
    margin: 20,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  sectionContent: {
    color: '#ccc',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10,
  },
  subSection: {
    marginLeft: 10,
    marginTop: 15,
    marginBottom: 10,
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 10,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  listIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  listText: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  contactCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  contactContent: {
    flex: 1,
    marginLeft: 15,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  contactText: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  contactLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactLinkText: {
    color: '#4CAF50',
    fontSize: 14,
    marginRight: 5,
    textDecorationLine: 'underline',
  },
  acceptanceCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  acceptanceTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  acceptanceText: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  acceptanceButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  declineButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#888',
  },
  declineButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  acceptedCard: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
    alignItems: 'center',
  },
  acceptedText: {
    color: '#4CAF50',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
  },
  acceptedSubtext: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  footerText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 5,
  },
});

