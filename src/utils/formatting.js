// Formatting utilities for Android mobile security app

export const formatSecurityScore = (score) => {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Poor';
  return 'Critical';
};

export const formatSeverity = (severity) => {
  switch (severity) {
    case 'high': return 'High';
    case 'medium': return 'Medium';
    case 'low': return 'Low';
    case 'info': return 'Info';
    default: return 'Unknown';
  }
};

export const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMinutes = Math.floor((now - date) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return date.toLocaleDateString();
};

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const formatDuration = (seconds) => {
  if (seconds < 60) return `${seconds}s`;
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

export const formatNetworkProtocol = (protocol) => {
  switch (protocol?.toUpperCase()) {
    case 'HTTPS': return 'HTTPS (Secure)';
    case 'HTTP': return 'HTTP (Insecure)';
    case 'FTP': return 'FTP';
    case 'SSH': return 'SSH';
    case 'TELNET': return 'Telnet (Insecure)';
    default: return protocol || 'Unknown';
  }
};

export const formatAppName = (packageName) => {
  if (!packageName) return 'Unknown App';
  
  // Remove package prefix and format
  const name = packageName.split('.').pop();
  return name.charAt(0).toUpperCase() + name.slice(1).replace(/([A-Z])/g, ' $1');
};

export const formatRiskLevel = (risk) => {
  switch (risk) {
    case 'high': return 'High Risk';
    case 'medium': return 'Medium Risk';
    case 'low': return 'Low Risk';
    case 'safe': return 'Safe';
    default: return 'Unknown Risk';
  }
};

export const formatConnectionStatus = (status) => {
  switch (status) {
    case 'secure': return 'Secure';
    case 'warning': return 'Warning';
    case 'dangerous': return 'Dangerous';
    case 'blocked': return 'Blocked';
    default: return 'Unknown';
  }
};

export const formatPercentage = (value, total) => {
  if (total === 0) return '0%';
  const percentage = (value / total) * 100;
  return `${percentage.toFixed(1)}%`;
};

export const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

export const formatDate = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  const now = new Date();
  const diffTime = Math.abs(now - d);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) return 'Today';
  if (diffDays === 2) return 'Yesterday';
  if (diffDays <= 7) return `${diffDays - 1} days ago`;
  
  return d.toLocaleDateString();
};

export const formatTime = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const formatDateTime = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  return `${formatDate(date)} at ${formatTime(date)}`;
};

export const formatAndroidVersion = (version) => {
  if (!version) return 'Unknown';
  
  const versionMap = {
    '30': 'Android 11',
    '29': 'Android 10',
    '28': 'Android 9',
    '27': 'Android 8.1',
    '26': 'Android 8.0',
    '25': 'Android 7.1',
    '24': 'Android 7.0',
    '23': 'Android 6.0',
    '22': 'Android 5.1',
    '21': 'Android 5.0',
  };
  
  return versionMap[version] || `Android ${version}`;
}; 