import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import PocketShieldLogo from '../components/PocketShieldLogo';
import authService from '../services/authService';
import authAPIService from '../services/authAPIService';

export default function AuthScreen({ navigation }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null); // Track which social button is loading

  // Add error boundary-like behavior
  useEffect(() => {
    if (!navigation) {
      console.error('Navigation prop is missing in AuthScreen');
      return;
    }
  }, [navigation]);

  // Regular email/password authentication
  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (!validatePassword(password)) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (!isLogin && !fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        // Login logic
        const loginResult = await authAPIService.login(email, password);
        if (loginResult.success) {
          if (loginResult.requiresEmailVerification) {
            Alert.alert(
              'Email Verification Required',
              'Please check your email and verify your account before signing in.',
              [{ text: 'OK' }]
            );
          } else {
            Alert.alert(
              'Welcome Back!', 
              `Successfully signed in as ${loginResult.user.name}`,
              [{ text: 'Continue', onPress: () => navigateToMain() }]
            );
          }
        } else {
          Alert.alert('Login Failed', loginResult.error);
        }
      } else {
        // Signup logic
        const signupResult = await authAPIService.signup(email, password, fullName);
        if (signupResult.success) {
          Alert.alert(
            'Account Created!', 
            signupResult.message || 'Please check your email to verify your account.',
            [{ text: 'Continue', onPress: () => navigateToMain() }]
          );
        } else {
          Alert.alert('Signup Failed', signupResult.error);
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      Alert.alert('Error', 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Google Sign-In Handler
  const handleGoogleSignIn = async () => {
    setSocialLoading('google');
    try {
      const result = await authService.signInWithGoogle();
      
      if (result.success) {
        // Send to backend for verification/account creation
        const backendResult = await authAPIService.socialAuth('google', result.tokens.accessToken, result.user);
        
        if (backendResult.success) {
          Alert.alert(
            'Welcome!',
            `Successfully signed in with Google as ${result.user.name}`,
            [{ text: 'Continue', onPress: () => navigateToMain() }]
          );
        } else {
          Alert.alert('Authentication Failed', backendResult.error);
        }
      } else {
        Alert.alert('Google Sign-In Failed', result.error);
      }
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      Alert.alert('Error', 'Google sign-in failed. Please try again.');
    } finally {
      setSocialLoading(null);
    }
  };

  // Apple Sign-In Handler
  const handleAppleSignIn = async () => {
    setSocialLoading('apple');
    try {
      const result = await authService.signInWithApple();
      
      if (result.success) {
        // Send to backend for verification/account creation  
        const backendResult = await authAPIService.socialAuth('apple', result.tokens.identityToken, result.user);
        
        if (backendResult.success) {
          Alert.alert(
            'Welcome!',
            `Successfully signed in with Apple${result.user.name ? ` as ${result.user.name}` : ''}`,
            [{ text: 'Continue', onPress: () => navigateToMain() }]
          );
        } else {
          Alert.alert('Authentication Failed', backendResult.error);
        }
      } else {
        Alert.alert('Apple Sign-In Failed', result.error);
      }
    } catch (error) {
      console.error('Apple Sign-In Error:', error);
      Alert.alert('Error', 'Apple sign-in failed. Please try again.');
    } finally {
      setSocialLoading(null);
    }
  };

  // Password Reset Handler
  const handleForgotPassword = () => {
    Alert.prompt(
      'Reset Password',
      'Enter your email address to receive password reset instructions:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Send Reset Email', 
          onPress: async (emailInput) => {
            if (!emailInput || !validateEmail(emailInput)) {
              Alert.alert('Error', 'Please enter a valid email address');
              return;
            }
            
            try {
              const result = await authAPIService.requestPasswordReset(emailInput);
              if (result.success) {
                Alert.alert(
                  'Reset Email Sent',
                  result.message
                );
              } else {
                Alert.alert('Error', result.error);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to send reset email. Please try again.');
            }
          }
        }
      ],
      'plain-text',
      email || ''
    );
  };

  // Navigation helper
  const navigateToMain = () => {
    try {
      if (navigation && navigation.replace) {
        navigation.replace('Main');
      } else {
        console.error('Navigation is not available');
      }
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  // Simulate backend authentication (replace with real API calls)
  const simulateLogin = async (email, password) => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Demo: Accept any email/password for now
    if (email.includes('@') && password.length >= 8) {
      return { success: true, user: { email, name: 'Demo User' } };
    } else {
      return { success: false, error: 'Invalid email or password' };
    }
  };

  const simulateSignup = async (email, password, fullName) => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Demo: Accept valid inputs
    if (email.includes('@') && password.length >= 8 && fullName.trim()) {
      return { success: true, user: { email, name: fullName } };
    } else {
      return { success: false, error: 'Please check your information and try again' };
    }
  };

  const simulatePasswordReset = async (email) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (email.includes('@')) {
      return { success: true };
    } else {
      return { success: false, error: 'Email address not found' };
    }
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => {
    return password.length >= 8;
  };

  const getPasswordStrength = (password) => {
    if (password.length === 0) return { strength: 'none', color: '#666' };
    if (password.length < 6) return { strength: 'weak', color: '#F44336' };
    if (password.length < 8) return { strength: 'medium', color: '#FF9800' };
    return { strength: 'strong', color: '#4CAF50' };
  };

  const passwordStrength = getPasswordStrength(password);

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.gradient}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <PocketShieldLogo size={80} showText={true} textSize="large" />
            <Text style={styles.appSubtitle}>Advanced mobile security with AI-powered protection</Text>
          </View>

          {/* Auth Form */}
          <View style={styles.formContainer}>
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, isLogin && styles.activeTab]}
                onPress={() => setIsLogin(true)}
              >
                <Text style={[styles.tabText, isLogin && styles.activeTabText]}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, !isLogin && styles.activeTab]}
                onPress={() => setIsLogin(false)}
              >
                <Text style={[styles.tabText, !isLogin && styles.activeTabText]}>Sign Up</Text>
              </TouchableOpacity>
            </View>

            {!isLogin && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person" size={20} color="#888" />
                  <TextInput
                    style={styles.textInput}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Enter your full name"
                    placeholderTextColor="#888"
                    autoCapitalize="words"
                  />
                </View>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail" size={20} color="#888" />
                <TextInput
                  style={styles.textInput}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  placeholderTextColor="#888"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              {email.length > 0 && !validateEmail(email) && (
                <Text style={styles.errorText}>Please enter a valid email address</Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed" size={20} color="#888" />
                <TextInput
                  style={styles.textInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor="#888"
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  <Ionicons 
                    name={showPassword ? "eye-off" : "eye"} 
                    size={20} 
                    color="#888" 
                  />
                </TouchableOpacity>
              </View>
              {password.length > 0 && (
                <View style={styles.passwordStrength}>
                  <Text style={styles.strengthLabel}>Password strength:</Text>
                  <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                    {passwordStrength.strength.charAt(0).toUpperCase() + passwordStrength.strength.slice(1)}
                  </Text>
                </View>
              )}
            </View>

            {!isLogin && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed" size={20} color="#888" />
                  <TextInput
                    style={styles.textInput}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm your password"
                    placeholderTextColor="#888"
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeButton}
                  >
                    <Ionicons 
                      name={showConfirmPassword ? "eye-off" : "eye"} 
                      size={20} 
                      color="#888" 
                    />
                  </TouchableOpacity>
                </View>
                {confirmPassword.length > 0 && password !== confirmPassword && (
                  <Text style={styles.errorText}>Passwords do not match</Text>
                )}
              </View>
            )}

            <TouchableOpacity
              style={[styles.authButton, isLoading && styles.authButtonDisabled]}
              onPress={handleAuth}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons 
                    name={isLogin ? "log-in" : "person-add"} 
                    size={20} 
                    color="#fff" 
                  />
                  <Text style={styles.authButtonText}>
                    {isLogin ? 'Sign In' : 'Create Account'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={handleForgotPassword}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {/* Social Login */}
          <View style={styles.socialContainer}>
            <Text style={styles.socialTitle}>Or continue with</Text>
            <View style={styles.socialButtons}>
              <TouchableOpacity 
                style={[styles.socialButton, socialLoading === 'google' && styles.socialButtonLoading]}
                onPress={handleGoogleSignIn}
                disabled={socialLoading !== null}
              >
                {socialLoading === 'google' ? (
                  <ActivityIndicator size="small" color="#DB4437" />
                ) : (
                  <Ionicons name="logo-google" size={24} color="#DB4437" />
                )}
                <Text style={styles.socialButtonText}>Google</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.socialButton, socialLoading === 'apple' && styles.socialButtonLoading]}
                onPress={handleAppleSignIn}
                disabled={socialLoading !== null}
              >
                {socialLoading === 'apple' ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="logo-apple" size={24} color="#fff" />
                )}
                <Text style={styles.socialButtonText}>Apple</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Demo Mode */}
          <View style={styles.demoContainer}>
            <Text style={styles.demoText}>Demo Mode</Text>
            <TouchableOpacity
              style={styles.demoButton}
              onPress={() => {
                try {
                  if (navigation && navigation.replace) {
                    navigation.replace('Main');
                  } else {
                    console.error('Navigation is not available for demo mode');
                  }
                } catch (error) {
                  console.error('Demo navigation error:', error);
                }
              }}
            >
              <Text style={styles.demoButtonText}>Skip Authentication</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 10,
  },
  appSubtitle: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 10,
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 30,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#4CAF50',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ccc',
  },
  activeTabText: {
    color: '#fff',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    marginLeft: 10,
  },
  eyeButton: {
    padding: 5,
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 5,
  },
  passwordStrength: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  strengthLabel: {
    fontSize: 12,
    color: '#ccc',
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
  },
  authButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 15,
    marginTop: 10,
  },
  authButtonDisabled: {
    backgroundColor: '#666',
  },
  authButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 15,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#4CAF50',
  },
  socialContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  socialTitle: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 15,
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 10,
  },
  socialButtonLoading: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  demoContainer: {
    alignItems: 'center',
  },
  demoText: {
    fontSize: 12,
    color: '#888',
    marginBottom: 10,
  },
  demoButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  demoButtonText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
}); 