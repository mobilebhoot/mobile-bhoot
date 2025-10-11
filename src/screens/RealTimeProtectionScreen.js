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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSecurity } from '../state/SecurityProvider';
import RealTimeProtectionService from '../services/RealTimeProtectionService';
import AdvancedSecurityService from '../services/advancedSecurity';
import * as Animatable from 'react-native-animatable';

const { width } = Dimensions.get('window');

export default function RealTimeProtectionScreen({ navigation }) {
  const { securityState } = useSecurity();
  const [refreshing, setRefreshing] = useState(false);
  const [protectionStatus, setProtectionStatus] = useState(null);
  const [realTimeThreats, setRealTimeThreats] = useState([]);
  const [protectionLevel, setProtectionLevel] = useState('high');
  const [isProtectionActive, setIsProtectionActive] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    initializeProtection();
    startRealTimeUpdates();
    
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
      stopRealTimeUpdates();
    };
  }, []);

  const initializeProtection = async () => {
    try {
      await RealTimeProtectionService.initializeProtection();
      updateProtectionData();
    } catch (error) {
      console.error('Error initializing protection:', error);
    }
  };

  const startRealTimeUpdates = () => {
    // Update every 5 seconds for real-time data
    const interval = setInterval(() => {
      updateProtectionData();
    }, 5000);

    return () => clearInterval(interval);
  };

  const stopRealTimeUpdates = () => {
    // Cleanup handled by useEffect
  };

  const updateProtectionData = () => {
    const status = RealTimeProtectionService.getProtectionStatus();
    const threats = RealTimeProtectionService.getRealTimeThreats();
    
    setProtectionStatus(status);
    setRealTimeThreats(threats);
    setIsProtectionActive(status.isActive);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await updateProtectionData();
    setRefreshing(false);
  };

  const toggleProtection = async () => {
    if (isProtectionActive) {
      await RealTimeProtectionService.stopRealTimeMonitoring();
      setIsProtectionActive(false);
    } else {
      await RealTimeProtectionService.startRealTimeMonitoring();
      setIsProtectionActive(true);
    }
  };

  const changeProtectionLevel = (level) => {
    RealTimeProtectionService.setProtectionLevel(level);
    setProtectionLevel(level);
  };

  const handleBlockThreat = (threat) => {
    Alert.alert(
      'Block Threat',
      `Are you sure you want to block this threat?\n\n${threat.description}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Block', 
          style: 'destructive',
          onPress: () => {
            // Handle threat blocking
            console.log('Blocking threat:', threat.id);
          }
        },
      ]
    );
  };

  const getThreatColor = (severity) => {
    switch (severity) {
      case 'critical': return '#F44336';
      case 'high': return '#FF5722';
      case 'medium': return '#FF9800';
      case 'low': return '#4CAF50';
      default: return '#757575';
    }
  };

  const getProtectionLevelColor = (level) => {
    switch (level) {
      case 'maximum': return '#F44336';
      case 'high': return '#FF5722';
      case 'medium': return '#FF9800';
      case 'low': return '#4CAF50';
      default: return '#757575';
    }
  };

  const ProtectionStatusCard = () => (
    <Animatable.View animation="fadeInUp" delay={200} style={styles.statusCard}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.statusGradient}
      >
        <View style={styles.statusHeader}>
          <Ionicons name="shield-checkmark" size={24} color="#fff" />
          <Text style={styles.statusTitle}>Real-Time Protection</Text>
          <Switch
            value={isProtectionActive}
            onValueChange={toggleProtection}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={isProtectionActive ? '#f5dd4b' : '#f4f3f4'}
          />
        </View>
        
        <View style={styles.statusStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{protectionStatus?.stats?.threatsBlocked || 0}</Text>
            <Text style={styles.statLabel}>Threats Blocked</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{protectionStatus?.stats?.connectionsBlocked || 0}</Text>
            <Text style={styles.statLabel}>Connections Blocked</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{protectionStatus?.stats?.malwareDetected || 0}</Text>
            <Text style={styles.statLabel}>Malware Detected</Text>
          </View>
        </View>
      </LinearGradient>
    </Animatable.View>
  );

  const ProtectionLevelCard = () => (
    <Animatable.View animation="fadeInUp" delay={400} style={styles.levelCard}>
      <Text style={styles.cardTitle}>Protection Level</Text>
      <View style={styles.levelButtons}>
        {['low', 'medium', 'high', 'maximum'].map((level) => (
          <TouchableOpacity
            key={level}
            style={[
              styles.levelButton,
              protectionLevel === level && styles.levelButtonActive,
              { borderColor: getProtectionLevelColor(level) }
            ]}
            onPress={() => changeProtectionLevel(level)}
          >
            <Text style={[
              styles.levelButtonText,
              protectionLevel === level && styles.levelButtonTextActive
            ]}>
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animatable.View>
  );

  const RealTimeThreatsCard = () => (
    <Animatable.View animation="fadeInUp" delay={600} style={styles.threatsCard}>
      <View style={styles.threatsHeader}>
        <Ionicons name="warning" size={20} color="#FF5722" />
        <Text style={styles.threatsTitle}>Active Threats ({realTimeThreats.length})</Text>
      </View>
      
      {realTimeThreats.length === 0 ? (
        <View style={styles.noThreats}>
          <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
          <Text style={styles.noThreatsText}>No active threats detected</Text>
          <Text style={styles.noThreatsSubtext}>Your device is protected</Text>
        </View>
      ) : (
        <ScrollView style={styles.threatsList} showsVerticalScrollIndicator={false}>
          {realTimeThreats.map((threat, index) => (
            <View key={threat.id} style={styles.threatItem}>
              <View style={styles.threatHeader}>
                <View style={styles.threatInfo}>
                  <View style={[styles.threatSeverity, { backgroundColor: getThreatColor(threat.severity) }]} />
                  <Text style={styles.threatType}>{threat.type}</Text>
                  <Text style={styles.threatTime}>
                    {new Date(threat.timestamp).toLocaleTimeString()}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.blockButton}
                  onPress={() => handleBlockThreat(threat)}
                >
                  <Ionicons name="close-circle" size={20} color="#F44336" />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.threatDescription}>{threat.description}</Text>
              
              {threat.connection && (
                <View style={styles.connectionInfo}>
                  <Text style={styles.connectionText}>
                    {threat.connection.app} → {threat.connection.destination}
                  </Text>
                </View>
              )}
              
              <View style={styles.threatActions}>
                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons name="information-circle" size={16} color="#2196F3" />
                  <Text style={styles.actionButtonText}>Details</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons name="shield" size={16} color="#4CAF50" />
                  <Text style={styles.actionButtonText}>Protect</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </Animatable.View>
  );

  const MonitoringStatusCard = () => (
    <Animatable.View animation="fadeInUp" delay={800} style={styles.monitoringCard}>
      <Text style={styles.cardTitle}>Monitoring Status</Text>
      <View style={styles.monitoringItems}>
        <View style={styles.monitoringItem}>
          <Ionicons name="network" size={20} color="#2196F3" />
          <Text style={styles.monitoringLabel}>Network Traffic</Text>
          <View style={[styles.statusIndicator, { backgroundColor: '#4CAF50' }]} />
        </View>
        <View style={styles.monitoringItem}>
          <Ionicons name="bug" size={20} color="#FF9800" />
          <Text style={styles.monitoringLabel}>Malware Scanning</Text>
          <View style={[styles.statusIndicator, { backgroundColor: '#4CAF50' }]} />
        </View>
        <View style={styles.monitoringItem}>
          <Ionicons name="fish" size={20} color="#E91E63" />
          <Text style={styles.monitoringLabel}>Phishing Protection</Text>
          <View style={[styles.statusIndicator, { backgroundColor: '#4CAF50' }]} />
        </View>
        <View style={styles.monitoringItem}>
          <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
          <Text style={styles.monitoringLabel}>System Integrity</Text>
          <View style={[styles.statusIndicator, { backgroundColor: '#4CAF50' }]} />
        </View>
      </View>
    </Animatable.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.background}
      >
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <ProtectionStatusCard />
            <ProtectionLevelCard />
            <RealTimeThreatsCard />
            <MonitoringStatusCard />
          </Animated.View>
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
  background: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  statusCard: {
    marginBottom: 20,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  statusGradient: {
    padding: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    marginLeft: 10,
  },
  statusStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
    marginTop: 4,
  },
  levelCard: {
    backgroundColor: '#2a2a3e',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  levelButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  levelButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 2,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  levelButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  levelButtonText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  levelButtonTextActive: {
    fontWeight: 'bold',
  },
  threatsCard: {
    backgroundColor: '#2a2a3e',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  threatsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  threatsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  noThreats: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noThreatsText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginTop: 10,
  },
  noThreatsSubtext: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.7,
    marginTop: 5,
  },
  threatsList: {
    maxHeight: 300,
  },
  threatItem: {
    backgroundColor: '#3a3a4e',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  threatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  threatInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  threatSeverity: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  threatType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 8,
  },
  threatTime: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.6,
  },
  blockButton: {
    padding: 4,
  },
  threatDescription: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 8,
  },
  connectionInfo: {
    backgroundColor: '#4a4a5e',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
  },
  connectionText: {
    fontSize: 12,
    color: '#fff',
    fontFamily: 'monospace',
  },
  threatActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#4a4a5e',
  },
  actionButtonText: {
    fontSize: 12,
    color: '#fff',
    marginLeft: 4,
  },
  monitoringCard: {
    backgroundColor: '#2a2a3e',
    borderRadius: 15,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  monitoringItems: {
    gap: 15,
  },
  monitoringItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monitoringLabel: {
    fontSize: 14,
    color: '#fff',
    flex: 1,
    marginLeft: 10,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
