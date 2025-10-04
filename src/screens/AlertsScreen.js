import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../app/theme';
import { useSecurity } from '../state/SecurityProvider';
import ListItem from '../components/ListItem';
import { formatTimestamp, formatSeverity } from '../utils/formatting';

const AlertsScreen = () => {
  const { vulnerabilities, threats } = useSecurity();
  const [filter, setFilter] = useState('all');

  const allAlerts = [
    ...vulnerabilities.map(v => ({ ...v, type: 'vulnerability' })),
    ...threats.map(t => ({ ...t, type: 'threat' }))
  ].sort((a, b) => new Date(b.lastDetected || b.timestamp) - new Date(a.lastDetected || a.timestamp));

  const filteredAlerts = filter === 'all' ? allAlerts : 
                        filter === 'vulnerabilities' ? vulnerabilities :
                        filter === 'threats' ? threats : allAlerts;

  const getAlertIcon = (type, severity) => {
    if (type === 'threat') return 'shield';
    switch (severity) {
      case 'high': return 'warning';
      case 'medium': return 'alert-circle';
      case 'low': return 'information-circle';
      default: return 'ellipse';
    }
  };

  const handleAlertPress = (alert) => {
    Alert.alert(
      alert.title,
      alert.description,
      [
        { text: 'Dismiss', style: 'cancel' },
        { text: 'Fix Now', onPress: () => handleFixAlert(alert) }
      ]
    );
  };

  const handleFixAlert = (alert) => {
    // Simulate fixing the alert
    Alert.alert('Fix Applied', `Security issue "${alert.title}" has been resolved.`);
  };

  const getFilterButtonStyle = (filterType) => ({
    ...styles.filterButton,
    backgroundColor: filter === filterType ? COLORS.primary : COLORS.surface,
  });

  const getFilterTextStyle = (filterType) => ({
    ...styles.filterButtonText,
    color: filter === filterType ? '#fff' : COLORS.textSecondary,
  });

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Security Alerts</Text>
          <Text style={styles.subtitle}>
            {allAlerts.length} active security issues detected
          </Text>
        </View>

        {/* Filter Buttons */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={getFilterButtonStyle('all')}
              onPress={() => setFilter('all')}
            >
              <Text style={getFilterTextStyle('all')}>All ({allAlerts.length})</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={getFilterButtonStyle('vulnerabilities')}
              onPress={() => setFilter('vulnerabilities')}
            >
              <Text style={getFilterTextStyle('vulnerabilities')}>
                Vulnerabilities ({vulnerabilities.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={getFilterButtonStyle('threats')}
              onPress={() => setFilter('threats')}
            >
              <Text style={getFilterTextStyle('threats')}>
                Threats ({threats.length})
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Alerts List */}
        <View style={styles.alertsSection}>
          {filteredAlerts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle" size={64} color={COLORS.severityLow} />
              <Text style={styles.emptyTitle}>No Alerts</Text>
              <Text style={styles.emptySubtitle}>
                {filter === 'all' ? 'No security issues detected' :
                 filter === 'vulnerabilities' ? 'No vulnerabilities found' :
                 'No threats detected'}
              </Text>
            </View>
          ) : (
            filteredAlerts.map((alert, index) => (
              <ListItem
                key={alert.id || index}
                title={alert.title}
                subtitle={`${formatSeverity(alert.severity)} • ${alert.category || alert.type}`}
                description={alert.description}
                severity={alert.severity}
                icon={getAlertIcon(alert.type, alert.severity)}
                onPress={() => handleAlertPress(alert)}
                timestamp={formatTimestamp(alert.lastDetected || alert.timestamp)}
                badge={alert.type === 'threat' ? { text: 'Threat', type: 'high' } : null}
                status={alert.status || 'active'}
              />
            ))
          )}
        </View>

        {/* Quick Actions */}
        {allAlerts.length > 0 && (
          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => Alert.alert('Action', 'Fix all low priority issues')}
              >
                <Ionicons name="shield-checkmark" size={20} color={COLORS.severityLow} />
                <Text style={styles.actionButtonText}>Fix Low Priority</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => Alert.alert('Action', 'Generate security report')}
              >
                <Ionicons name="document-text" size={20} color={COLORS.info} />
                <Text style={styles.actionButtonText}>Generate Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: SIZES.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  title: {
    fontSize: SIZES.fontSizeTitle,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SIZES.xs,
  },
  subtitle: {
    fontSize: SIZES.fontSizeMd,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  filterSection: {
    marginBottom: SIZES.lg,
  },
  filterButton: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusRound,
    marginRight: SIZES.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  filterButtonText: {
    fontSize: SIZES.fontSizeSm,
    fontWeight: '600',
  },
  alertsSection: {
    marginBottom: SIZES.lg,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SIZES.xl,
  },
  emptyTitle: {
    fontSize: SIZES.fontSizeLg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: SIZES.md,
    marginBottom: SIZES.xs,
  },
  emptySubtitle: {
    fontSize: SIZES.fontSizeMd,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  actionsSection: {
    marginBottom: SIZES.lg,
  },
  sectionTitle: {
    fontSize: SIZES.fontSizeLg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.md,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    marginHorizontal: SIZES.xs,
    ...SHADOWS.small,
  },
  actionButtonText: {
    color: COLORS.textPrimary,
    fontSize: SIZES.fontSizeSm,
    fontWeight: '600',
    marginLeft: SIZES.xs,
  },
});

export default AlertsScreen; 