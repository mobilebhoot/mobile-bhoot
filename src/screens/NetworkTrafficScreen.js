import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSecurity } from '../state/SecurityProvider';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

const screenWidth = Dimensions.get('window').width;

export default function NetworkTrafficScreen() {
  const { networkConnections, networkAnalysis, aiAnalysis } = useSecurity();
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [filter, setFilter] = useState('all');

  const getConnectionStatusColor = (status) => {
    switch (status) {
      case 'secure': return '#4CAF50';
      case 'warning': return '#FF9800';
      case 'dangerous': return '#F44336';
      default: return '#757575';
    }
  };

  const getConnectionStatusIcon = (status) => {
    switch (status) {
      case 'secure': return 'shield-checkmark';
      case 'warning': return 'warning';
      case 'dangerous': return 'alert-circle';
      default: return 'help-circle';
    }
  };

  const filteredConnections = networkConnections.filter(conn => {
    if (filter === 'all') return true;
    return conn.status === filter;
  });

  const renderConnectionDetails = () => {
    if (!selectedConnection) return null;

    const { details } = selectedConnection;
    
    return (
      <Modal
        visible={showDetails}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetails(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Connection Details</Text>
              <TouchableOpacity onPress={() => setShowDetails(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Connection Info</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>App:</Text>
                  <Text style={styles.detailValue}>{selectedConnection.app}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Destination:</Text>
                  <Text style={styles.detailValue}>{selectedConnection.destination}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Protocol:</Text>
                  <Text style={styles.detailValue}>{selectedConnection.protocol}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Data Transferred:</Text>
                  <Text style={styles.detailValue}>{selectedConnection.dataTransferred}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Duration:</Text>
                  <Text style={styles.detailValue}>{selectedConnection.duration}</Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Security Analysis</Text>
                <View style={styles.securityScore}>
                  <Text style={styles.scoreLabel}>Security Score:</Text>
                  <Text style={[styles.scoreValue, { color: details.securityScore > 70 ? '#4CAF50' : details.securityScore > 40 ? '#FF9800' : '#F44336' }]}>
                    {details.securityScore}/100
                  </Text>
                </View>
                <Text style={styles.aiAnalysis}>{details.aiAnalysis}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Request Headers</Text>
                {Object.entries(details.requestHeaders).map(([key, value]) => (
                  <View key={key} style={styles.headerRow}>
                    <Text style={styles.headerKey}>{key}:</Text>
                    <Text style={styles.headerValue}>{value}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Response Headers</Text>
                {Object.entries(details.responseHeaders).map(([key, value]) => (
                  <View key={key} style={styles.headerRow}>
                    <Text style={styles.headerKey}>{key}:</Text>
                    <Text style={styles.headerValue}>{value}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>AI Recommendations</Text>
                <View style={styles.recommendationContainer}>
                  <Ionicons name="bulb" size={20} color="#4CAF50" />
                  <Text style={styles.recommendationText}>
                    {selectedConnection.status === 'dangerous' 
                      ? 'Block this connection immediately. It poses a high security risk.'
                      : selectedConnection.status === 'warning'
                      ? 'Monitor this connection closely and review app permissions.'
                      : 'This connection appears secure. Continue monitoring for changes.'}
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderConnectionCard = (connection) => (
    <TouchableOpacity
      key={connection.id}
      style={styles.connectionCard}
      onPress={() => {
        setSelectedConnection(connection);
        setShowDetails(true);
      }}
    >
      <View style={styles.connectionHeader}>
        <View style={styles.connectionInfo}>
          <Text style={styles.appName}>{connection.app}</Text>
          <Text style={styles.destination}>{connection.destination}</Text>
        </View>
        <View style={styles.statusContainer}>
          <Ionicons 
            name={getConnectionStatusIcon(connection.status)} 
            size={20} 
            color={getConnectionStatusColor(connection.status)} 
          />
          <Text style={[styles.statusText, { color: getConnectionStatusColor(connection.status) }]}>
            {connection.status.toUpperCase()}
          </Text>
        </View>
      </View>
      
      <View style={styles.connectionDetails}>
        <View style={styles.detailItem}>
          <Ionicons name="globe" size={16} color="#888" />
          <Text style={styles.detailText}>{connection.protocol}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="download" size={16} color="#888" />
          <Text style={styles.detailText}>{connection.dataTransferred}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="time" size={16} color="#888" />
          <Text style={styles.detailText}>{connection.duration}</Text>
        </View>
      </View>

      <View style={styles.securityIndicator}>
        <Text style={styles.securityScoreText}>
          Security: {connection.details.securityScore}/100
        </Text>
        <View style={[styles.scoreBar, { backgroundColor: '#333' }]}>
          <View 
            style={[
              styles.scoreFill, 
              { 
                width: `${connection.details.securityScore}%`,
                backgroundColor: connection.details.securityScore > 70 ? '#4CAF50' : 
                               connection.details.securityScore > 40 ? '#FF9800' : '#F44336'
              }
            ]} 
          />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderNetworkChart = () => {
    const chartData = {
      labels: ['Secure', 'Warning', 'Dangerous'],
      datasets: [{
        data: [
          networkConnections.filter(c => c.status === 'secure').length,
          networkConnections.filter(c => c.status === 'warning').length,
          networkConnections.filter(c => c.status === 'dangerous').length,
        ]
      }]
    };

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Network Traffic Distribution</Text>
        <BarChart
          data={chartData}
          width={screenWidth - 40}
          height={200}
          yAxisSuffix=""
          chartConfig={{
            backgroundColor: '#2a2a3e',
            backgroundGradientFrom: '#2a2a3e',
            backgroundGradientTo: '#2a2a3e',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            barPercentage: 0.7,
          }}
          style={styles.chart}
        />
      </View>
    );
  };

  const renderAIInsights = () => {
    if (!aiAnalysis.recommendations) return null;

    return (
      <View style={styles.aiInsightsContainer}>
        <Text style={styles.aiInsightsTitle}>AI Security Insights</Text>
        {aiAnalysis.recommendations
          .filter(rec => rec.title.toLowerCase().includes('network'))
          .map((recommendation, index) => (
            <View key={index} style={styles.recommendationCard}>
              <View style={styles.recommendationHeader}>
                <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
                <Text style={styles.recommendationTitle}>{recommendation.title}</Text>
              </View>
              <Text style={styles.recommendationDescription}>{recommendation.description}</Text>
              <View style={styles.recommendationMeta}>
                <Text style={styles.priorityText}>Priority: {recommendation.priority}</Text>
                <Text style={styles.confidenceText}>AI Confidence: {recommendation.aiConfidence}%</Text>
              </View>
            </View>
          ))}
      </View>
    );
  };

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Ionicons name="globe" size={24} color="#4CAF50" />
            <Text style={styles.headerTitle}>Network Traffic</Text>
          </View>
          <TouchableOpacity style={styles.monitoringToggle}>
            <Ionicons name="eye" size={20} color="#4CAF50" />
            <Text style={styles.toggleText}>Monitoring</Text>
          </TouchableOpacity>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Ionicons name="shield-checkmark" size={24} color="#4CAF50" />
            <Text style={styles.summaryNumber}>
              {networkConnections.filter(c => c.status === 'secure').length}
            </Text>
            <Text style={styles.summaryLabel}>Secure</Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="warning" size={24} color="#FF9800" />
            <Text style={styles.summaryNumber}>
              {networkConnections.filter(c => c.status === 'warning').length}
            </Text>
            <Text style={styles.summaryLabel}>Warning</Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="alert-circle" size={24} color="#F44336" />
            <Text style={styles.summaryNumber}>
              {networkConnections.filter(c => c.status === 'dangerous').length}
            </Text>
            <Text style={styles.summaryLabel}>Dangerous</Text>
          </View>
        </View>

        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          {['all', 'secure', 'warning', 'dangerous'].map((filterType) => (
            <TouchableOpacity
              key={filterType}
              style={[styles.filterButton, filter === filterType && styles.filterButtonActive]}
              onPress={() => setFilter(filterType)}
            >
              <Text style={[styles.filterText, filter === filterType && styles.filterTextActive]}>
                {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Network Chart */}
        {renderNetworkChart()}

        {/* AI Insights */}
        {renderAIInsights()}

        {/* Connections List */}
        <View style={styles.connectionsContainer}>
          <Text style={styles.sectionTitle}>Active Connections ({filteredConnections.length})</Text>
          {filteredConnections.map(renderConnectionCard)}
        </View>
      </ScrollView>

      {/* Connection Details Modal */}
      {renderConnectionDetails()}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
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
  monitoringToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  toggleText: {
    color: '#4CAF50',
    fontSize: 12,
    marginLeft: 5,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  summaryCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 15,
    borderRadius: 12,
    minWidth: 80,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 5,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#ccc',
    marginTop: 5,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterButtonActive: {
    backgroundColor: '#4CAF50',
  },
  filterText: {
    color: '#ccc',
    fontSize: 14,
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  chartContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  aiInsightsContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  aiInsightsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  recommendationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  recommendationDescription: {
    fontSize: 12,
    color: '#ccc',
    lineHeight: 18,
  },
  recommendationMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  priorityText: {
    fontSize: 11,
    color: '#888',
  },
  confidenceText: {
    fontSize: 11,
    color: '#4CAF50',
  },
  connectionsContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  connectionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
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
  appName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  destination: {
    fontSize: 12,
    color: '#ccc',
    marginTop: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  connectionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    color: '#ccc',
    marginLeft: 5,
  },
  securityIndicator: {
    marginTop: 10,
  },
  securityScoreText: {
    fontSize: 12,
    color: '#ccc',
    marginBottom: 5,
  },
  scoreBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  scoreFill: {
    height: '100%',
    borderRadius: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2a2a3e',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalBody: {
    flex: 1,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#ccc',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#fff',
  },
  securityScore: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#ccc',
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  aiAnalysis: {
    fontSize: 12,
    color: '#4CAF50',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  headerKey: {
    fontSize: 12,
    color: '#888',
    width: '40%',
  },
  headerValue: {
    fontSize: 12,
    color: '#ccc',
    flex: 1,
  },
  recommendationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
  },
  recommendationText: {
    fontSize: 12,
    color: '#4CAF50',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
}); 