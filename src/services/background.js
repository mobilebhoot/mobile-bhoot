// Background service for security monitoring

import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

const BACKGROUND_SECURITY_TASK = 'background-security-task';

// Register background task
TaskManager.defineTask(BACKGROUND_SECURITY_TASK, async () => {
  try {
    // Perform background security checks
    await performBackgroundSecurityScan();
    
    // Return success
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Background security task failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export const registerBackgroundTask = async () => {
  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_SECURITY_TASK, {
      minimumInterval: 15 * 60, // 15 minutes
      stopOnTerminate: false,
      startOnBoot: true,
    });
    console.log('Background security task registered');
  } catch (error) {
    console.error('Failed to register background task:', error);
  }
};

export const unregisterBackgroundTask = async () => {
  try {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SECURITY_TASK);
    console.log('Background security task unregistered');
  } catch (error) {
    console.error('Failed to unregister background task:', error);
  }
};

const performBackgroundSecurityScan = async () => {
  // Simulate background security scan
  const scanResults = {
    timestamp: new Date().toISOString(),
    vulnerabilities: [],
    threats: [],
    networkConnections: [],
    securityScore: 85,
  };

  // Check for new vulnerabilities
  const newVulnerabilities = await checkForNewVulnerabilities();
  scanResults.vulnerabilities = newVulnerabilities;

  // Check for threats
  const newThreats = await checkForThreats();
  scanResults.threats = newThreats;

  // Monitor network connections
  const networkStatus = await monitorNetworkConnections();
  scanResults.networkConnections = networkStatus;

  // Calculate security score
  scanResults.securityScore = calculateSecurityScore(scanResults);

  // Store results
  await storeBackgroundScanResults(scanResults);

  return scanResults;
};

const checkForNewVulnerabilities = async () => {
  // Simulate vulnerability detection
  const vulnerabilities = [];
  
  // Check system updates
  const systemUpdateAvailable = Math.random() > 0.7;
  if (systemUpdateAvailable) {
    vulnerabilities.push({
      id: `vuln-${Date.now()}`,
      title: 'System Update Available',
      description: 'A new system update is available with security patches',
      severity: 'medium',
      category: 'system',
      timestamp: new Date().toISOString(),
    });
  }

  // Check app updates
  const appUpdatesAvailable = Math.random() > 0.8;
  if (appUpdatesAvailable) {
    vulnerabilities.push({
      id: `vuln-${Date.now() + 1}`,
      title: 'App Updates Available',
      description: 'Several apps have security updates available',
      severity: 'low',
      category: 'apps',
      timestamp: new Date().toISOString(),
    });
  }

  return vulnerabilities;
};

const checkForThreats = async () => {
  // Simulate threat detection
  const threats = [];
  
  // Check for suspicious network activity
  const suspiciousActivity = Math.random() > 0.9;
  if (suspiciousActivity) {
    threats.push({
      id: `threat-${Date.now()}`,
      title: 'Suspicious Network Activity',
      description: 'Detected unusual network traffic patterns',
      severity: 'high',
      type: 'network',
      timestamp: new Date().toISOString(),
    });
  }

  return threats;
};

const monitorNetworkConnections = async () => {
  // Simulate network monitoring
  const connections = [
    {
      id: 'conn-1',
      app: 'System',
      destination: 'google.com',
      protocol: 'HTTPS',
      status: 'secure',
      timestamp: new Date().toISOString(),
    },
  ];

  return connections;
};

const calculateSecurityScore = (scanResults) => {
  let score = 100;
  
  // Deduct points for vulnerabilities
  scanResults.vulnerabilities.forEach(vuln => {
    switch (vuln.severity) {
      case 'high': score -= 15; break;
      case 'medium': score -= 8; break;
      case 'low': score -= 3; break;
    }
  });

  // Deduct points for threats
  scanResults.threats.forEach(threat => {
    switch (threat.severity) {
      case 'high': score -= 20; break;
      case 'medium': score -= 10; break;
      case 'low': score -= 5; break;
    }
  });

  return Math.max(0, Math.min(100, score));
};

const storeBackgroundScanResults = async (results) => {
  try {
    // Store results in AsyncStorage or local database
    const storedResults = JSON.parse(localStorage.getItem('backgroundScanResults') || '[]');
    storedResults.push(results);
    
    // Keep only last 10 results
    if (storedResults.length > 10) {
      storedResults.splice(0, storedResults.length - 10);
    }
    
    localStorage.setItem('backgroundScanResults', JSON.stringify(storedResults));
  } catch (error) {
    console.error('Failed to store background scan results:', error);
  }
};

export const getBackgroundScanResults = async () => {
  try {
    const results = JSON.parse(localStorage.getItem('backgroundScanResults') || '[]');
    return results;
  } catch (error) {
    console.error('Failed to get background scan results:', error);
    return [];
  }
};

export const startBackgroundMonitoring = async () => {
  await registerBackgroundTask();
  console.log('Background monitoring started');
};

export const stopBackgroundMonitoring = async () => {
  await unregisterBackgroundTask();
  console.log('Background monitoring stopped');
}; 