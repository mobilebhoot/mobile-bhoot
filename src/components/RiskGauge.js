import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '../app/theme';

const RiskGauge = ({ score, size = 'medium', showLabel = true }) => {
  const getScoreColor = (score) => {
    if (score >= 80) return COLORS.severityLow;
    if (score >= 60) return COLORS.warning;
    if (score >= 40) return COLORS.severityHigh;
    return '#9C27B0'; // Purple for critical
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Poor';
    return 'Critical';
  };

  const getSizeConfig = (size) => {
    switch (size) {
      case 'small':
        return { width: 60, height: 60, fontSize: 12, strokeWidth: 4 };
      case 'large':
        return { width: 120, height: 120, fontSize: 18, strokeWidth: 8 };
      default:
        return { width: 80, height: 80, fontSize: 14, strokeWidth: 6 };
    }
  };

  const config = getSizeConfig(size);
  const color = getScoreColor(score);
  const label = getScoreLabel(score);

  return (
    <View style={[styles.container, { width: config.width, height: config.height }]}>
      <View style={[styles.gauge, { borderColor: color, borderWidth: config.strokeWidth }]}>
        <Text style={[styles.score, { fontSize: config.fontSize, color }]}>
          {score}
        </Text>
        {showLabel && (
          <Text style={[styles.label, { fontSize: config.fontSize * 0.6 }]}>
            {label}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gauge: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    borderStyle: 'solid',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  score: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  label: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
});

export default RiskGauge; 