/**
 * Beautiful Enhanced Authentication Screen
 * Supports Gmail Login + Skip Login with stunning animations and glassmorphism
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
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import PocketShieldLogo from '../components/PocketShieldLogo';

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

export default function BeautifulAuthenticationScreen({ navigation }) {
  const { t } = useTranslation();
  
  // Authentication states
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Animation references
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatingAnim = useRef(new Animated.Value(0)).current;

  // Google Authentication Configuration
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: '1050104985553-24kvh48331qqrvotuasmj3qr9fhf6mmf.apps.googleusercontent.com',
    iosClientId: '1050104985553-24kvh48331qqrvotuasmj3qr9fhf6mmf.apps.googleusercontent.com',
    androidClientId: '1050104985553-24kvh48331qqrvotuasmj3qr9fhf6mmf.apps.googleusercontent.com',
    scopes: ['profile', 'email'],
  });

  useEffect(() => {
    // Beautiful entrance animations
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
      setIsInitializing(false);
    }, 300);
    
    // Continuous floating animation
    const floating = Animated.loop(
      Animated.sequence([
        Animated.timing(floatingAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(floatingAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    );
    floating.start();

    // Continuous pulse animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    // Check if user is already logged in
    checkExistingAuth();

    return () => {
      floating.stop();
      pulse.stop();
    };
  }, []);

  // Handle Google Auth Response
  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      handleGoogleAuthSuccess(authentication);
    } else if (response?.type === 'error') {
      Alert.alert(t('auth.authenticationError'), t('auth.googleAuthFailed'));
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
      
      // For debugging: uncomment the next line to always show login screen
      // await clearStoredAuth(); return;
      
      if (authToken && userInfo) {
        console.log('🔐 Found existing authentication, navigating to Main app...');
        navigation.replace('Main');
      } else {
        console.log('📱 No existing authentication found, showing login screen...');
      }
    } catch (error) {
      console.error('Failed to check existing auth:', error);
    }
  };

  /**
   * Clear stored authentication data
   */
  const clearStoredAuth = async () => {
    try {
      console.log('🧹 Clearing stored authentication data...');
      await AsyncStorage.multiRemove([
        'authToken',
        'userInfo', 
        'refreshToken',
        'googleUser',
        'isAuthenticated',
        'lastLogin',
        'sessionData'
      ]);
      console.log('✅ Authentication cleared successfully!');
    } catch (error) {
      console.error('❌ Failed to clear authentication:', error);
    }
  };

  /**
   * Handle Google Authentication Success
   */
  const handleGoogleAuthSuccess = async (authentication) => {
    try {
      setIsLoading(true);
      
      const userInfoResponse = await fetch(
        'https://www.googleapis.com/userinfo/v2/me',
        {
          headers: { Authorization: `Bearer ${authentication.accessToken}` },
        }
      );
      
      const userInfo = await userInfoResponse.json();

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

      Alert.alert(
        '🎉 Welcome!',
        `Hello ${userInfo.name}! Welcome to PocketShield.`,
        [
          {
            text: 'Enter PocketShield',
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
      
      const testUser = {
        id: 'test_user_' + Date.now(),
        name: 'Test User',
        email: 'test@pocketshield.app',
        picture: null,
        authMethod: 'skip_login',
        loginTime: new Date().toISOString(),
        isTestMode: true
      };

      await AsyncStorage.setItem('authToken', 'test_token_' + Date.now());
      await AsyncStorage.setItem('userInfo', JSON.stringify(testUser));

      Alert.alert(
        '🧪 Test Mode',
        'Welcome to PocketShield test mode! All features are available.',
        [
          {
            text: 'Continue to App',
            onPress: () => navigation.replace('Main')
          }
        ]
      );

    } catch (error) {
      console.error('Skip login failed:', error);
      Alert.alert('Error', 'Failed to create test session. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Beautiful Auth Button Component
  const BeautifulAuthButton = ({ 
    onPress, 
    disabled, 
    colors, 
    icon, 
    title, 
    subtitle, 
    loading = false,
    delay = 0,
    variant = 'primary'
  }) => {
    const buttonAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(buttonAnim, {
        toValue: 1,
        duration: 600,
        delay,
        useNativeDriver: true,
      }).start();
    }, []);

    return (
      <Animated.View
        style={[
          styles.authButtonContainer,
          {
            opacity: buttonAnim,
            transform: [
              {
                translateY: buttonAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
              {
                scale: buttonAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          onPress={onPress}
          disabled={disabled || loading}
          activeOpacity={0.8}
          style={[
            styles.authButton,
            variant === 'outline' && styles.outlineButton,
          ]}
        >
          <BlurView intensity={variant === 'outline' ? 10 : 20} style={styles.authButtonBlur}>
            <LinearGradient
              colors={variant === 'outline' ? 
                ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)'] : 
                colors
              }
              style={[
                styles.authButtonGradient,
                variant === 'outline' && styles.outlineGradient,
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.authButtonContent}>
                <View style={styles.authButtonLeft}>
                  <View style={[
                    styles.authIconContainer,
                    variant === 'outline' && styles.outlineIconContainer,
                  ]}>
                    <Ionicons 
                      name={icon} 
                      size={24} 
                      color={variant === 'outline' ? colors[0] : '#fff'} 
                    />
                  </View>
                  <View style={styles.authTextContainer}>
                    <Text style={[
                      styles.authButtonTitle,
                      variant === 'outline' && { color: '#fff' }
                    ]}>
                      {title}
                    </Text>
                    {subtitle && (
                      <Text style={[
                        styles.authButtonSubtitle,
                        variant === 'outline' && { color: 'rgba(255, 255, 255, 0.7)' }
                      ]}>
                        {subtitle}
                      </Text>
                    )}
                  </View>
                </View>
                
                {loading && (
                  <ActivityIndicator 
                    size="small" 
                    color={variant === 'outline' ? '#fff' : '#fff'} 
                    style={styles.authButtonLoader} 
                  />
                )}
              </View>
            </LinearGradient>
          </BlurView>
          
          {variant === 'outline' && (
            <View style={[styles.outlineBorder, { borderColor: colors[0] }]} />
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Beautiful Feature Item Component
  const BeautifulFeatureItem = ({ icon, title, colors, delay = 0 }) => {
    const featureAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(featureAnim, {
        toValue: 1,
        duration: 500,
        delay,
        useNativeDriver: true,
      }).start();
    }, []);

    return (
      <Animated.View
        style={[
          styles.featureItem,
          {
            opacity: featureAnim,
            transform: [
              {
                scale: featureAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              },
            ],
          },
        ]}
      >
        <BlurView intensity={15} style={styles.featureBlur}>
          <LinearGradient
            colors={colors}
            style={styles.featureGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name={icon} size={20} color="#fff" />
          </LinearGradient>
        </BlurView>
        <Text style={styles.featureText}>{title}</Text>
      </Animated.View>
    );
  };

  // Beautiful loading state
  if (isInitializing) {
    return (
      <LinearGradient
        colors={['#667eea', '#764ba2', '#f093fb']}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <PocketShieldLogo size="large" animated={true} />
          </Animated.View>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2', '#f093fb', '#f5576c']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim },
                  { scale: scaleAnim },
                ],
              },
            ]}
          >
            {/* Beautiful Header */}
            <View style={styles.headerSection}>
              <Animated.View
                style={[
                  styles.logoContainer,
                  {
                    transform: [
                      {
                        translateY: floatingAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -10],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <PocketShieldLogo size="large" animated={true} />
              </Animated.View>
              
              <View style={styles.titleContainer}>
                <Text style={styles.welcomeTitle}>{t('auth.welcome')}</Text>
                <Text style={styles.welcomeSubtitle}>{t('auth.subtitle')}</Text>
                <Text style={styles.tagline}>
                  {t('auth.tagline')}
                </Text>
              </View>
            </View>

            {/* Beautiful Authentication Section */}
            <View style={styles.authSection}>
              <BlurView intensity={20} style={styles.authSectionBlur}>
                <View style={styles.authSectionContent}>
                  <Text style={styles.authSectionTitle}>{t('auth.chooseMethod')}</Text>

                  {/* Gmail Login Button */}
                  <BeautifulAuthButton
                    onPress={handleGmailLogin}
                    disabled={isLoading}
                    colors={['#DB4437', '#C23321']}
                    icon="logo-google"
                    title={t('auth.continueWithGoogle')}
                    subtitle={t('auth.secureOAuth')}
                    loading={isLoading}
                    delay={200}
                  />

                  {/* Skip Login Button */}
                  <BeautifulAuthButton
                    onPress={handleSkipLogin}
                    disabled={isLoading}
                    colors={['#FF9800', '#F57C00']}
                    icon="rocket"
                    title={t('auth.skipLogin')}
                    subtitle={t('auth.exploreFeatures')}
                    variant="outline"
                    delay={400}
                  />

                  {/* Security Info */}
                  <View style={styles.securityInfo}>
                    <BlurView intensity={10} style={styles.securityInfoBlur}>
                      <View style={styles.securityInfoContent}>
                        <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
                        <View style={styles.securityInfoText}>
                          <Text style={styles.securityInfoTitle}>{t('auth.privacyMatters')}</Text>
                          <Text style={styles.securityInfoSubtitle}>
                            {t('auth.privacyFeatures')}
                          </Text>
                        </View>
                      </View>
                    </BlurView>
                  </View>
                </View>
              </BlurView>
            </View>

            {/* Beautiful Features Preview */}
            <View style={styles.featuresSection}>
              <BlurView intensity={15} style={styles.featuresSectionBlur}>
                <View style={styles.featuresSectionContent}>
                  <Text style={styles.featuresSectionTitle}>{t('auth.securityFeatures')}</Text>
                  <View style={styles.featuresGrid}>
                    <BeautifulFeatureItem
                      icon="scan"
                      title={t('auth.realtimeScanning')}
                      colors={['#4CAF50', '#45a049']}
                      delay={600}
                    />
                    <BeautifulFeatureItem
                      icon="shield-checkmark"
                      title={t('auth.threatDetection')}
                      colors={['#2196F3', '#1976d2']}
                      delay={700}
                    />
                    <BeautifulFeatureItem
                      icon="search"
                      title={t('auth.breachMonitoring')}
                      colors={['#FF6B6B', '#ee5a24']}
                      delay={800}
                    />
                    <BeautifulFeatureItem
                      icon="lock-closed"
                      title={t('auth.privacyProtection')}
                      colors={['#9C27B0', '#7B1FA2']}
                      delay={900}
                    />
                  </View>
                </View>
              </BlurView>
            </View>

            {/* Beautiful floating elements */}
            <View style={styles.floatingElements}>
              {[...Array(8)].map((_, i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.floatingElement,
                    {
                      left: `${(i * 15) % 100}%`,
                      top: `${(i * 25) % 90}%`,
                      opacity: floatingAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.1, 0.3],
                      }),
                      transform: [
                        {
                          translateY: floatingAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, -20],
                          }),
                        },
                        {
                          scale: floatingAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.5, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              ))}
            </View>
          </Animated.View>

          {/* Hidden Debug Button to Clear Auth */}
          <TouchableOpacity 
            style={styles.debugButton}
            onPress={async () => {
              await clearStoredAuth();
              Alert.alert('🧹 Auth Cleared', 'Authentication data cleared! Restart the app to see login screen.', [
                { text: 'OK', onPress: () => console.log('Auth cleared by debug button') }
              ]);
            }}
          >
            <Text style={styles.debugText}>🔧</Text>
          </TouchableOpacity>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  
  // Header Section
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    marginBottom: 30,
  },
  titleContainer: {
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  welcomeSubtitle: {
    fontSize: 18,
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: '600',
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Auth Section
  authSection: {
    marginBottom: 30,
    borderRadius: 25,
    overflow: 'hidden',
  },
  authSectionBlur: {
    padding: 25,
  },
  authSectionContent: {
    alignItems: 'center',
  },
  authSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 25,
  },

  // Auth Buttons
  authButtonContainer: {
    width: '100%',
    marginBottom: 15,
  },
  authButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  outlineButton: {
    position: 'relative',
  },
  authButtonBlur: {
    overflow: 'hidden',
  },
  authButtonGradient: {
    padding: 20,
  },
  outlineGradient: {
    backgroundColor: 'transparent',
  },
  authButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  authButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  outlineIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  authTextContainer: {
    flex: 1,
  },
  authButtonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  authButtonSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  authButtonLoader: {
    marginLeft: 15,
  },
  outlineBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderRadius: 20,
    opacity: 0.6,
  },

  // Security Info
  securityInfo: {
    width: '100%',
    marginTop: 20,
    borderRadius: 15,
    overflow: 'hidden',
  },
  securityInfoBlur: {
    padding: 15,
  },
  securityInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  securityInfoText: {
    marginLeft: 12,
    flex: 1,
  },
  securityInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  securityInfoSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },

  // Features Section
  featuresSection: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  featuresSectionBlur: {
    padding: 20,
  },
  featuresSectionContent: {
    alignItems: 'center',
  },
  featuresSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  featureItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 15,
  },
  featureBlur: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    marginBottom: 8,
  },
  featureGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
  },

  // Floating Elements
  floatingElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  floatingElement: {
    position: 'absolute',
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: '#fff',
  },
  
  // Debug Button (hidden)
  debugButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  debugText: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.6,
  },
});
