import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PocketShieldLogo = ({ size = 64, showText = true, textSize = 'large' }) => {
  const logoSize = size;
  const titleSize = textSize === 'large' ? 32 : textSize === 'medium' ? 24 : 18;
  const subtitleSize = textSize === 'large' ? 16 : textSize === 'medium' ? 14 : 12;

  return (
    <View style={styles.logoContainer}>
      {/* Shield with Lock Icon */}
      <View style={[styles.shieldContainer, { width: logoSize, height: logoSize }]}>
        <View style={[styles.shield, { width: logoSize, height: logoSize }]}>
          <Ionicons 
            name="lock-closed" 
            size={logoSize * 0.4} 
            color="#FFFFFF" 
            style={styles.lockIcon}
          />
        </View>
      </View>
      
      {showText && (
        <View style={styles.textContainer}>
          <Text style={[styles.appTitle, { fontSize: titleSize }]}>PocketShield</Text>
          <Text style={[styles.appSubtitle, { fontSize: subtitleSize }]}>
            SECURITY APP
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  shield: {
    backgroundColor: '#1e4a6b', // Dark blue color from your logo
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    // Shield shape using border radius
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  lockIcon: {
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  textContainer: {
    alignItems: 'center',
  },
  appTitle: {
    fontWeight: 'bold',
    color: '#1e4a6b', // Dark blue to match shield
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 4,
  },
  appSubtitle: {
    color: '#666',
    fontWeight: '600',
    letterSpacing: 2,
    textAlign: 'center',
  },
});

export default PocketShieldLogo;
