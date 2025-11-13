import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import * as SMS from 'expo-sms';
import * as Clipboard from 'expo-clipboard';
import PocketShieldLogo from '../components/PocketShieldLogo';
import otpService from '../services/otpService';

const { width } = Dimensions.get('window');

export default function MobileAuthScreen({ navigation }) {
  const { t } = useTranslation();
  
  // Screen states: 'mobile', 'otp', 'name'
  const [currentScreen, setCurrentScreen] = useState('mobile');
  
  // Form data
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [userName, setUserName] = useState('');
  
  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(60);
  const [canResendOtp, setCanResendOtp] = useState(false);
  const [isAutoReading, setIsAutoReading] = useState(false);
  
  // Refs for OTP inputs
  const otpInputs = useRef([]);
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);

  // Auto-read clipboard for OTP
  useEffect(() => {
    let clipboardInterval;
    
    if (currentScreen === 'otp' && !isAutoReading) {
      setIsAutoReading(true);
      clipboardInterval = setInterval(async () => {
        try {
          const clipboardContent = await Clipboard.getStringAsync();
          // Check if clipboard contains a 6-digit number (likely OTP)
          const otpMatch = clipboardContent.match(/\b\d{6}\b/);
          if (otpMatch) {
            const detectedOtp = otpMatch[0];
            if (detectedOtp === generatedOtp) {
              setOtp(detectedOtp);
              clearInterval(clipboardInterval);
              setIsAutoReading(false);
              // Auto-verify OTP after a short delay
              setTimeout(() => handleOtpVerification(detectedOtp), 1000);
            }
          }
        } catch (error) {
          console.error('Clipboard read error:', error);
        }
      }, 1000);
    }

    return () => {
      if (clipboardInterval) clearInterval(clipboardInterval);
      setIsAutoReading(false);
    };
  }, [currentScreen, generatedOtp]);

  // OTP Timer
  useEffect(() => {
    if (currentScreen === 'otp' && otpTimer > 0) {
      timerRef.current = setTimeout(() => {
        setOtpTimer(prev => prev - 1);
      }, 1000);
    } else if (otpTimer === 0) {
      setCanResendOtp(true);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentScreen, otpTimer]);

  // Screen transition animation
  const animateToScreen = (direction) => {
    Animated.timing(slideAnimation, {
      toValue: direction === 'next' ? -width : width,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      slideAnimation.setValue(0);
    });
  };

  // Handle mobile number submission
  const handleMobileSubmit = async () => {
    if (!otpService.validateIndianMobile(mobileNumber)) {
      Alert.alert(
        t('common.error'),
        t('auth.invalidMobile')
      );
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await otpService.sendOTP(mobileNumber);
      
      if (result.success) {
        setGeneratedOtp(result.otp);
        
        Alert.alert(
          t('auth.otpSent'),
          t('auth.otpSentMessage', { mobile: mobileNumber, otp: result.otp })
        );
        
        // Move to OTP screen
        animateToScreen('next');
        setCurrentScreen('otp');
        setOtpTimer(60);
        setCanResendOtp(false);
      } else {
        Alert.alert(t('common.error'), result.error);
      }
      
    } catch (error) {
      Alert.alert(t('common.error'), 'OTP भेजने में समस्या हुई। कृपया पुनः प्रयास करें।');
    } finally {
      setIsLoading(false);
    }
  };


  // Handle OTP input change
  const handleOtpChange = (text, index) => {
    // Update OTP string
    const newOtp = otp.split('');
    newOtp[index] = text;
    const updatedOtp = newOtp.join('').slice(0, 6);
    setOtp(updatedOtp);

    // Auto-focus next input
    if (text && index < 5) {
      otpInputs.current[index + 1]?.focus();
    }

    // Auto-verify when 6 digits entered
    if (updatedOtp.length === 6) {
      setTimeout(() => handleOtpVerification(updatedOtp), 500);
    }
  };

  // Handle OTP verification
  const handleOtpVerification = async (otpToVerify = otp) => {
    setIsLoading(true);
    
    try {
      const result = await otpService.verifyOTP(mobileNumber, otpToVerify);
      
      if (result.success) {
        // Move to name screen
        animateToScreen('next');
        setCurrentScreen('name');
      } else {
        Alert.alert(t('auth.wrongOtp'), result.error);
        setOtp('');
        otpInputs.current[0]?.focus();
      }
      
    } catch (error) {
      Alert.alert(t('common.error'), 'OTP सत्यापन में समस्या हुई।');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle name submission and complete signup
  const handleNameSubmit = async () => {
    if (!userName.trim()) {
      Alert.alert(t('auth.nameRequired'), t('auth.nameRequiredMessage'));
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await otpService.createUser(mobileNumber, userName);
      
      if (result.success) {
        Alert.alert(
          t('auth.welcomeUser'),
          t('auth.welcomeMessage', { name: userName }),
          [{ 
            text: t('auth.continue'), 
            onPress: () => navigation.reset({
              index: 0,
              routes: [{ name: 'Main' }],
            })
          }]
        );
      } else {
        Alert.alert(t('common.error'), result.error);
      }
      
    } catch (error) {
      Alert.alert(t('common.error'), 'खाता बनाने में समस्या हुई।');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (!canResendOtp) return;
    
    try {
      const result = await otpService.sendOTP(mobileNumber);
      if (result.success) {
        setGeneratedOtp(result.otp);
        setOtp('');
        setOtpTimer(60);
        setCanResendOtp(false);
        
        Alert.alert(
          t('auth.otpSent'),
          t('auth.otpSentMessage', { mobile: mobileNumber, otp: result.otp })
        );
      }
    } catch (error) {
      Alert.alert(t('common.error'), 'OTP भेजने में समस्या हुई।');
    }
  };

  // Skip and use demo version
  const handleSkipDemo = () => {
    Alert.alert(
      t('auth.demoConfirm'),
      t('auth.demoConfirmMessage'),
      [
        { text: t('auth.cancel'), style: 'cancel' },
        { 
          text: t('auth.yesDemo'), 
          onPress: () => navigation.reset({
            index: 0,
            routes: [{ name: 'Main' }],
          })
        }
      ]
    );
  };

  // Mobile Number Screen
  const renderMobileScreen = () => (
    <View style={styles.screenContainer}>
      <PocketShieldLogo />
      
      <Text style={styles.title}>{t('auth.mobileTitle')}</Text>
      <Text style={styles.subtitle}>
        {t('auth.mobileSubtitle')}
      </Text>

      <View style={styles.phoneInputContainer}>
        <View style={styles.countryCode}>
          <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
        </View>
        <TextInput
          style={styles.phoneInput}
          placeholder={t('auth.mobileNumber')}
          placeholderTextColor="#888"
          value={mobileNumber}
          onChangeText={setMobileNumber}
          keyboardType="numeric"
          maxLength={10}
          autoFocus
        />
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, isLoading && styles.disabledButton]}
        onPress={handleMobileSubmit}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>{t('auth.sendOtp')}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipButton} onPress={handleSkipDemo}>
        <Text style={styles.skipButtonText}>
          {t('auth.demoMode')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  // OTP Verification Screen
  const renderOtpScreen = () => (
    <View style={styles.screenContainer}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => {
          setCurrentScreen('mobile');
          setOtp('');
          setGeneratedOtp('');
        }}
      >
        <Ionicons name="arrow-back" size={24} color="#4CAF50" />
      </TouchableOpacity>

      <View style={styles.otpHeader}>
        <Ionicons name="chatbubble-ellipses" size={60} color="#4CAF50" />
        <Text style={styles.title}>{t('auth.otpTitle')}</Text>
        <Text style={styles.subtitle}>
          {t('auth.otpSubtitle', { mobile: mobileNumber })}
        </Text>
      </View>

      <View style={styles.otpContainer}>
        {[...Array(6)].map((_, index) => (
          <TextInput
            key={index}
            ref={ref => otpInputs.current[index] = ref}
            style={styles.otpInput}
            value={otp[index] || ''}
            onChangeText={text => handleOtpChange(text, index)}
            keyboardType="numeric"
            maxLength={1}
            textAlign="center"
          />
        ))}
      </View>

      {isAutoReading && (
        <View style={styles.autoReadingIndicator}>
          <ActivityIndicator size="small" color="#4CAF50" />
          <Text style={styles.autoReadingText}>
            {t('auth.autoReading')}
          </Text>
        </View>
      )}

      <View style={styles.timerContainer}>
        {otpTimer > 0 ? (
          <Text style={styles.timerText}>
            {t('auth.resendOtp', { timer: otpTimer })}
          </Text>
        ) : (
          <TouchableOpacity onPress={handleResendOtp}>
            <Text style={styles.resendText}>{t('auth.resendOtpReady')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>OTP सत्यापित हो रहा है...</Text>
        </View>
      )}
    </View>
  );

  // Name Collection Screen
  const renderNameScreen = () => (
    <View style={styles.screenContainer}>
      <View style={styles.successHeader}>
        <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
        <Text style={styles.title}>{t('auth.nameTitle')}</Text>
        <Text style={styles.subtitle}>
          {t('auth.nameSubtitle')}
        </Text>
      </View>

      <TextInput
        style={styles.nameInput}
        placeholder={t('auth.enterName')}
        placeholderTextColor="#888"
        value={userName}
        onChangeText={setUserName}
        autoFocus
        autoCapitalize="words"
      />

      <TouchableOpacity
        style={[styles.primaryButton, isLoading && styles.disabledButton]}
        onPress={handleNameSubmit}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>{t('auth.complete')}</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View 
          style={[
            styles.content,
            { transform: [{ translateX: slideAnimation }] }
          ]}
        >
          {currentScreen === 'mobile' && renderMobileScreen()}
          {currentScreen === 'otp' && renderOtpScreen()}
          {currentScreen === 'name' && renderNameScreen()}
        </Animated.View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  screenContainer: {
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: -50,
    left: 0,
    padding: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    marginBottom: 30,
    width: '100%',
  },
  countryCode: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 18,
    marginRight: 10,
    justifyContent: 'center',
  },
  countryCodeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 18,
    color: '#fff',
    fontSize: 16,
  },
  nameInput: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 18,
    color: '#fff',
    fontSize: 16,
    marginBottom: 30,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 40,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  disabledButton: {
    backgroundColor: '#666',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 15,
  },
  skipButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    textAlign: 'center',
  },
  otpHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    width: '100%',
  },
  otpInput: {
    width: 45,
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  autoReadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  autoReadingText: {
    color: '#4CAF50',
    fontSize: 14,
    marginLeft: 10,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  timerText: {
    color: '#888',
    fontSize: 14,
  },
  resendText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  loadingText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 10,
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
});
