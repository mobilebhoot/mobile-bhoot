import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import SafeBrowsingService from '../services/SafeBrowsingService';

const { width } = Dimensions.get('window');

export default function SecurityEventsScreen() {
  const [dashboardData, setDashboardData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const data = SafeBrowsingService.getDashboardData();
      setDashboardData(data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const clearAllEvents = () => {
    Alert.alert(
      'Clear Security Events',
      'Are you sure you want to clear all security events? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await SafeBrowsingService.clearAllEvents();
            await loadDashboardData();
          },
        },
      ]
    );
  };

  const getSeverityColor = (severity) => {
    const colors = {
      low: '#4CAF50',
      medium: '#FF9800',
      high: '#F44336',
      critical: '#9C27B0',
    };
    return colors[severity] || '#888';
  };

  const getSeverityIcon = (severity) => {
    const icons = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      critical: '🔴',
    };
    return icons[severity] || '⚪';
  };

  const getEventTypeIcon = (type) => {
    const icons = {
      phishing: '🎣',
      malware: '🦠',
      suspicious_download: '📥',
      unsafe_browsing: '🌐',
      data_leak: '💧',
      unauthorized_access: '🔓',
    };
    return icons[type] || '⚠️';
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const renderStatsCards = () => {
    if (!dashboardData?.stats) return null;

    const { stats } = dashboardData;
    const safetyScore = SafeBrowsingService.getSafetyScore();

    return (
      <View style={styles.statsContainer}>
        {/* Safety Score */}
        <View style={styles.safetyScoreCard}>
          <Text style={styles.safetyScoreTitle}>Safety Score</Text>
          <Text style={styles.safetyScoreValue}>{safetyScore}/100</Text>
          <View style={styles.safetyScoreBar}>
            <View style={[styles.safetyScoreFill, { width: `${safetyScore}%` }]} />
          </View>
          <Text style={styles.safetyScoreStatus}>
            {safetyScore >= 90 ? 'Excellent' : 
             safetyScore >= 70 ? 'Good' : 
             safetyScore >= 50 ? 'Fair' : 'Poor'}
          </Text>
        </View>

        {/* Quick Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🚨</Text>
            <Text style={styles.statValue}>{stats.criticalEvents}</Text>
            <Text style={styles.statLabel}>Critical</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>⚠️</Text>
            <Text style={styles.statValue}>{stats.highRiskEvents}</Text>
            <Text style={styles.statLabel}>High Risk</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🎣</Text>
            <Text style={styles.statValue}>{stats.phishingAttempts}</Text>
            <Text style={styles.statLabel}>Phishing</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🦠</Text>
            <Text style={styles.statValue}>{stats.malwareDetected}</Text>
            <Text style={styles.statLabel}>Malware</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderRecentEvents = () => {
    if (!dashboardData?.recentEvents) return null;

    return (
      <View style={styles.eventsContainer}>
        <View style={styles.eventsHeader}>
          <Text style={styles.eventsTitle}>Recent Security Events</Text>
          <TouchableOpacity onPress={clearAllEvents} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        </View>

        {dashboardData.recentEvents.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🛡️</Text>
            <Text style={styles.emptyStateTitle}>No Recent Events</Text>
            <Text style={styles.emptyStateText}>Your device has been secure!</Text>
          </View>
        ) : (
          dashboardData.recentEvents.map((event) => (
            <View key={event.id} style={styles.eventCard}>
              <View style={styles.eventHeader}>
                <Text style={styles.eventTypeIcon}>{getEventTypeIcon(event.type)}</Text>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventType}>{event.type.replace('_', ' ').toUpperCase()}</Text>
                  <Text style={styles.eventTime}>{formatTimestamp(event.timestamp)}</Text>
                </View>
                <View style={styles.severityBadge}>
                  <Text style={styles.severityIcon}>{getSeverityIcon(event.severity)}</Text>
                  <Text style={[styles.severityText, { color: getSeverityColor(event.severity) }]}>
                    {event.severity.toUpperCase()}
                  </Text>
                </View>
              </View>
              
              <Text style={styles.eventDescription}>{event.description}</Text>
              
              {event.url && (
                <Text style={styles.eventUrl} numberOfLines={1}>
                  {event.url}
                </Text>
              )}
              
              <View style={styles.eventFooter}>
                <Text style={styles.eventAction}>
                  Action: {event.action || 'Detected'}
                </Text>
                <Text style={styles.eventRiskScore}>
                  Risk: {event.riskScore}/100
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    );
  };

  const renderThreatTrends = () => {
    if (!dashboardData?.trends) return null;

    const { trends } = dashboardData;

    return (
      <View style={styles.trendsContainer}>
        <Text style={styles.trendsTitle}>Threat Trends (Last 7 Days)</Text>
        
        <View style={styles.trendItem}>
          <Text style={styles.trendLabel}>Security Events</Text>
          <Text style={[styles.trendValue, { color: trends.eventsChange >= 0 ? '#F44336' : '#4CAF50' }]}>
            {trends.eventsChange >= 0 ? '+' : ''}{trends.eventsChange}
          </Text>
        </View>
        
        <View style={styles.trendItem}>
          <Text style={styles.trendLabel}>Phishing Attempts</Text>
          <Text style={[styles.trendValue, { color: trends.phishingChange >= 0 ? '#F44336' : '#4CAF50' }]}>
            {trends.phishingChange >= 0 ? '+' : ''}{trends.phishingChange}
          </Text>
        </View>
        
        <View style={styles.trendItem}>
          <Text style={styles.trendLabel}>Malware Detected</Text>
          <Text style={[styles.trendValue, { color: trends.malwareChange >= 0 ? '#F44336' : '#4CAF50' }]}>
            {trends.malwareChange >= 0 ? '+' : ''}{trends.malwareChange}
          </Text>
        </View>
      </View>
    );
  };

  if (!dashboardData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading security events...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Security Events Monitor</Text>
      
      {renderStatsCards()}
      {renderThreatTrends()}
      {renderRecentEvents()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  loadingText: {
    fontSize: 18,
    color: '#ccc',
  },
  statsContainer: {
    marginBottom: 20,
  },
  safetyScoreCard: {
    backgroundColor: '#2a2a3e',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  safetyScoreTitle: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  safetyScoreValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 10,
  },
  safetyScoreBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    marginBottom: 10,
  },
  safetyScoreFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  safetyScoreStatus: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#2a2a3e',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#ccc',
    textAlign: 'center',
  },
  trendsContainer: {
    backgroundColor: '#2a2a3e',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  trendsTitle: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 15,
  },
  trendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  trendLabel: {
    fontSize: 14,
    color: '#ccc',
  },
  trendValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  eventsContainer: {
    marginBottom: 20,
  },
  eventsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  eventsTitle: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  clearButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyState: {
    backgroundColor: '#2a2a3e',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  emptyStateTitle: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
  },
  eventCard: {
    backgroundColor: '#2a2a3e',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  eventTypeIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  eventInfo: {
    flex: 1,
  },
  eventType: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  eventTime: {
    fontSize: 12,
    color: '#888',
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  severityIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  severityText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  eventDescription: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 8,
  },
  eventUrl: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eventAction: {
    fontSize: 12,
    color: '#4CAF50',
  },
  eventRiskScore: {
    fontSize: 12,
    color: '#FF9800',
  },
});
