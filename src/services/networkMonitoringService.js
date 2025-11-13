import { Platform } from 'react-native';
import * as Device from 'expo-device';

class NetworkMonitoringService {
  constructor() {
    this.isMonitoring = false;
    this.networkData = {
      totalBandwidth: { download: 0, upload: 0 },
      appUsage: new Map(),
      realTimeData: [],
      dailyStats: [],
      hourlyStats: []
    };
    
    // Simulated network monitoring for demo
    this.simulatedApps = [
      'WhatsApp', 'Chrome', 'YouTube', 'Facebook', 'Instagram', 
      'Gmail', 'Maps', 'Spotify', 'Netflix', 'PhonePe'
    ];
    
    this.monitoringInterval = null;
    this.startTime = Date.now();
  }

  // Start network monitoring
  async startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.startTime = Date.now();
    
    // Initialize with current network stats (simulated)
    await this.initializeNetworkStats();
    
    // Start real-time monitoring
    this.monitoringInterval = setInterval(() => {
      this.collectNetworkData();
    }, 5000); // Collect data every 5 seconds
    
    console.log('Network monitoring started');
  }

  // Stop network monitoring
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    console.log('Network monitoring stopped');
  }

  // Initialize network statistics
  async initializeNetworkStats() {
    try {
      // Get device info for baseline
      const deviceInfo = Device.modelName || 'Unknown Device';
      
      // Generate realistic baseline data
      this.generateBaselineData();
      
      // Generate historical data for charts
      this.generateHistoricalData();
      
    } catch (error) {
      console.error('Error initializing network stats:', error);
    }
  }

  // Generate realistic baseline network data
  generateBaselineData() {
    const currentTime = Date.now();
    const baseUsage = {
      'WhatsApp': { 
        download: this.randomBetween(150, 300), 
        upload: this.randomBetween(80, 150),
        realTime: this.randomBetween(5, 15)
      },
      'Chrome': { 
        download: this.randomBetween(500, 1200), 
        upload: this.randomBetween(50, 100),
        realTime: this.randomBetween(20, 50)
      },
      'YouTube': { 
        download: this.randomBetween(2000, 5000), 
        upload: this.randomBetween(10, 30),
        realTime: this.randomBetween(100, 200)
      },
      'Facebook': { 
        download: this.randomBetween(200, 500), 
        upload: this.randomBetween(40, 80),
        realTime: this.randomBetween(15, 30)
      },
      'Instagram': { 
        download: this.randomBetween(800, 1500), 
        upload: this.randomBetween(100, 200),
        realTime: this.randomBetween(30, 60)
      },
      'Gmail': { 
        download: this.randomBetween(50, 150), 
        upload: this.randomBetween(20, 50),
        realTime: this.randomBetween(2, 8)
      },
      'Maps': { 
        download: this.randomBetween(100, 300), 
        upload: this.randomBetween(30, 70),
        realTime: this.randomBetween(10, 25)
      },
      'Spotify': { 
        download: this.randomBetween(300, 800), 
        upload: this.randomBetween(5, 15),
        realTime: this.randomBetween(15, 40)
      },
      'Netflix': { 
        download: this.randomBetween(3000, 8000), 
        upload: this.randomBetween(5, 20),
        realTime: this.randomBetween(200, 400)
      },
      'PhonePe': { 
        download: this.randomBetween(20, 80), 
        upload: this.randomBetween(15, 40),
        realTime: this.randomBetween(1, 5)
      }
    };

    this.networkData.appUsage = new Map(Object.entries(baseUsage));
    
    // Calculate total bandwidth
    let totalDown = 0, totalUp = 0;
    for (const [app, usage] of this.networkData.appUsage) {
      totalDown += usage.download;
      totalUp += usage.upload;
    }
    
    this.networkData.totalBandwidth = {
      download: totalDown,
      upload: totalUp
    };
  }

  // Generate historical data for charts (24 hours)
  generateHistoricalData() {
    const now = Date.now();
    const hourlyData = [];
    const dailyData = [];
    
    // Generate 24 hours of hourly data
    for (let i = 23; i >= 0; i--) {
      const timestamp = now - (i * 60 * 60 * 1000);
      const hour = new Date(timestamp).getHours();
      
      // Simulate realistic usage patterns
      let multiplier = 0.5; // Base usage
      if (hour >= 9 && hour <= 12) multiplier = 1.2; // Morning peak
      if (hour >= 14 && hour <= 17) multiplier = 1.0; // Afternoon
      if (hour >= 19 && hour <= 23) multiplier = 1.5; // Evening peak
      if (hour >= 0 && hour <= 6) multiplier = 0.3; // Night
      
      const download = this.randomBetween(50, 200) * multiplier;
      const upload = this.randomBetween(10, 50) * multiplier;
      
      hourlyData.push({
        timestamp,
        download,
        upload,
        total: download + upload,
        hour: hour,
        label: `${hour.toString().padStart(2, '0')}:00`
      });
    }
    
    // Generate 7 days of daily data
    for (let i = 6; i >= 0; i--) {
      const timestamp = now - (i * 24 * 60 * 60 * 1000);
      const date = new Date(timestamp);
      
      let multiplier = 1.0;
      if (date.getDay() === 0 || date.getDay() === 6) multiplier = 1.3; // Weekend
      
      dailyData.push({
        timestamp,
        download: this.randomBetween(2000, 8000) * multiplier,
        upload: this.randomBetween(500, 2000) * multiplier,
        date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      });
    }
    
    this.networkData.hourlyStats = hourlyData;
    this.networkData.dailyStats = dailyData;
  }

  // Collect real-time network data
  collectNetworkData() {
    const currentTime = Date.now();
    
    // Update app usage with realistic increments
    for (const [appName, usage] of this.networkData.appUsage) {
      const downloadIncrement = this.randomBetween(0, usage.realTime * 0.5);
      const uploadIncrement = this.randomBetween(0, usage.realTime * 0.2);
      
      usage.download += downloadIncrement;
      usage.upload += uploadIncrement;
    }
    
    // Add to real-time data for charts
    const totalDown = Array.from(this.networkData.appUsage.values())
      .reduce((sum, app) => sum + (app.download || 0), 0);
    const totalUp = Array.from(this.networkData.appUsage.values())
      .reduce((sum, app) => sum + (app.upload || 0), 0);
    
    this.networkData.realTimeData.push({
      timestamp: currentTime,
      download: totalDown,
      upload: totalUp,
      total: totalDown + totalUp
    });
    
    // Keep only last 100 data points for performance
    if (this.networkData.realTimeData.length > 100) {
      this.networkData.realTimeData = this.networkData.realTimeData.slice(-100);
    }
    
    // Update total bandwidth
    this.networkData.totalBandwidth = {
      download: totalDown,
      upload: totalUp
    };
  }

  // Get current network statistics
  getCurrentStats() {
    return {
      totalBandwidth: this.networkData.totalBandwidth,
      appUsage: Array.from(this.networkData.appUsage.entries()).map(([app, usage]) => ({
        app,
        download: usage.download,
        upload: usage.upload,
        total: usage.download + usage.upload,
        percentage: ((usage.download + usage.upload) / 
          (this.networkData.totalBandwidth.download + this.networkData.totalBandwidth.upload)) * 100
      })).sort((a, b) => b.total - a.total),
      realTimeData: this.networkData.realTimeData,
      isMonitoring: this.isMonitoring,
      uptime: this.isMonitoring ? Date.now() - this.startTime : 0
    };
  }

  // Get historical data for charts
  getHistoricalData(period = 'hourly') {
    switch (period) {
      case 'hourly':
        return this.networkData.hourlyStats;
      case 'daily':
        return this.networkData.dailyStats;
      case 'realtime':
        return this.networkData.realTimeData.slice(-20); // Last 20 points
      default:
        return this.networkData.hourlyStats;
    }
  }

  // Get top bandwidth consuming apps
  getTopApps(limit = 5) {
    const stats = this.getCurrentStats();
    return stats.appUsage.slice(0, limit);
  }

  // Get network performance metrics
  getPerformanceMetrics() {
    const stats = this.getCurrentStats();
    const total = stats.totalBandwidth.download + stats.totalBandwidth.upload;
    
    return {
      totalUsage: total,
      downloadSpeed: stats.totalBandwidth.download,
      uploadSpeed: stats.totalBandwidth.upload,
      efficiency: this.calculateNetworkEfficiency(),
      peakUsage: this.getPeakUsage(),
      averageUsage: this.getAverageUsage(),
      connectionQuality: this.getConnectionQuality()
    };
  }

  // Calculate network efficiency (simulated)
  calculateNetworkEfficiency() {
    const hourlyData = this.networkData.hourlyStats;
    if (hourlyData.length === 0) return 0;
    
    const totalUsage = hourlyData.reduce((sum, hour) => sum + hour.total, 0);
    const peakUsage = Math.max(...hourlyData.map(hour => hour.total));
    
    return peakUsage > 0 ? Math.min((totalUsage / (peakUsage * hourlyData.length)) * 100, 100) : 0;
  }

  // Get peak usage
  getPeakUsage() {
    const hourlyData = this.networkData.hourlyStats;
    if (hourlyData.length === 0) return 0;
    
    return Math.max(...hourlyData.map(hour => hour.total));
  }

  // Get average usage
  getAverageUsage() {
    const hourlyData = this.networkData.hourlyStats;
    if (hourlyData.length === 0) return 0;
    
    const totalUsage = hourlyData.reduce((sum, hour) => sum + hour.total, 0);
    return totalUsage / hourlyData.length;
  }

  // Get connection quality (simulated)
  getConnectionQuality() {
    const random = Math.random();
    if (random > 0.8) return { status: 'excellent', score: this.randomBetween(90, 100) };
    if (random > 0.6) return { status: 'good', score: this.randomBetween(70, 89) };
    if (random > 0.3) return { status: 'fair', score: this.randomBetween(50, 69) };
    return { status: 'poor', score: this.randomBetween(20, 49) };
  }

  // Format bytes to human readable format
  formatBytes(bytes, decimals = 1) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
  }

  // Format bytes per second to speed
  formatSpeed(bytesPerSecond) {
    return this.formatBytes(bytesPerSecond) + '/s';
  }

  // Utility function for random numbers
  randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Reset all data
  resetData() {
    this.networkData = {
      totalBandwidth: { download: 0, upload: 0 },
      appUsage: new Map(),
      realTimeData: [],
      dailyStats: [],
      hourlyStats: []
    };
    this.generateBaselineData();
    this.generateHistoricalData();
  }
}

export default new NetworkMonitoringService();
