/**
 * Shared utility functions for security-related UI components
 */

export const getSeverityColor = (severity) => {
  const colors = {
    low: '#4CAF50',
    medium: '#FF9800',
    high: '#F44336',
    critical: '#9C27B0',
  };
  return colors[severity] || '#888';
};

export const getEventTypeIcon = (type) => {
  const icons = {
    phishing: '🎣',
    malware: '🦠',
    url_threat: '🌐',
    suspicious_download: '📥',
    security_event: '⚠️',
    network_threat: '🌐',
    app_threat: '📱',
    system_threat: '⚙️',
  };
  return icons[type] || '⚠️';
};

export const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
};

export const getRiskLevelColor = (riskLevel) => {
  const colors = {
    low: '#4CAF50',
    medium: '#FF9800',
    high: '#F44336',
    critical: '#9C27B0',
  };
  return colors[riskLevel] || '#888';
};

export const getThreatTypeIcon = (threatType) => {
  const icons = {
    malware: '🦠',
    phishing: '🎣',
    network: '🌐',
    app: '📱',
    system: '⚙️',
    data: '📊',
    unknown: '❓',
  };
  return icons[threatType] || '❓';
};

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDuration = (milliseconds) => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
};
