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
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { signInWithCredential, GoogleAuthProvider, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import PocketShieldLogo from '../components/PocketShieldLogo';

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

export default function AuthenticationScreen({ navigation }) {
  const { t } = useTranslation();
  
  // Authentication states
  const [authMethod, setAuthMethod] = useState(null); // 'gmail', 'email', or 'mobile'
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Google Authentication Configuration
  // Using Expo auth proxy for consistent redirect URIs
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: '739358674832-ita1kkj3pqavb0svlb835ub2g5dioa1t.apps.googleusercontent.com',
    iosClientId: '739358674832-ita1kkj3pqavb0svlb835ub2g5dioa1t.apps.googleusercontent.com',
    androidClientId: '739358674832-ita1kkj3pqavb0svlb835ub2g5dioa1t.apps.googleusercontent.com',
    scopes: ['profile', 'email'],
    // Force use of Expo auth proxy instead of local exp:// URLs
    redirectUri: 'https://auth.expo.io/@suresh_seema/pocketshield',
    // Explicitly use Expo's proxy
    useProxy: true,
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
    if (!response) {
      return; // No response yet
    }
    
    console.log('🔄 Google Auth Response received:', response?.type);
    console.log('📋 Full response object:', JSON.stringify(response, null, 2));
    
    if (response?.type === 'success') {
      const { authentication } = response;
      console.log('✅ Google OAuth response received from Expo');
      console.log('📋 Authentication object keys:', Object.keys(authentication));
      console.log('📋 Full response:', JSON.stringify(response, null, 2));
      
      // Verify we have the required tokens
      if (!authentication?.idToken) {
        console.error('❌ Missing idToken in response:', authentication);
        Alert.alert('Authentication Error', 'Google authentication failed: Missing ID token. Please try again.');
        setIsLoading(false);
        return;
      }
      
      // Proceed to Firebase sign-in
      handleGoogleAuthSuccess(authentication);
    } else if (response?.type === 'error') {
      console.error('❌ Google OAuth error:', response.error);
      console.error('❌ Error code:', response.error?.code);
      console.error('❌ Error message:', response.error?.message);
      Alert.alert(
        'Authentication Error', 
        `Failed to authenticate with Google: ${response.error?.message || 'Unknown error'}. Please check your OAuth configuration.`
      );
      setIsLoading(false);
    } else if (response?.type === 'dismiss') {
      console.log('⚠️ User dismissed Google OAuth');
      setIsLoading(false);
    } else if (response?.type === 'cancel') {
      console.log('⚠️ User cancelled Google OAuth');
      setIsLoading(false);
    } else if (response) {
      console.log('⚠️ Unknown response type:', response.type);
      console.log('📋 Full response:', JSON.stringify(response, null, 2));
    }
  }, [response]);

  /**
   * Check for existing authentication
   */
  const checkExistingAuth = async () => {
    try {
      // Check Firebase auth state
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          // User is already authenticated with Firebase
          console.log('User already authenticated:', user.email);
        navigation.replace('Main');
      }
        unsubscribe();
      });
    } catch (error) {
      console.error('Failed to check existing auth:', error);
    }
  };

  /**
   * Handle Google Authentication Success
   * Exchanges Google OAuth token for Firebase credential and signs in
   */
  const handleGoogleAuthSuccess = async (authentication) => {
    try {
      setIsLoading(true);
      
      console.log('Google OAuth successful, exchanging for Firebase credential...');
      console.log('Authentication object:', JSON.stringify(authentication, null, 2));

      // Create Firebase credential from Google OAuth token
      const { idToken, accessToken } = authentication;
      
      if (!idToken) {
        console.error('❌ Missing idToken in authentication response:', authentication);
        throw new Error('Google ID token is missing. Please ensure OAuth is properly configured.');
      }
      
      if (!accessToken) {
        console.warn('⚠️ Missing accessToken, but idToken is present. Continuing...');
      }

      // Create Google Auth Provider credential
      console.log('🔑 Creating Firebase credential from Google OAuth token...');
      console.log('📋 idToken present:', !!idToken);
      console.log('📋 accessToken present:', !!accessToken);
      
      if (!idToken) {
        throw new Error('Google ID token is missing. Cannot create Firebase credential.');
      }
      
      const credential = GoogleAuthProvider.credential(idToken, accessToken);
      console.log('✅ Firebase credential created successfully');
      
      // Sign in to Firebase with the credential
      console.log('🔐 Attempting Firebase sign-in with credential...');
      console.log('📋 Firebase Auth instance:', auth ? 'Initialized ✅' : 'NOT INITIALIZED ❌');
      console.log('📋 Firebase project:', auth?.app?.options?.projectId || 'Unknown');
      
      if (!auth) {
        throw new Error('Firebase Auth is not initialized. Please check Firebase configuration.');
      }
      
      const userCredential = await signInWithCredential(auth, credential);
      const firebaseUser = userCredential.user;
      
      console.log('✅✅✅ FIREBASE SIGN-IN SUCCESSFUL! ✅✅✅');
      console.log('📧 User Email:', firebaseUser.email);
      console.log('🆔 User UID:', firebaseUser.uid);
      console.log('👤 Display Name:', firebaseUser.displayName);
      console.log('📸 Photo URL:', firebaseUser.photoURL);
      console.log('🔑 Provider:', firebaseUser.providerData.map(p => p.providerId));
      console.log('🌐 User should now appear in Firebase Console → Authentication → Users');

      // Get Firebase ID token for API calls
      const firebaseIdToken = await firebaseUser.getIdToken();

      // Store user data in Firestore Database
      const userData = {
        email: firebaseUser.email,
        name: firebaseUser.displayName || 'User',
        photoURL: firebaseUser.photoURL || null,
        authMethod: 'google_firebase',
        providerId: firebaseUser.providerData[0]?.providerId || 'google.com',
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Check if user document exists
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        // Update existing user
        await setDoc(userDocRef, {
          ...userData,
          updatedAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
        }, { merge: true });
        console.log('✅ User data updated in Firestore');
      } else {
        // Create new user document
        await setDoc(userDocRef, userData);
        console.log('✅ New user document created in Firestore');
      }

      // Store authentication data in AsyncStorage for app use
      await AsyncStorage.setItem('authToken', firebaseIdToken);
      await AsyncStorage.setItem('firebaseUserId', firebaseUser.uid);
      await AsyncStorage.setItem('userInfo', JSON.stringify({
        id: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName || 'User',
        picture: firebaseUser.photoURL || null,
        authMethod: 'google_firebase',
        loginTime: new Date().toISOString()
      }));

      // Show success message
      Alert.alert(
        '🎉 Welcome!',
        `Hello ${firebaseUser.displayName || firebaseUser.email}! You've successfully signed in with Google.`,
        [
          {
            text: 'Continue to PocketShield',
            onPress: () => navigation.replace('Main')
          }
        ]
      );

    } catch (error) {
      console.error('❌ Firebase sign-in failed:', error);
      let errorMessage = 'Failed to complete Google authentication. Please try again.';
      
      if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = 'An account already exists with this email. Please use a different sign-in method.';
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid authentication credentials. Please try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Authentication Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle Gmail Login
   */
  const handleGmailLogin = async () => {
    if (!request) {
      Alert.alert('Error', 'Google authentication is not properly configured.');
      return;
    }

    console.log('🚀 Starting Google OAuth flow...');
    console.log('📋 Request object:', request ? 'Available' : 'Missing');
    console.log('📋 Redirect URI:', 'https://auth.expo.io/@suresh_seema/pocketshield');
    console.log('📋 Client ID:', '739358674832-ita1kkj3pqavb0svlb835ub2g5dioa1t.apps.googleusercontent.com');
    
    setIsLoading(true);
    try {
      await promptAsync();
    } catch (error) {
      console.error('❌ Error starting OAuth:', error);
      Alert.alert('Error', `Failed to start Google sign-in: ${error.message}`);
      setIsLoading(false);
    }
  };

  /**
   * Handle Email/Password Sign Up
   */
  const handleEmailSignUp = async () => {
    if (!email || !password || !fullName.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    try {
      setIsLoading(true);
      
      // Create user with email and password in Firebase
      console.log('🔐 Creating user with email/password...');
      console.log('📧 Email:', email);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      console.log('✅ User created successfully!');
      console.log('🆔 User UID:', firebaseUser.uid);
      console.log('📧 User Email:', firebaseUser.email);

      // Update user profile with display name
      await updateProfile(firebaseUser, {
        displayName: fullName.trim()
      });

      // Get Firebase ID token
      const firebaseIdToken = await firebaseUser.getIdToken();

      // Store user data in Firestore Database
      const userData = {
        email: firebaseUser.email,
        name: fullName.trim(),
        photoURL: null,
        authMethod: 'email_password',
        providerId: 'password',
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Create user document in Firestore
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      await setDoc(userDocRef, userData);
      console.log('✅ New user document created in Firestore (email signup)');

      // Store authentication data
      await AsyncStorage.setItem('authToken', firebaseIdToken);
      await AsyncStorage.setItem('firebaseUserId', firebaseUser.uid);
      await AsyncStorage.setItem('userInfo', JSON.stringify({
        id: firebaseUser.uid,
        email: firebaseUser.email,
        name: fullName.trim(),
        picture: null,
        authMethod: 'email_password',
        loginTime: new Date().toISOString()
      }));

      Alert.alert(
        '🎉 Account Created!',
        `Welcome ${fullName}! Your account has been created successfully.`,
        [
          {
            text: 'Continue to PocketShield',
            onPress: () => navigation.replace('Main')
          }
        ]
      );
    } catch (error) {
      console.error('Email signup error:', error);
      let errorMessage = 'Failed to create account. Please try again.';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please sign in instead.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address. Please check and try again.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use a stronger password.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Sign Up Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle Email/Password Sign In
   */
  const handleEmailSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      setIsLoading(true);
      
      // Sign in with email and password in Firebase
      console.log('🔐 Signing in with email/password...');
      console.log('📧 Email:', email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      console.log('✅ Sign-in successful!');
      console.log('🆔 User UID:', firebaseUser.uid);
      console.log('📧 User Email:', firebaseUser.email);

      // Get Firebase ID token
      const firebaseIdToken = await firebaseUser.getIdToken();

      // Store/Update user data in Firestore Database
      const userData = {
        email: firebaseUser.email,
        name: firebaseUser.displayName || email.split('@')[0],
        photoURL: firebaseUser.photoURL || null,
        authMethod: 'email_password',
        providerId: 'password',
        lastLoginAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Check if user document exists
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        // Update existing user
        await setDoc(userDocRef, userData, { merge: true });
        console.log('✅ User data updated in Firestore');
      } else {
        // Create new user document
        await setDoc(userDocRef, {
          ...userData,
          createdAt: serverTimestamp(),
        });
        console.log('✅ New user document created in Firestore');
      }

      // Store authentication data
      await AsyncStorage.setItem('authToken', firebaseIdToken);
      await AsyncStorage.setItem('firebaseUserId', firebaseUser.uid);
      await AsyncStorage.setItem('userInfo', JSON.stringify({
        id: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName || email.split('@')[0],
        picture: firebaseUser.photoURL || null,
        authMethod: 'email_password',
        loginTime: new Date().toISOString()
      }));

      Alert.alert(
        '🎉 Welcome Back!',
        `Hello ${firebaseUser.displayName || email.split('@')[0]}! You've successfully signed in.`,
        [
          {
            text: 'Continue to PocketShield',
            onPress: () => navigation.replace('Main')
          }
        ]
      );
    } catch (error) {
      console.error('Email signin error:', error);
      
      // If account doesn't exist, automatically create it
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        console.log('🔄 Account not found, creating new account automatically...');
        try {
          // Auto-create account with email and password
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const firebaseUser = userCredential.user;

          // Get Firebase ID token
          const firebaseIdToken = await firebaseUser.getIdToken();

          // Store user data in Firestore Database
          const userData = {
            email: firebaseUser.email,
            name: email.split('@')[0], // Use email prefix as name
            photoURL: null,
            authMethod: 'email_password',
            providerId: 'password',
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };

          // Create user document in Firestore
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          await setDoc(userDocRef, userData);
          console.log('✅ New user document created in Firestore (auto-signup)');

          // Store authentication data
          await AsyncStorage.setItem('authToken', firebaseIdToken);
          await AsyncStorage.setItem('firebaseUserId', firebaseUser.uid);
          await AsyncStorage.setItem('userInfo', JSON.stringify({
            id: firebaseUser.uid,
            email: firebaseUser.email,
            name: email.split('@')[0], // Use email prefix as name
            picture: null,
            authMethod: 'email_password',
            loginTime: new Date().toISOString()
          }));

          Alert.alert(
            '🎉 Account Created!',
            `Welcome! Your account has been created and you're now signed in.`,
            [
              {
                text: 'Continue to PocketShield',
                onPress: () => navigation.replace('Main')
              }
            ]
          );
          return; // Exit early, account created successfully
        } catch (createError) {
          console.error('Auto-create account error:', createError);
          let createErrorMessage = 'Failed to create account. Please try again.';
          
          if (createError.code === 'auth/email-already-in-use') {
            createErrorMessage = 'This email is already registered. Please check your password and try signing in again.';
          } else if (createError.code === 'auth/weak-password') {
            createErrorMessage = 'Password is too weak. Please use a stronger password (at least 6 characters).';
          } else if (createError.message) {
            createErrorMessage = createError.message;
          }
          
          Alert.alert('Account Creation Error', createErrorMessage);
          return;
        }
      }
      
      // Handle other errors
      let errorMessage = 'Failed to sign in. Please try again.';
      
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address. Please check and try again.';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'Email/Password authentication is not enabled. Please enable it in Firebase Console.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Sign In Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Validate email format
   */
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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

              {!showEmailLogin ? (
                <>
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

                  {/* Email/Password Login Button */}
                  <TouchableOpacity
                    style={[styles.authButton, styles.emailButton]}
                    onPress={() => setShowEmailLogin(true)}
                    disabled={isLoading}
                  >
                    <View style={styles.authButtonContent}>
                      <View style={styles.authIconContainer}>
                        <Ionicons name="mail" size={24} color="#fff" />
                      </View>
                      <Text style={styles.authButtonText}>
                        Sign in with Email
                      </Text>
                    </View>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {/* Email/Password Form */}
                  <View style={styles.emailForm}>
                    {isSignUp && (
                      <View style={styles.inputContainer}>
                        <Ionicons name="person" size={20} color="#4CAF50" style={styles.inputIcon} />
                        <TextInput
                          style={styles.textInput}
                          placeholder="Full Name"
                          placeholderTextColor="#888"
                          value={fullName}
                          onChangeText={setFullName}
                          autoCapitalize="words"
                        />
                      </View>
                    )}

                    <View style={styles.inputContainer}>
                      <Ionicons name="mail" size={20} color="#4CAF50" style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="Email Address"
                        placeholderTextColor="#888"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>

                    <View style={styles.inputContainer}>
                      <Ionicons name="lock-closed" size={20} color="#4CAF50" style={styles.inputIcon} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="Password"
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

                    <TouchableOpacity
                      style={[styles.authButton, styles.submitButton]}
                      onPress={isSignUp ? handleEmailSignUp : handleEmailSignIn}
                      disabled={isLoading}
                    >
                      <Text style={styles.authButtonText}>
                        {isLoading ? 'Please wait...' : (isSignUp ? 'Sign Up' : 'Sign In')}
                      </Text>
                      {isLoading && (
                        <ActivityIndicator size="small" color="#fff" style={styles.buttonLoader} />
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        setIsSignUp(!isSignUp);
                        setEmail('');
                        setPassword('');
                        setFullName('');
                      }}
                      style={styles.switchAuthButton}
                    >
                      <Text style={styles.switchAuthText}>
                        {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        setShowEmailLogin(false);
                        setEmail('');
                        setPassword('');
                        setFullName('');
                        setIsSignUp(false);
                      }}
                      style={styles.backButton}
                    >
                      <Text style={styles.backButtonText}>← Back to login options</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

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
  emailButton: {
    backgroundColor: '#4285F4',
    marginTop: 10,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    marginTop: 20,
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
  emailForm: {
    marginTop: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 0,
  },
  eyeButton: {
    padding: 5,
  },
  switchAuthButton: {
    marginTop: 15,
    paddingVertical: 10,
    alignItems: 'center',
  },
  switchAuthText: {
    color: '#4CAF50',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  backButton: {
    marginTop: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#888',
    fontSize: 14,
  },
});
