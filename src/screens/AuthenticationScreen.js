/**
 * Enhanced Authentication Screen
 * Supports Gmail Login/Signup and Mobile OTP Authentication
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import PocketShieldLogo from '../components/PocketShieldLogo';

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

export default function AuthenticationScreen({ navigation }) {
  const { t } = useTranslation();
  
  // Authentication states
  const [authMethod, setAuthMethod] = useState(null); // 'gmail' or 'mobile'
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Google Authentication Configuration
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: '133932633311-3q2a81jf7qijsqklh7mbgpbhtv7h7rkc.apps.googleusercontent.com',
    iosClientId: '133932633311-3q2a81jf7qijsqklh7mbgpbhtv7h7rkc.apps.googleusercontent.com',
    androidClientId: '133932633311-3q2a81jf7qijsqklh7mbgpbhtv7h7rkc.apps.googleusercontent.com',
    scopes: ['profile', 'email'],
  });

  useEffect(() => {
    // Initialize animation
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();
      setIsInitializing(false);
    }, 500);
    
    // Check if user is already logged in
    checkExistingAuth();
  }, []);

  // Handle Google Auth Response
  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      handleGoogleAuthSuccess(authentication);
    } else if (response?.type === 'error') {
      Alert.alert('Authentication Error', 'Failed to authenticate with Google. Please try again.');
      setIsLoading(false);
    }
  }, [response]);

  /**
   * Check for existing authentication
   */
  const checkExistingAuth = async () => {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      const userInfo = await AsyncStorage.getItem('userInfo');
      
      if (authToken && userInfo) {
        // User is already authenticated
        navigation.replace('Main');
      }
    } catch (error) {
      console.error('Failed to check existing auth:', error);
    }
  };

  /**
   * Handle Google Authentication Success
   */
  const handleGoogleAuthSuccess = async (authentication) => {
    try {
      setIsLoading(true);
      
      // Get user info from Google API
      const userInfoResponse = await fetch(
        'https://www.googleapis.com/userinfo/v2/me',
        {
          headers: { Authorization: `Bearer ${authentication.accessToken}` },
        }
      );
      
      const userInfo = await userInfoResponse.json();
      
      console.log('Google Auth Success:', userInfo);

      // Store authentication data
      await AsyncStorage.setItem('authToken', authentication.accessToken);
      await AsyncStorage.setItem('authRefreshToken', authentication.refreshToken || '');
      await AsyncStorage.setItem('userInfo', JSON.stringify({
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        authMethod: 'gmail',
        loginTime: new Date().toISOString()
      }));

      // Show success message
      Alert.alert(
        '🎉 Welcome!',
        `Hello ${userInfo.name}! You've successfully signed in with Google.`,
        [
          {
            text: 'Continue to PocketShield',
            onPress: () => navigation.replace('Main')
          }
        ]
      );

    } catch (error) {
      console.error('Google auth processing failed:', error);
      Alert.alert(
        'Authentication Error',
        'Failed to complete Google authentication. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle Gmail Login
   */
  const handleGmailLogin = () => {
    if (!request) {
      Alert.alert('Error', 'Google authentication is not properly configured.');
      return;
    }

    setIsLoading(true);
    promptAsync();
  };

  /**
   * Handle Skip Login for Testing
   */
  const handleSkipLogin = async () => {
    try {
      setIsLoading(true);
      
      // Create test user session
      const testUser = {
        id: 'test_user_' + Date.now(),
        name: 'Test User',
        email: 'test@pocketshield.app',
        picture: null,
        authMethod: 'skip_login',
        loginTime: new Date().toISOString(),
        isTestMode: true
      };

      // Store test session data
      await AsyncStorage.setItem('authToken', 'test_token_' + Date.now());
      await AsyncStorage.setItem('userInfo', JSON.stringify(testUser));

      // Show success message
      Alert.alert(
        '🧪 Test Mode Active',
        'You\'ve skipped login for testing. All features are available in test mode.',
        [
          {
            text: 'Continue to App',
            onPress: () => navigation.replace('Main')
          }
        ]
      );

    } catch (error) {
      console.error('Skip login failed:', error);
      Alert.alert(
        'Error',
        'Failed to create test session. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };


  /**
   * Render loading state
   */
  if (isInitializing) {
    return (
      <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <PocketShieldLogo />
          <ActivityIndicator size="large" color="#4CAF50" style={styles.loadingIndicator} />
          <Text style={styles.loadingText}>Initializing PocketShield...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Logo and Header */}
            <View style={styles.headerSection}>
              <PocketShieldLogo />
              <Text style={styles.welcomeTitle}>Welcome to PocketShield</Text>
              <Text style={styles.welcomeSubtitle}>
                Your Personal Mobile Security Guardian
              </Text>
              <Text style={styles.tagline}>
                Protect your digital life with advanced security monitoring
              </Text>
            </View>

            {/* Authentication Options */}
            <View style={styles.authSection}>
              <Text style={styles.authSectionTitle}>Access PocketShield</Text>

              {/* Gmail Login Button */}
              <TouchableOpacity
                style={[styles.authButton, styles.gmailButton]}
                onPress={handleGmailLogin}
                disabled={isLoading}
              >
                <View style={styles.authButtonContent}>
                  <View style={styles.authIconContainer}>
                    <Ionicons name="logo-google" size={24} color="#fff" />
                  </View>
                  <Text style={styles.authButtonText}>
                    {isLoading ? 'Signing in...' : 'Continue with Google'}
                  </Text>
                  {isLoading && (
                    <ActivityIndicator size="small" color="#fff" style={styles.buttonLoader} />
                  )}
                </View>
              </TouchableOpacity>

              {/* Skip Login for Testing */}
              <TouchableOpacity
                style={[styles.authButton, styles.skipButton]}
                onPress={handleSkipLogin}
                disabled={isLoading}
              >
                <View style={styles.authButtonContent}>
                  <View style={styles.authIconContainer}>
                    <Ionicons name="play-skip-forward" size={24} color="#FF9800" />
                  </View>
                  <Text style={[styles.authButtonText, styles.skipButtonText]}>
                    Skip Login (Testing)
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Additional Info */}
              <View style={styles.infoContainer}>
                <Text style={styles.infoText}>
                  🔒 Production: Use Google for secure authentication
                </Text>
                <Text style={styles.infoSubText}>
                  🧪 Testing: Skip login to explore all features
                </Text>
              </View>
            </View>

            {/* Features Preview */}
            <View style={styles.featuresSection}>
              <Text style={styles.featuresSectionTitle}>🛡️ Security Features</Text>
              <View style={styles.featuresGrid}>
                <View style={styles.featureItem}>
                  <Ionicons name="scan" size={20} color="#4CAF50" />
                  <Text style={styles.featureText}>Real-time Scanning</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
                  <Text style={styles.featureText}>Threat Detection</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="search" size={20} color="#4CAF50" />
                  <Text style={styles.featureText}>Breach Monitoring</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="lock-closed" size={20} color="#4CAF50" />
                  <Text style={styles.featureText}>Privacy Protection</Text>
                </View>
              </View>
            </View>

            {/* Terms and Privacy */}
            <View style={styles.legalSection}>
              <Text style={styles.legalText}>
                By signing in, you agree to our{' '}
                <Text style={styles.linkText}>Terms of Service</Text>
                {' '}and{' '}
                <Text style={styles.linkText}>Privacy Policy</Text>
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: height,
    paddingVertical: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIndicator: {
    marginTop: 20,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  welcomeSubtitle: {
    fontSize: 18,
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 10,
  },
  tagline: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 20,
  },
  authSection: {
    marginBottom: 30,
  },
  authSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 25,
  },
  authButton: {
    borderRadius: 15,
    padding: 18,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  gmailButton: {
    backgroundColor: '#DB4437',
  },
  skipButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  authButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authIconContainer: {
    marginRight: 12,
  },
  authButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  skipButtonText: {
    color: '#FF9800',
  },
  buttonLoader: {
    marginLeft: 10,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 15,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#444',
  },
  dividerText: {
    color: '#888',
    fontSize: 12,
    paddingHorizontal: 15,
    fontWeight: '500',
  },
  infoContainer: {
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 15,
  },
  infoText: {
    fontSize: 14,
    color: '#4CAF50',
    textAlign: 'center',
    fontWeight: '500',
  },
  infoSubText: {
    fontSize: 12,
    color: '#ccc',
    textAlign: 'center',
    marginTop: 5,
  },
  featuresSection: {
    marginBottom: 30,
  },
  featuresSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  featureText: {
    color: '#ccc',
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
  },
  legalSection: {
    alignItems: 'center',
  },
  legalText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    lineHeight: 18,
  },
  linkText: {
    color: '#4CAF50',
    textDecorationLine: 'underline',
  },
});
