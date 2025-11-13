/**
 * Breach Detection Screen
 * Have I Been Pwned integration for checking email and password security
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useSecurity } from '../state/SecurityProvider';

const { width } = Dimensions.get('window');

export default function BreachDetectionScreen({ navigation }) {
  const { t } = useTranslation();
  const { settings } = useSecurity();
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [checkType, setCheckType] = useState('email'); // 'email', 'password', 'comprehensive'
  
  // Loading and results states
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);
  
  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Base URL for API calls
  const baseURL = __DEV__ 
    ? 'http://localhost:3000/api' 
    : 'https://api.pocketshield.app/api';

  /**
   * Make API request to breach detection service
   */
  const makeRequest = async (endpoint, body) => {
    try {
      const response = await fetch(`${baseURL}/breach/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(body),
        timeout: 30000,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;

    } catch (error) {
      console.error('Breach detection API error:', error);
      throw error;
    }
  };

  /**
   * Check email for breaches
   */
  const checkEmailBreaches = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      console.log(`🔍 Checking breaches for email: ${email}`);
      
      const response = await makeRequest('check-email', { email });
      
      if (response.success) {
        setResults(response.data);
        setLastChecked(new Date());
        animateResults();
        
        // Show immediate feedback
        if (response.data.breached) {
          Alert.alert(
            '⚠️ Security Alert',
            `Your email was found in ${response.data.breachCount} data breach${response.data.breachCount > 1 ? 'es' : ''}. Check the details below.`,
            [{ text: 'OK', style: 'default' }]
          );
        } else {
          Alert.alert(
            '✅ Good News',
            'Your email address was not found in any known data breaches!',
            [{ text: 'Great!', style: 'default' }]
          );
        }
      }

    } catch (error) {
      console.error('Email breach check failed:', error);
      Alert.alert(
        'Check Failed',
        error.message.includes('Rate limit') 
          ? 'Too many requests. Please wait a moment and try again.'
          : 'Failed to check email breaches. Please check your internet connection.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Check password security
   */
  const checkPasswordSecurity = async () => {
    if (!password.trim()) {
      Alert.alert('Error', 'Please enter a password to check');
      return;
    }

    if (password.length < 4) {
      Alert.alert('Error', 'Password must be at least 4 characters long');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔐 Checking password security (k-anonymity)');
      
      const response = await makeRequest('check-password', { password });
      
      if (response.success) {
        setResults(response.data);
        setLastChecked(new Date());
        animateResults();
        
        // Show immediate feedback
        if (response.data.compromised) {
          Alert.alert(
            '🚨 Password Compromised',
            `This password has been seen ${response.data.occurrences.toLocaleString()} times in data breaches. Change it immediately!`,
            [{ text: 'I understand', style: 'destructive' }]
          );
        } else {
          Alert.alert(
            '✅ Password Safe',
            'This password has not been found in known data breaches.',
            [{ text: 'Good!', style: 'default' }]
          );
        }
      }

    } catch (error) {
      console.error('Password security check failed:', error);
      Alert.alert(
        'Check Failed',
        'Failed to check password security. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Comprehensive security check
   */
  const comprehensiveCheck = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter an email address for comprehensive check');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🛡️ Running comprehensive security check');
      
      const requestBody = { email };
      if (password.trim() && password.length >= 4) {
        requestBody.password = password;
      }

      const response = await makeRequest('comprehensive-check', requestBody);
      
      if (response.success) {
        setResults(response.data);
        setLastChecked(new Date());
        animateResults();
        
        // Show security score feedback
        const score = response.data.securityScore;
        let title, message, style;
        
        if (score >= 80) {
          title = '🛡️ Excellent Security';
          message = `Security Score: ${score}/100. Your account appears to be well-protected!`;
          style = 'default';
        } else if (score >= 60) {
          title = '⚠️ Moderate Risk';
          message = `Security Score: ${score}/100. Consider reviewing the recommendations below.`;
          style = 'default';
        } else {
          title = '🚨 High Risk Detected';
          message = `Security Score: ${score}/100. Immediate action required to secure your account!`;
          style = 'destructive';
        }
        
        Alert.alert(title, message, [{ text: 'View Details', style }]);
      }

    } catch (error) {
      console.error('Comprehensive security check failed:', error);
      Alert.alert(
        'Check Failed',
        'Failed to perform comprehensive security check. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Animate results appearance
   */
  const animateResults = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  };

  /**
   * Validate email format
   */
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /**
   * Get risk level color
   */
  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'low': case 'safe': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'high': return '#FF5722';
      case 'critical': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  /**
   * Get risk level icon
   */
  const getRiskIcon = (riskLevel) => {
    switch (riskLevel) {
      case 'low': case 'safe': return 'shield-checkmark';
      case 'medium': return 'warning';
      case 'high': return 'alert';
      case 'critical': return 'skull';
      default: return 'help';
    }
  };

  /**
   * Render check type selector
   */
  const renderCheckTypeSelector = () => (
    <View style={styles.checkTypeSelector}>
      <TouchableOpacity
        style={[styles.checkTypeButton, checkType === 'email' && styles.activeCheckType]}
        onPress={() => setCheckType('email')}
      >
        <Ionicons 
          name="mail" 
          size={20} 
          color={checkType === 'email' ? '#4CAF50' : '#888'} 
        />
        <Text style={[styles.checkTypeText, checkType === 'email' && styles.activeCheckTypeText]}>
          Email Only
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.checkTypeButton, checkType === 'password' && styles.activeCheckType]}
        onPress={() => setCheckType('password')}
      >
        <Ionicons 
          name="key" 
          size={20} 
          color={checkType === 'password' ? '#4CAF50' : '#888'} 
        />
        <Text style={[styles.checkTypeText, checkType === 'password' && styles.activeCheckTypeText]}>
          Password Only
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.checkTypeButton, checkType === 'comprehensive' && styles.activeCheckType]}
        onPress={() => setCheckType('comprehensive')}
      >
        <Ionicons 
          name="shield" 
          size={20} 
          color={checkType === 'comprehensive' ? '#4CAF50' : '#888'} 
        />
        <Text style={[styles.checkTypeText, checkType === 'comprehensive' && styles.activeCheckTypeText]}>
          Full Check
        </Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * Render input form
   */
  const renderInputForm = () => (
    <View style={styles.inputSection}>
      {(checkType === 'email' || checkType === 'comprehensive') && (
        <View style={styles.inputContainer}>
          <Ionicons name="mail" size={20} color="#4CAF50" style={styles.inputIcon} />
          <TextInput
            style={styles.textInput}
            placeholder="Enter email address to check"
            placeholderTextColor="#888"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      )}

      {(checkType === 'password' || checkType === 'comprehensive') && (
        <View style={styles.inputContainer}>
          <Ionicons name="key" size={20} color="#4CAF50" style={styles.inputIcon} />
          <TextInput
            style={styles.textInput}
            placeholder="Enter password to check (optional for full check)"
            placeholderTextColor="#888"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeButton}
          >
            <Ionicons 
              name={showPassword ? 'eye-off' : 'eye'} 
              size={20} 
              color="#888" 
            />
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={[styles.checkButton, isLoading && styles.disabledButton]}
        onPress={() => {
          switch (checkType) {
            case 'email': checkEmailBreaches(); break;
            case 'password': checkPasswordSecurity(); break;
            case 'comprehensive': comprehensiveCheck(); break;
          }
        }}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Ionicons name="search" size={20} color="#fff" />
            <Text style={styles.checkButtonText}>
              {checkType === 'email' && 'Check Email Breaches'}
              {checkType === 'password' && 'Check Password Security'}
              {checkType === 'comprehensive' && 'Run Full Security Check'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  /**
   * Render breach results
   */
  const renderBreachResults = () => {
    if (!results) return null;

    return (
      <Animated.View 
        style={[
          styles.resultsContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Overall Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Ionicons 
              name={getRiskIcon(results.riskLevel || results.overallRisk || 'low')} 
              size={32} 
              color={getRiskColor(results.riskLevel || results.overallRisk || 'low')} 
            />
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>
                {results.securityScore 
                  ? `Security Score: ${results.securityScore}/100`
                  : results.breached 
                    ? 'Breaches Found'
                    : results.compromised
                      ? 'Password Compromised'
                      : 'Secure'
                }
              </Text>
              <Text style={styles.statusSubtitle}>
                {results.message || 'Security check completed'}
              </Text>
            </View>
          </View>
        </View>

        {/* Email Breach Details */}
        {results.breaches && (
          <View style={styles.detailCard}>
            <Text style={styles.detailTitle}>📧 Email Breach Analysis</Text>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total Breaches:</Text>
              <Text style={styles.statValue}>{results.breaches.breachCount}</Text>
            </View>
            {results.breaches.breached && (
              <>
                <Text style={styles.breachListTitle}>Recent Breaches:</Text>
                {results.breaches.breaches.slice(0, 3).map((breach, index) => (
                  <View key={index} style={styles.breachItem}>
                    <Text style={styles.breachName}>{breach.title}</Text>
                    <Text style={styles.breachDate}>
                      {new Date(breach.breachDate).getFullYear()}
                    </Text>
                    <Text style={styles.breachCount}>
                      {breach.pwnCount?.toLocaleString()} accounts
                    </Text>
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        {/* Password Security Details */}
        {results.password && (
          <View style={styles.detailCard}>
            <Text style={styles.detailTitle}>🔐 Password Security Analysis</Text>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Status:</Text>
              <Text style={[styles.statValue, { color: getRiskColor(results.password.riskLevel) }]}>
                {results.password.compromised ? 'COMPROMISED' : 'SECURE'}
              </Text>
            </View>
            {results.password.compromised && (
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Seen in breaches:</Text>
                <Text style={styles.statValue}>
                  {results.password.occurrences.toLocaleString()} times
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Recommendations */}
        {results.recommendations && results.recommendations.length > 0 && (
          <View style={styles.detailCard}>
            <Text style={styles.detailTitle}>💡 Security Recommendations</Text>
            {results.recommendations.map((recommendation, index) => (
              <View key={index} style={styles.recommendationItem}>
                <Text style={styles.recommendationText}>{recommendation}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Last Checked */}
        {lastChecked && (
          <Text style={styles.lastChecked}>
            Last checked: {lastChecked.toLocaleString()}
          </Text>
        )}
      </Animated.View>
    );
  };

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#4CAF50" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Ionicons name="search" size={28} color="#4CAF50" />
              <Text style={styles.headerTitle}>Breach Detection</Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.descriptionCard}>
            <Text style={styles.descriptionTitle}>🔍 Have I Been Pwned Integration</Text>
            <Text style={styles.descriptionText}>
              Check if your email address or password has been compromised in known data breaches. 
              This service uses the{' '}
              <Text style={styles.linkText}>haveibeenpwned.com</Text>{' '}
              database to identify security risks.
            </Text>
          </View>

          {/* Check Type Selector */}
          {renderCheckTypeSelector()}

          {/* Input Form */}
          {renderInputForm()}

          {/* Results */}
          {renderBreachResults()}

          {/* Info Section */}
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>ℹ️ Privacy & Security</Text>
            <Text style={styles.infoText}>
              • Email checks are performed securely via encrypted HTTPS{'\n'}
              • Passwords are checked using k-anonymity (your password is never sent){'\n'}
              • No personal data is stored on our servers{'\n'}
              • Results are cached temporarily for performance
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
    marginRight: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 10,
  },
  descriptionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
  },
  linkText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  checkTypeSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    padding: 5,
    marginBottom: 20,
  },
  checkTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  activeCheckType: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  checkTypeText: {
    fontSize: 12,
    color: '#888',
    marginLeft: 5,
    fontWeight: '500',
  },
  activeCheckTypeText: {
    color: '#4CAF50',
  },
  inputSection: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 5,
    marginBottom: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    paddingVertical: 15,
  },
  eyeButton: {
    padding: 5,
  },
  checkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  checkButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  resultsContainer: {
    marginBottom: 30,
  },
  statusCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusInfo: {
    flex: 1,
    marginLeft: 15,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 5,
  },
  detailCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#ccc',
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  breachListTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 15,
    marginBottom: 10,
  },
  breachItem: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
  },
  breachName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  breachDate: {
    fontSize: 12,
    color: '#ccc',
    marginTop: 2,
  },
  breachCount: {
    fontSize: 12,
    color: '#ccc',
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 14,
    color: '#ccc',
    flex: 1,
  },
  lastChecked: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginTop: 10,
  },
  infoSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 13,
    color: '#ccc',
    lineHeight: 18,
  },
});
