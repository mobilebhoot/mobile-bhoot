import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSecurity } from '../state/SecurityProvider';
import * as Animatable from 'react-native-animatable';
import AdvancedSecurityService from '../services/advancedSecurity';

const { width } = Dimensions.get('window');

export default function EnhancedNetworkScreen({ navigation }) {
  const { securityState, performSecurityScan } = useSecurity();
  const [refreshing, setRefreshing] = useState(false);
  const [realTimeConnections, setRealTimeConnections] = useState([]);
  const [threats, setThreats] = useState([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Start real-time monitoring
    startRealTimeMonitoring();
    
    // Animate screen entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      stopRealTimeMonitoring();
    };
  }, []);

  const startRealTimeMonitoring = async () => {
    setIsMonitoring(true);
    await AdvancedSecurityService.startMonitoring();
    
    // Simulate real-time connection updates
    const interval = setInterval(() => {
      updateConnections();
    }, 5000);

    return () => clearInterval(interval);
  };

  const stopRealTimeMonitoring = () => {
    setIsMonitoring(false);
    AdvancedSecurityService.stopMonitoring();
  };

  const updateConnections = () => {
    // Simulate new connections and threats
    const newConnections = generateMockConnections();
    const newThreats = generateMockThreats();
    
    setRealTimeConnections(newConnections);
    setThreats(newThreats);
  };

  const generateMockConnections = () => {
    const connections = [
      {
        id: 'conn-001',
        app: 'Chrome Browser',
        destination: 'google.com',
        protocol: 'HTTPS',
        status: 'secure',
        dataTransferred: '1.2 MB',
        duration: '5m 23s',
        riskLevel: 'low',
        aiAnalysis: 'Legitimate browser traffic with proper encryption',
        timestamp: new Date().toISOString(),
      },
      {
        id: 'conn-002',
        app: 'Facebook',
        destination: 'facebook.com',
        protocol: 'HTTPS',
        status: 'warning',
        dataTransferred: '3.7 MB',
        duration: '12m 45s',
        riskLevel: 'medium',
        aiAnalysis: 'High data usage, review privacy settings',
        timestamp: new Date().toISOString(),
      },
      {
        id: 'conn-003',
        app: 'Unknown Process',
        destination: 'suspicious-server.com',
        protocol: 'HTTP',
        status: 'dangerous',
        dataTransferred: '0.8 MB',
        duration: '2m 10s',
        riskLevel: 'high',
        aiAnalysis: 'Unencrypted connection to suspicious domain',
        timestamp: new Date().toISOString(),
      },
    ];

    return connections;
  };

  const generateMockThreats = () => {
    return [
      {
        id: 'threat-001',
        type: 'suspicious_connection',
        severity: 'high',
        description: 'Unencrypted connection to suspicious domain',
        source: 'suspicious-server.com',
        recommendation: 'Block this connection immediately',
        timestamp: new Date().toISOString(),
      },
      {
        id: 'threat-002',
        type: 'data_exfiltration',
        severity: 'medium',
        description: 'Unusual data transfer pattern detected',
        source: 'Facebook app',
        recommendation: 'Review app permissions and data usage',
        timestamp: new Date().toISOString(),
      },
    ];
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await performSecurityScan();
    updateConnections();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'secure': return '#4CAF50';
      case 'warning': return '#FF9800';
      case 'dangerous': return '#F44336';
      default: return '#757575';
    }
  };

  const getRiskLevelColor = (riskLevel) => {
    switch (riskLevel) {
      case 'low': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'high': return '#F44336';
      default: return '#757575';
    }
  };

  const handleBlockConnection = (connectionId) => {
    Alert.alert(
      'Block Connection',
      'Are you sure you want to block this connection?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Block', 
          style: 'destructive',
          onPress: () => {
            // Simulate blocking connection
            setRealTimeConnections(prev => 
              prev.filter(conn => conn.id !== connectionId)
            );
          }
        },
      ]
    );
  };

  const ConnectionCard = ({ connection }) => (
    <Animatable.View 
      animation="fadeInUp" 
      duration={600}
      style={[styles.connectionCard, { borderLeftColor: getStatusColor(connection.status) }]}
    >
      <View style={styles.connectionHeader}>
        <View style={styles.connectionInfo}>
          <Text style={styles.connectionApp}>{connection.app}</Text>
          <Text style={styles.connectionDestination}>{connection.destination}</Text>
        </View>
        <View style={styles.connectionStatus}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(connection.status) }]}>
            <Text style={styles.statusText}>{connection.status.toUpperCase()}</Text>
          </View>
          <View style={[styles.riskBadge, { backgroundColor: getRiskLevelColor(connection.riskLevel) }]}>
            <Text style={styles.riskText}>{connection.riskLevel.toUpperCase()}</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.connectionDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="globe" size={16} color="#4CAF50" />
          <Text style={styles.detailText}>Protocol: {connection.protocol}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="trending-up" size={16} color="#2196F3" />
          <Text style={styles.detailText}>Data: {connection.dataTransferred}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="time" size={16} color="#FF9800" />
          <Text style={styles.detailText}>Duration: {connection.duration}</Text>
        </View>
      </View>

      <View style={styles.aiAnalysis}>
        <Ionicons name="bulb" size={16} color="#FFD700" />
        <Text style={styles.aiAnalysisText}>{connection.aiAnalysis}</Text>
      </View>

      {connection.status === 'dangerous' && (
        <TouchableOpacity 
          style={styles.blockButton}
          onPress={() => handleBlockConnection(connection.id)}
        >
          <Ionicons name="close-circle" size={20} color="#F44336" />
          <Text style={styles.blockButtonText}>Block Connection</Text>
        </TouchableOpacity>
      )}
    </Animatable.View>
  );

  const ThreatCard = ({ threat }) => (
    <Animatable.View 
      animation="shake" 
      duration={500}
      style={[styles.threatCard, { borderLeftColor: getStatusColor(threat.severity) }]}
    >
      <View style={styles.threatHeader}>
        <Ionicons 
          name="warning" 
          size={20} 
          color={getStatusColor(threat.severity)} 
        />
        <Text style={styles.threatType}>{threat.type.replace('_', ' ').toUpperCase()}</Text>
        <View style={[styles.severityBadge, { backgroundColor: getStatusColor(threat.severity) }]}>
          <Text style={styles.severityText}>{threat.severity.toUpperCase()}</Text>
        </View>
      </View>
      
      <Text style={styles.threatDescription}>{threat.description}</Text>
      <Text style={styles.threatSource}>Source: {threat.source}</Text>
      <Text style={styles.threatRecommendation}>{threat.recommendation}</Text>
    </Animatable.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Ionicons name="globe" size={24} color="#4CAF50" />
            <Text style={styles.headerTitle}>Network Monitor</Text>
          </View>
          <View style={styles.monitoringStatus}>
            <View style={[styles.statusDot, { backgroundColor: isMonitoring ? '#4CAF50' : '#F44336' }]} />
            <Text style={styles.statusText}>
              {isMonitoring ? 'Monitoring' : 'Stopped'}
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Network Stats */}
          <Animated.View 
            style={[
              styles.statsContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.statCard}>
              <Ionicons name="globe" size={24} color="#4CAF50" />
              <Text style={styles.statValue}>{realTimeConnections.length}</Text>
              <Text style={styles.statLabel}>Active Connections</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="shield" size={24} color="#FF9800" />
              <Text style={styles.statValue}>{threats.length}</Text>
              <Text style={styles.statLabel}>Active Threats</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={styles.statValue}>
                {realTimeConnections.filter(c => c.status === 'secure').length}
              </Text>
              <Text style={styles.statLabel}>Secure</Text>
            </View>
          </Animated.View>

          {/* Active Threats */}
          {threats.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🚨 Active Threats</Text>
              {threats.map((threat) => (
                <ThreatCard key={threat.id} threat={threat} />
              ))}
            </View>
          )}

          {/* Network Connections */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🌐 Network Connections</Text>
            {realTimeConnections.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="globe-outline" size={48} color="#666" />
                <Text style={styles.emptyText}>No active connections</Text>
              </View>
            ) : (
              realTimeConnections.map((connection) => (
                <ConnectionCard key={connection.id} connection={connection} />
              ))
            )}
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={onRefresh}
            >
              <Ionicons name="refresh" size={20} color="#4CAF50" />
              <Text style={styles.actionText}>Refresh</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('AI Chat')}
            >
              <Ionicons name="chatbubble" size={20} color="#2196F3" />
              <Text style={styles.actionText}>Ask AI</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setIsMonitoring(!isMonitoring)}
            >
              <Ionicons name={isMonitoring ? "pause" : "play"} size={20} color="#FF9800" />
              <Text style={styles.actionText}>{isMonitoring ? "Pause" : "Start"}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 10,
  },
  monitoringStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  statusText: {
    fontSize: 12,
    color: '#4CAF50',
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#ccc',
    textAlign: 'center',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  connectionCard: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  connectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  connectionInfo: {
    flex: 1,
  },
  connectionApp: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  connectionDestination: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 2,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  riskText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  connectionDetails: {
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  detailText: {
    fontSize: 12,
    color: '#ccc',
    marginLeft: 8,
  },
  aiAnalysis: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  aiAnalysisText: {
    fontSize: 12,
    color: '#FFD700',
    marginLeft: 8,
    flex: 1,
  },
  blockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  blockButtonText: {
    color: '#F44336',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  threatCard: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  threatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  threatType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  severityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  threatDescription: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 8,
  },
  threatSource: {
    fontSize: 12,
    color: '#ccc',
    marginBottom: 4,
  },
  threatRecommendation: {
    fontSize: 12,
    color: '#FFD700',
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    justifyContent: 'space-around',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a3e',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#444',
  },
  actionText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 12,
  },
});
