import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import SafeBrowsingService from '../services/SafeBrowsingService';

export default function URLChecker() {
  const [url, setUrl] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [checkHistory, setCheckHistory] = useState([]);

  const checkUrl = async () => {
    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a URL to check');
      return;
    }

    setIsChecking(true);
    setCheckResult(null);

    try {
      // Add protocol if missing
      let urlToCheck = url.trim();
      if (!urlToCheck.startsWith('http://') && !urlToCheck.startsWith('https://')) {
        urlToCheck = 'https://' + urlToCheck;
      }

      const result = await SafeBrowsingService.checkUrl(urlToCheck);
      
      setCheckResult({
        url: urlToCheck,
        result: result,
        timestamp: new Date(),
      });

      // Add to history
      setCheckHistory(prev => [{
        url: urlToCheck,
        isThreat: result.isThreat,
        threatType: result.threatType,
        timestamp: new Date(),
      }, ...prev.slice(0, 9)]); // Keep last 10 checks

      // Show alert if threat detected
      if (result.isThreat) {
        Alert.alert(
          '⚠️ Security Threat Detected',
          result.reasons.join('\n\n'),
          [
            { text: 'OK', style: 'default' },
            { text: 'Learn More', onPress: () => showSecurityTips(result) }
          ]
        );
      }

    } catch (error) {
      console.error('Error checking URL:', error);
      Alert.alert('Error', 'Failed to check URL. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  const showSecurityTips = (result) => {
    const tips = [
      'Never enter personal information on suspicious sites',
      'Do not download files from untrusted sources',
      'Always verify the website URL before entering credentials',
      'Use strong, unique passwords for each account',
      'Enable two-factor authentication where possible',
      'Keep your browser and security software updated',
    ];

    Alert.alert(
      'Security Tips',
      tips.join('\n\n'),
      [{ text: 'Got it', style: 'default' }]
    );
  };

  const getThreatIcon = (threatType) => {
    const icons = {
      'MALWARE': '🦠',
      'SOCIAL_ENGINEERING': '🎣',
      'UNWANTED_SOFTWARE': '📥',
      'POTENTIALLY_HARMFUL_APPLICATION': '⚠️',
      'SUSPICIOUS_PATTERN': '🔍',
    };
    return icons[threatType] || '⚠️';
  };

  const getRiskColor = (riskLevel) => {
    const colors = {
      'safe': '#4CAF50',
      'low': '#FF9800',
      'medium': '#FF5722',
      'high': '#F44336',
      'critical': '#9C27B0',
    };
    return colors[riskLevel] || '#888';
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const renderCheckResult = () => {
    if (!checkResult) return null;

    const { result } = checkResult;

    return (
      <View style={styles.resultContainer}>
        <Text style={styles.resultTitle}>Check Result</Text>
        
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultIcon}>
              {result.isThreat ? '🚨' : '✅'}
            </Text>
            <Text style={[
              styles.resultStatus,
              { color: result.isThreat ? '#F44336' : '#4CAF50' }
            ]}>
              {result.isThreat ? 'THREAT DETECTED' : 'SAFE TO BROWSE'}
            </Text>
          </View>

          {result.isThreat && (
            <View style={styles.threatDetails}>
              <Text style={styles.threatType}>
                {getThreatIcon(result.threatType)} {result.threatType}
              </Text>
              <Text style={styles.riskLevel}>
                Risk Level: <Text style={{ color: getRiskColor(result.riskLevel) }}>
                  {result.riskLevel.toUpperCase()}
                </Text>
              </Text>
              <Text style={styles.confidence}>
                Confidence: {Math.round(result.confidence * 100)}%
              </Text>
            </View>
          )}

          {result.reasons.length > 0 && (
            <View style={styles.reasonsContainer}>
              <Text style={styles.reasonsTitle}>Why this was flagged:</Text>
              {result.reasons.map((reason, index) => (
                <Text key={index} style={styles.reasonItem}>
                  • {reason}
                </Text>
              ))}
            </View>
          )}

          {result.isThreat && (
            <View style={styles.recommendationsContainer}>
              <Text style={styles.recommendationsTitle}>Recommendations:</Text>
              <Text style={styles.recommendationItem}>
                • Do not visit this website
              </Text>
              <Text style={styles.recommendationItem}>
                • Do not enter any personal information
              </Text>
              <Text style={styles.recommendationItem}>
                • Report this link to help protect others
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderCheckHistory = () => {
    if (checkHistory.length === 0) return null;

    return (
      <View style={styles.historyContainer}>
        <Text style={styles.historyTitle}>Recent Checks</Text>
        {checkHistory.slice(0, 5).map((item, index) => (
          <View key={index} style={styles.historyItem}>
            <Text style={styles.historyIcon}>
              {item.isThreat ? '🚨' : '✅'}
            </Text>
            <View style={styles.historyInfo}>
              <Text style={styles.historyUrl} numberOfLines={1}>
                {item.url}
              </Text>
              <Text style={styles.historyTime}>
                {formatTimestamp(item.timestamp)}
              </Text>
            </View>
            <Text style={[
              styles.historyStatus,
              { color: item.isThreat ? '#F44336' : '#4CAF50' }
            ]}>
              {item.isThreat ? 'Threat' : 'Safe'}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>URL Security Checker</Text>
      <Text style={styles.subtitle}>
        Check any URL for security threats before visiting
      </Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.urlInput}
          placeholder="Enter URL to check (e.g., example.com)"
          placeholderTextColor="#888"
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <TouchableOpacity
          style={[styles.checkButton, isChecking && styles.checkButtonDisabled]}
          onPress={checkUrl}
          disabled={isChecking}
        >
          {isChecking ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.checkButtonText}>Check URL</Text>
          )}
        </TouchableOpacity>
      </View>

      {renderCheckResult()}
      {renderCheckHistory()}

      <View style={styles.tipsContainer}>
        <Text style={styles.tipsTitle}>Security Tips</Text>
        <Text style={styles.tipItem}>• Always check suspicious links before clicking</Text>
        <Text style={styles.tipItem}>• Look for HTTPS in the URL bar</Text>
        <Text style={styles.tipItem}>• Be cautious of shortened URLs</Text>
        <Text style={styles.tipItem}>• Never enter passwords on suspicious sites</Text>
        <Text style={styles.tipItem}>• Keep your browser updated</Text>
      </View>
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
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  urlInput: {
    backgroundColor: '#2a2a3e',
    color: '#fff',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  checkButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkButtonDisabled: {
    backgroundColor: '#666',
  },
  checkButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultContainer: {
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 15,
  },
  resultCard: {
    backgroundColor: '#2a2a3e',
    padding: 15,
    borderRadius: 12,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  resultIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  resultStatus: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  threatDetails: {
    marginBottom: 15,
  },
  threatType: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 5,
  },
  riskLevel: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 5,
  },
  confidence: {
    fontSize: 14,
    color: '#ccc',
  },
  reasonsContainer: {
    marginBottom: 15,
  },
  reasonsTitle: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  reasonItem: {
    fontSize: 12,
    color: '#ccc',
    marginBottom: 4,
  },
  recommendationsContainer: {
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 8,
  },
  recommendationsTitle: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  recommendationItem: {
    fontSize: 12,
    color: '#FF9800',
    marginBottom: 4,
  },
  historyContainer: {
    marginBottom: 20,
  },
  historyTitle: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 15,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a3e',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  historyIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  historyInfo: {
    flex: 1,
  },
  historyUrl: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 2,
  },
  historyTime: {
    fontSize: 12,
    color: '#888',
  },
  historyStatus: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  tipsContainer: {
    backgroundColor: '#2a2a3e',
    padding: 15,
    borderRadius: 12,
  },
  tipsTitle: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  tipItem: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 5,
  },
});
