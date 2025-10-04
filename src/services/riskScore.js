// Risk score service for calculating and analyzing security risk scores

export const calculateSecurityScore = (securityData) => {
  let score = 100;
  const factors = [];

  // Factor 1: Vulnerabilities (30% weight)
  const vulnerabilityScore = calculateVulnerabilityScore(securityData.vulnerabilities || []);
  score -= vulnerabilityScore.deduction;
  factors.push({
    name: 'Vulnerabilities',
    score: vulnerabilityScore.score,
    deduction: vulnerabilityScore.deduction,
    weight: 30,
  });

  // Factor 2: Threats (25% weight)
  const threatScore = calculateThreatScore(securityData.threats || []);
  score -= threatScore.deduction;
  factors.push({
    name: 'Threats',
    score: threatScore.score,
    deduction: threatScore.deduction,
    weight: 25,
  });

  // Factor 3: Network Security (20% weight)
  const networkScore = calculateNetworkScore(securityData.networkConnections || []);
  score -= networkScore.deduction;
  factors.push({
    name: 'Network Security',
    score: networkScore.score,
    deduction: networkScore.deduction,
    weight: 20,
  });

  // Factor 4: App Security (15% weight)
  const appScore = calculateAppScore(securityData.installedApps || []);
  score -= appScore.deduction;
  factors.push({
    name: 'App Security',
    score: appScore.score,
    deduction: appScore.deduction,
    weight: 15,
  });

  // Factor 5: Device Health (10% weight)
  const deviceScore = calculateDeviceScore(securityData.deviceHealth || {});
  score -= deviceScore.deduction;
  factors.push({
    name: 'Device Health',
    score: deviceScore.score,
    deduction: deviceScore.deduction,
    weight: 10,
  });

  // Ensure score is between 0 and 100
  score = Math.max(0, Math.min(100, score));

  return {
    overallScore: Math.round(score),
    factors,
    riskLevel: getRiskLevel(score),
    recommendations: generateRecommendations(factors),
  };
};

const calculateVulnerabilityScore = (vulnerabilities) => {
  let deduction = 0;
  let score = 100;

  vulnerabilities.forEach(vuln => {
    switch (vuln.severity) {
      case 'high':
        deduction += 15;
        break;
      case 'medium':
        deduction += 8;
        break;
      case 'low':
        deduction += 3;
        break;
    }
  });

  score -= deduction;
  return { score: Math.max(0, score), deduction };
};

const calculateThreatScore = (threats) => {
  let deduction = 0;
  let score = 100;

  threats.forEach(threat => {
    switch (threat.severity) {
      case 'high':
        deduction += 20;
        break;
      case 'medium':
        deduction += 10;
        break;
      case 'low':
        deduction += 5;
        break;
    }
  });

  score -= deduction;
  return { score: Math.max(0, score), deduction };
};

const calculateNetworkScore = (connections) => {
  let deduction = 0;
  let score = 100;

  if (connections.length === 0) {
    return { score: 100, deduction: 0 };
  }

  // Calculate based on connection security
  connections.forEach(conn => {
    switch (conn.status) {
      case 'dangerous':
        deduction += 25;
        break;
      case 'warning':
        deduction += 10;
        break;
      case 'secure':
        deduction += 0;
        break;
    }
  });

  // Average deduction
  deduction = Math.round(deduction / connections.length);
  score -= deduction;

  return { score: Math.max(0, score), deduction };
};

const calculateAppScore = (apps) => {
  let deduction = 0;
  let score = 100;

  if (apps.length === 0) {
    return { score: 100, deduction: 0 };
  }

  // Calculate based on app risk levels
  apps.forEach(app => {
    switch (app.risk) {
      case 'high':
        deduction += 20;
        break;
      case 'medium':
        deduction += 8;
        break;
      case 'low':
        deduction += 2;
        break;
    }
  });

  // Average deduction
  deduction = Math.round(deduction / apps.length);
  score -= deduction;

  return { score: Math.max(0, score), deduction };
};

const calculateDeviceScore = (deviceHealth) => {
  let deduction = 0;
  let score = 100;

  // Check device health factors
  if (!deviceHealth.encryptionEnabled) {
    deduction += 15;
  }

  if (deviceHealth.rootAccess) {
    deduction += 20;
  }

  if (deviceHealth.developerOptions) {
    deduction += 10;
  }

  if (deviceHealth.batteryLevel < 20) {
    deduction += 5;
  }

  if (deviceHealth.storageUsage > 90) {
    deduction += 5;
  }

  score -= deduction;
  return { score: Math.max(0, score), deduction };
};

const getRiskLevel = (score) => {
  if (score >= 80) return 'low';
  if (score >= 60) return 'medium';
  if (score >= 40) return 'high';
  return 'critical';
};

const generateRecommendations = (factors) => {
  const recommendations = [];

  // Sort factors by deduction (highest first)
  const sortedFactors = factors.sort((a, b) => b.deduction - a.deduction);

  sortedFactors.forEach(factor => {
    if (factor.deduction > 0) {
      switch (factor.name) {
        case 'Vulnerabilities':
          recommendations.push({
            priority: 'high',
            title: 'Fix Security Vulnerabilities',
            description: `Address ${factor.deduction} security vulnerabilities to improve your score`,
            impact: `+${factor.deduction} points`,
          });
          break;

        case 'Threats':
          recommendations.push({
            priority: 'high',
            title: 'Address Security Threats',
            description: `Resolve ${factor.deduction} active security threats`,
            impact: `+${factor.deduction} points`,
          });
          break;

        case 'Network Security':
          recommendations.push({
            priority: 'medium',
            title: 'Improve Network Security',
            description: 'Review and secure network connections',
            impact: `+${factor.deduction} points`,
          });
          break;

        case 'App Security':
          recommendations.push({
            priority: 'medium',
            title: 'Review App Security',
            description: 'Review and update app permissions and security settings',
            impact: `+${factor.deduction} points`,
          });
          break;

        case 'Device Health':
          recommendations.push({
            priority: 'low',
            title: 'Optimize Device Health',
            description: 'Improve device security settings and health',
            impact: `+${factor.deduction} points`,
          });
          break;
      }
    }
  });

  return recommendations;
};

export const analyzeRiskTrends = (historicalScores) => {
  if (historicalScores.length < 2) {
    return {
      trend: 'stable',
      change: 0,
      direction: 'none',
      prediction: 'insufficient_data',
    };
  }

  const recentScores = historicalScores.slice(-7); // Last 7 days
  const olderScores = historicalScores.slice(-14, -7); // 7 days before that

  const recentAverage = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
  const olderAverage = olderScores.reduce((sum, score) => sum + score, 0) / olderScores.length;

  const change = recentAverage - olderAverage;
  const percentChange = (change / olderAverage) * 100;

  let trend = 'stable';
  let direction = 'none';

  if (Math.abs(percentChange) < 5) {
    trend = 'stable';
    direction = 'none';
  } else if (percentChange > 0) {
    trend = 'improving';
    direction = 'up';
  } else {
    trend = 'declining';
    direction = 'down';
  }

  // Simple prediction based on trend
  let prediction = 'stable';
  if (trend === 'improving' && percentChange > 10) {
    prediction = 'continued_improvement';
  } else if (trend === 'declining' && percentChange < -10) {
    prediction = 'continued_decline';
  }

  return {
    trend,
    change: Math.round(percentChange * 100) / 100,
    direction,
    prediction,
    recentAverage: Math.round(recentAverage),
    olderAverage: Math.round(olderAverage),
  };
};

export const getRiskColor = (score) => {
  if (score >= 80) return '#4CAF50'; // Green
  if (score >= 60) return '#FF9800'; // Orange
  if (score >= 40) return '#F44336'; // Red
  return '#9C27B0'; // Purple (critical)
};

export const getRiskLabel = (score) => {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Poor';
  return 'Critical';
};

export const calculateConfidenceScore = (dataQuality) => {
  // Calculate confidence in the risk score based on data quality
  let confidence = 100;

  if (dataQuality.vulnerabilityData < 0.8) confidence -= 20;
  if (dataQuality.threatData < 0.8) confidence -= 20;
  if (dataQuality.networkData < 0.8) confidence -= 15;
  if (dataQuality.appData < 0.8) confidence -= 15;
  if (dataQuality.deviceData < 0.8) confidence -= 10;

  return Math.max(0, confidence);
}; 