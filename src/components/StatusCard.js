import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../app/theme';

const StatusCard = ({ 
  title, 
  value, 
  status = 'normal', 
  icon, 
  onPress, 
  subtitle,
  trend,
  size = 'medium' 
}) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return COLORS.severityLow;
      case 'warning': return COLORS.warning;
      case 'error': return COLORS.severityHigh;
      case 'info': return COLORS.info;
      default: return COLORS.textSecondary;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return 'checkmark-circle';
      case 'warning': return 'warning';
      case 'error': return 'close-circle';
      case 'info': return 'information-circle';
      default: return 'ellipse';
    }
  };

  const getSizeConfig = (size) => {
    switch (size) {
      case 'small':
        return { padding: SIZES.sm, fontSize: SIZES.fontSizeSm, iconSize: 16 };
      case 'large':
        return { padding: SIZES.lg, fontSize: SIZES.fontSizeLg, iconSize: 24 };
      default:
        return { padding: SIZES.md, fontSize: SIZES.fontSizeMd, iconSize: 20 };
    }
  };

  const config = getSizeConfig(size);
  const statusColor = getStatusColor(status);
  const statusIcon = getStatusIcon(status);

  const CardComponent = onPress ? TouchableOpacity : View;

  return (
    <CardComponent 
      style={[styles.container, { padding: config.padding }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.header}>
        {icon && (
          <Ionicons 
            name={icon} 
            size={config.iconSize} 
            color={statusColor} 
            style={styles.icon}
          />
        )}
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { fontSize: config.fontSize }]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.subtitle, { fontSize: config.fontSize * 0.8 }]}>
              {subtitle}
            </Text>
          )}
        </View>
        <Ionicons 
          name={statusIcon} 
          size={config.iconSize} 
          color={statusColor} 
        />
      </View>
      
      <View style={styles.valueContainer}>
        <Text style={[styles.value, { fontSize: config.fontSize * 1.2 }]}>
          {value}
        </Text>
        {trend && (
          <View style={styles.trendContainer}>
            <Ionicons 
              name={trend === 'up' ? 'trending-up' : 'trending-down'} 
              size={config.iconSize * 0.8} 
              color={trend === 'up' ? COLORS.severityLow : COLORS.severityHigh} 
            />
          </View>
        )}
      </View>
    </CardComponent>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.small,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  icon: {
    marginRight: SIZES.sm,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  subtitle: {
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  value: {
    color: COLORS.textPrimary,
    fontWeight: 'bold',
  },
  trendContainer: {
    marginLeft: SIZES.sm,
  },
});

export default StatusCard; 