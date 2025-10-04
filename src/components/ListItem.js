import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../app/theme';

const ListItem = ({ 
  title, 
  subtitle, 
  description, 
  severity, 
  icon, 
  onPress, 
  showChevron = true,
  badge,
  timestamp,
  status = 'normal'
}) => {
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return COLORS.severityHigh;
      case 'medium': return COLORS.warning;
      case 'low': return COLORS.severityLow;
      case 'info': return COLORS.info;
      default: return COLORS.textSecondary;
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'high': return 'warning';
      case 'medium': return 'alert-circle';
      case 'low': return 'information-circle';
      case 'info': return 'information-circle';
      default: return 'ellipse';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return COLORS.severityHigh;
      case 'resolved': return COLORS.severityLow;
      case 'pending': return COLORS.warning;
      default: return COLORS.textSecondary;
    }
  };

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.content}>
        <View style={styles.leftSection}>
          {icon && (
            <View style={styles.iconContainer}>
              <Ionicons 
                name={icon} 
                size={20} 
                color={severity ? getSeverityColor(severity) : COLORS.textSecondary} 
              />
            </View>
          )}
          
          <View style={styles.textContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              {badge && (
                <View style={[styles.badge, { backgroundColor: getSeverityColor(badge.type) }]}>
                  <Text style={styles.badgeText}>{badge.text}</Text>
                </View>
              )}
            </View>
            
            {subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
            
            {description && (
              <Text style={styles.description} numberOfLines={2}>
                {description}
              </Text>
            )}
            
            {timestamp && (
              <Text style={styles.timestamp}>
                {timestamp}
              </Text>
            )}
          </View>
        </View>
        
        <View style={styles.rightSection}>
          {severity && (
            <View style={styles.severityContainer}>
              <Ionicons 
                name={getSeverityIcon(severity)} 
                size={16} 
                color={getSeverityColor(severity)} 
              />
            </View>
          )}
          
          {status !== 'normal' && (
            <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(status) }]} />
          )}
          
          {showChevron && (
            <Ionicons 
              name="chevron-forward" 
              size={16} 
              color={COLORS.textTertiary} 
              style={styles.chevron}
            />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusSm,
    marginVertical: SIZES.xs,
    padding: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.small,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    marginRight: SIZES.sm,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SIZES.xs,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: SIZES.fontSizeMd,
    fontWeight: '600',
    flex: 1,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: SIZES.fontSizeSm,
    marginBottom: SIZES.xs,
  },
  description: {
    color: COLORS.textTertiary,
    fontSize: SIZES.fontSizeSm,
    lineHeight: 18,
  },
  timestamp: {
    color: COLORS.textTertiary,
    fontSize: SIZES.fontSizeXs,
    marginTop: SIZES.xs,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  severityContainer: {
    marginRight: SIZES.sm,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SIZES.sm,
  },
  chevron: {
    marginLeft: SIZES.xs,
  },
  badge: {
    paddingHorizontal: SIZES.xs,
    paddingVertical: 2,
    borderRadius: SIZES.radiusXs,
    marginLeft: SIZES.sm,
  },
  badgeText: {
    color: COLORS.textPrimary,
    fontSize: SIZES.fontSizeXs,
    fontWeight: '600',
  },
});

export default ListItem; 