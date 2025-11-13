/**
 * PocketShield Logo Component
 * Animated logo for authentication and splash screens
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function PocketShieldLogo({ size = 'large', showText = true, animated = true }) {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      // Initial entrance animation
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      // Continuous rotation animation
      const rotateAnimation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        })
      );
      rotateAnimation.start();

      return () => rotateAnimation.stop();
    } else {
      opacityAnim.setValue(1);
      scaleAnim.setValue(1);
    }
  }, [animated]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const logoSizes = {
    small: {
      container: 60,
      icon: 32,
      titleSize: 18,
      subtitleSize: 12,
    },
    medium: {
      container: 80,
      icon: 40,
      titleSize: 24,
      subtitleSize: 14,
    },
    large: {
      container: 120,
      icon: 60,
      titleSize: 32,
      subtitleSize: 16,
    },
  };

  const currentSize = logoSizes[size];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* Animated Logo Container */}
      <View style={styles.logoContainer}>
        {/* Outer Ring */}
        <Animated.View
          style={[
            styles.outerRing,
            {
              width: currentSize.container + 20,
              height: currentSize.container + 20,
              transform: [{ rotate: rotation }],
            },
          ]}
        >
          <LinearGradient
            colors={['#4CAF50', '#2196F3', '#9C27B0']}
            style={styles.ringGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>

        {/* Inner Shield */}
        <View
          style={[
            styles.shieldContainer,
            {
              width: currentSize.container,
              height: currentSize.container,
            },
          ]}
        >
          <LinearGradient
            colors={['#1a1a2e', '#16213e']}
            style={styles.shieldGradient}
          >
            <Ionicons
              name="shield-checkmark"
              size={currentSize.icon}
              color="#4CAF50"
            />
          </LinearGradient>
        </View>

        {/* Security Dots */}
        <View style={styles.securityDots}>
          {[0, 1, 2, 3].map((i) => (
            <Animated.View
              key={i}
              style={[
                styles.securityDot,
                {
                  transform: [
                    {
                      rotate: rotateAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [`${i * 90}deg`, `${i * 90 + 360}deg`],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.dot} />
            </Animated.View>
          ))}
        </View>
      </View>

      {/* Text */}
      {showText && (
        <View style={styles.textContainer}>
          <Text style={[styles.title, { fontSize: currentSize.titleSize }]}>
            PocketShield
          </Text>
          <Text style={[styles.subtitle, { fontSize: currentSize.subtitleSize }]}>
            Mobile Security Guardian
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    position: 'absolute',
    borderRadius: 1000,
    padding: 2,
  },
  ringGradient: {
    flex: 1,
    borderRadius: 1000,
  },
  shieldContainer: {
    borderRadius: 1000,
    padding: 2,
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  shieldGradient: {
    flex: 1,
    borderRadius: 1000,
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityDots: {
    position: 'absolute',
    width: 140,
    height: 140,
  },
  securityDot: {
    position: 'absolute',
    top: 0,
    left: '50%',
    width: 8,
    height: 8,
    marginLeft: -4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 5,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  title: {
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 1,
    textShadowColor: '#4CAF50',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    color: '#4CAF50',
    textAlign: 'center',
    marginTop: 5,
    letterSpacing: 0.5,
    opacity: 0.9,
  },
});