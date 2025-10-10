import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { LineChart, BarChart, PieChart, ProgressChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

// Beautiful Metric Panel Component
export const MetricPanel = ({ 
  title, 
  value, 
  subtitle, 
  icon, 
  color, 
  trend, 
  trendValue,
  onPress,
  size = 'medium' 
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { padding: 12, iconSize: 20, titleSize: 12, valueSize: 18 };
      case 'large':
        return { padding: 20, iconSize: 32, titleSize: 16, valueSize: 32 };
      default:
        return { padding: 16, iconSize: 24, titleSize: 14, valueSize: 24 };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <Animatable.View
      animation="fadeInUp"
      duration={600}
      style={[
        styles.metricPanel,
        { 
          borderLeftColor: color,
          padding: sizeStyles.padding,
        }
      ]}
    >
      <Animated.View
        style={[
          styles.metricContent,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <TouchableOpacity onPress={onPress} style={styles.metricTouchable}>
          <View style={styles.metricHeader}>
            <View style={styles.metricIconContainer}>
              <Ionicons 
                name={icon} 
                size={sizeStyles.iconSize} 
                color={color} 
              />
            </View>
            <View style={styles.metricInfo}>
              <Text style={[styles.metricTitle, { fontSize: sizeStyles.titleSize }]}>
                {title}
              </Text>
              {trend && (
                <View style={[styles.trendContainer, { backgroundColor: trend > 0 ? '#4CAF50' : '#F44336' }]}>
                  <Ionicons 
                    name={trend > 0 ? 'trending-up' : 'trending-down'} 
                    size={12} 
                    color="#fff" 
                  />
                  <Text style={styles.trendText}>
                    {Math.abs(trendValue || trend)}%
                  </Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.metricValueContainer}>
            <Text style={[styles.metricValue, { fontSize: sizeStyles.valueSize, color }]}>
              {value}
            </Text>
            {subtitle && (
              <Text style={styles.metricSubtitle}>{subtitle}</Text>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    </Animatable.View>
  );
};

// Beautiful Chart Panel Component
export const ChartPanel = ({ 
  title, 
  children, 
  height = 200, 
  onRefresh,
  onSettings,
  loading = false 
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (onRefresh) {
      await onRefresh();
    }
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <Animatable.View 
      animation="fadeInUp" 
      duration={800}
      style={[styles.chartPanel, { height }]}
    >
      <LinearGradient
        colors={['#2a2a3e', '#1a1a2e']}
        style={styles.chartGradient}
      >
        <View style={styles.panelHeader}>
          <View style={styles.panelTitleContainer}>
            <Text style={styles.panelTitle}>{title}</Text>
            {loading && (
              <View style={styles.loadingIndicator}>
                <Animatable.View
                  animation="rotate"
                  iterationCount="infinite"
                  duration={1000}
                >
                  <Ionicons name="refresh" size={16} color="#4CAF50" />
                </Animatable.View>
              </View>
            )}
          </View>
          <View style={styles.panelActions}>
            <TouchableOpacity 
              style={styles.panelAction}
              onPress={handleRefresh}
              disabled={isRefreshing}
            >
              <Animatable.View
                animation={isRefreshing ? "rotate" : undefined}
                iterationCount={isRefreshing ? "infinite" : 1}
                duration={1000}
              >
                <Ionicons name="refresh" size={16} color="#4CAF50" />
              </Animatable.View>
            </TouchableOpacity>
            {onSettings && (
              <TouchableOpacity 
                style={styles.panelAction}
                onPress={onSettings}
              >
                <Ionicons name="settings" size={16} color="#666" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.panelAction}>
              <Ionicons name="ellipsis-horizontal" size={16} color="#666" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.panelContent}>
          {children}
        </View>
      </LinearGradient>
    </Animatable.View>
  );
};

// Beautiful Line Chart Component
export const LineChartPanel = ({ 
  title, 
  data, 
  height = 200, 
  color = '#4CAF50',
  showDots = true,
  showGrid = true,
  onRefresh 
}) => {
  const chartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: 'transparent',
    backgroundGradientTo: 'transparent',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: showDots ? '4' : '0',
      strokeWidth: '2',
      stroke: color,
    },
    propsForBackgroundLines: {
      strokeDasharray: showGrid ? '5,5' : '0',
      stroke: '#333',
    },
  };

  return (
    <ChartPanel title={title} height={height} onRefresh={onRefresh}>
      <LineChart
        data={data}
        width={width - 80}
        height={height - 80}
        chartConfig={chartConfig}
        bezier
        style={styles.chart}
        withInnerLines={showGrid}
        withOuterLines={showGrid}
      />
    </ChartPanel>
  );
};

// Beautiful Bar Chart Component
export const BarChartPanel = ({ 
  title, 
  data, 
  height = 200, 
  color = '#2196F3',
  onRefresh 
}) => {
  const chartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: 'transparent',
    backgroundGradientTo: 'transparent',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: {
      borderRadius: 16,
    },
  };

  return (
    <ChartPanel title={title} height={height} onRefresh={onRefresh}>
      <BarChart
        data={data}
        width={width - 80}
        height={height - 80}
        chartConfig={chartConfig}
        style={styles.chart}
        fromZero
      />
    </ChartPanel>
  );
};

// Beautiful Pie Chart Component
export const PieChartPanel = ({ 
  title, 
  data, 
  height = 200, 
  onRefresh 
}) => {
  const chartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: 'transparent',
    backgroundGradientTo: 'transparent',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: {
      borderRadius: 16,
    },
  };

  return (
    <ChartPanel title={title} height={height} onRefresh={onRefresh}>
      <PieChart
        data={data}
        width={width - 80}
        height={height - 80}
        chartConfig={chartConfig}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="15"
        absolute
      />
    </ChartPanel>
  );
};

// Beautiful Progress Chart Component
export const ProgressChartPanel = ({ 
  title, 
  data, 
  height = 200, 
  onRefresh 
}) => {
  const chartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: 'transparent',
    backgroundGradientTo: 'transparent',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: {
      borderRadius: 16,
    },
  };

  return (
    <ChartPanel title={title} height={height} onRefresh={onRefresh}>
      <ProgressChart
        data={data}
        width={width - 80}
        height={height - 80}
        strokeWidth={8}
        radius={32}
        chartConfig={chartConfig}
        hideLegend={false}
      />
    </ChartPanel>
  );
};

// Beautiful Alert Panel Component
export const AlertPanel = ({ 
  title, 
  alerts = [], 
  onViewAll,
  maxItems = 5 
}) => {
  const [expanded, setExpanded] = useState(false);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#F44336';
      case 'high': return '#FF5722';
      case 'medium': return '#FF9800';
      case 'low': return '#4CAF50';
      default: return '#666';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return 'warning';
      case 'high': return 'alert-circle';
      case 'medium': return 'information-circle';
      case 'low': return 'checkmark-circle';
      default: return 'help-circle';
    }
  };

  const displayAlerts = expanded ? alerts : alerts.slice(0, maxItems);

  return (
    <Animatable.View 
      animation="fadeInUp" 
      duration={1000}
      style={styles.alertPanel}
    >
      <LinearGradient
        colors={['#2a2a3e', '#1a1a2e']}
        style={styles.alertGradient}
      >
        <View style={styles.panelHeader}>
          <View style={styles.panelTitleContainer}>
            <Text style={styles.panelTitle}>{title}</Text>
            {alerts.length > 0 && (
              <View style={styles.alertBadge}>
                <Text style={styles.alertBadgeText}>{alerts.length}</Text>
              </View>
            )}
          </View>
          {alerts.length > maxItems && (
            <TouchableOpacity 
              style={styles.expandButton}
              onPress={() => setExpanded(!expanded)}
            >
              <Ionicons 
                name={expanded ? "chevron-up" : "chevron-down"} 
                size={16} 
                color="#4CAF50" 
              />
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.alertsList}>
          {displayAlerts.map((alert, index) => (
            <Animatable.View
              key={alert.id}
              animation="fadeInUp"
              duration={600}
              delay={index * 100}
              style={[
                styles.alertItem,
                { borderLeftColor: getSeverityColor(alert.severity) }
              ]}
            >
              <Ionicons 
                name={getSeverityIcon(alert.severity)} 
                size={16} 
                color={getSeverityColor(alert.severity)} 
              />
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>{alert.title}</Text>
                <Text style={styles.alertDescription}>{alert.description}</Text>
                <Text style={styles.alertTime}>{alert.timestamp}</Text>
              </View>
              <TouchableOpacity style={styles.alertAction}>
                <Ionicons name="chevron-forward" size={16} color="#666" />
              </TouchableOpacity>
            </Animatable.View>
          ))}
          
          {alerts.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
              <Text style={styles.emptyText}>All Clear!</Text>
              <Text style={styles.emptySubtext}>No active alerts</Text>
            </View>
          )}
        </View>
        
        {onViewAll && alerts.length > 0 && (
          <TouchableOpacity style={styles.viewAllButton} onPress={onViewAll}>
            <Text style={styles.viewAllText}>View All Alerts</Text>
            <Ionicons name="arrow-forward" size={16} color="#4CAF50" />
          </TouchableOpacity>
        )}
      </LinearGradient>
    </Animatable.View>
  );
};

// Beautiful Status Panel Component
export const StatusPanel = ({ 
  title, 
  status, 
  details = [],
  onRefresh 
}) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return '#4CAF50';
      case 'warning': return '#FF9800';
      case 'error': return '#F44336';
      case 'offline': return '#666';
      default: return '#2196F3';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online': return 'checkmark-circle';
      case 'warning': return 'warning';
      case 'error': return 'close-circle';
      case 'offline': return 'pause-circle';
      default: return 'help-circle';
    }
  };

  return (
    <Animatable.View 
      animation="fadeInUp" 
      duration={800}
      style={styles.statusPanel}
    >
      <LinearGradient
        colors={['#2a2a3e', '#1a1a2e']}
        style={styles.statusGradient}
      >
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>{title}</Text>
          <View style={styles.statusIndicator}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(status) }]}>
              {status.toUpperCase()}
            </Text>
          </View>
        </View>
        
        <View style={styles.statusContent}>
          <View style={styles.statusIconContainer}>
            <Ionicons 
              name={getStatusIcon(status)} 
              size={32} 
              color={getStatusColor(status)} 
            />
          </View>
          
          <View style={styles.statusDetails}>
            {details.map((detail, index) => (
              <View key={index} style={styles.statusDetail}>
                <Text style={styles.statusDetailLabel}>{detail.label}</Text>
                <Text style={styles.statusDetailValue}>{detail.value}</Text>
              </View>
            ))}
          </View>
        </View>
        
        {onRefresh && (
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Ionicons name="refresh" size={16} color="#4CAF50" />
            <Text style={styles.refreshText}>Refresh Status</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>
    </Animatable.View>
  );
};

const styles = StyleSheet.create({
  // Metric Panel Styles
  metricPanel: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  metricContent: {
    flex: 1,
  },
  metricTouchable: {
    flex: 1,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  metricInfo: {
    flex: 1,
  },
  metricTitle: {
    color: '#ccc',
    fontWeight: '500',
    marginBottom: 4,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  trendText: {
    fontSize: 10,
    color: '#fff',
    marginLeft: 2,
    fontWeight: 'bold',
  },
  metricValueContainer: {
    alignItems: 'flex-start',
  },
  metricValue: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricSubtitle: {
    fontSize: 10,
    color: '#666',
  },

  // Chart Panel Styles
  chartPanel: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  chartGradient: {
    flex: 1,
    borderRadius: 12,
    padding: 15,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  panelTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  loadingIndicator: {
    marginLeft: 8,
  },
  panelActions: {
    flexDirection: 'row',
  },
  panelAction: {
    padding: 8,
    marginLeft: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },

  // Alert Panel Styles
  alertPanel: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  alertGradient: {
    borderRadius: 12,
    padding: 15,
  },
  alertBadge: {
    backgroundColor: '#F44336',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  alertBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  expandButton: {
    padding: 4,
  },
  alertsList: {
    marginTop: 10,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    borderLeftWidth: 3,
    paddingLeft: 15,
  },
  alertContent: {
    flex: 1,
    marginLeft: 12,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  alertDescription: {
    fontSize: 12,
    color: '#ccc',
    marginBottom: 2,
  },
  alertTime: {
    fontSize: 10,
    color: '#666',
  },
  alertAction: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
    marginTop: 10,
  },
  viewAllText: {
    color: '#4CAF50',
    fontWeight: 'bold',
    marginRight: 8,
  },

  // Status Panel Styles
  statusPanel: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  statusGradient: {
    borderRadius: 12,
    padding: 15,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
  },
  statusIconContainer: {
    marginRight: 20,
  },
  statusDetails: {
    flex: 1,
  },
  statusDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusDetailLabel: {
    fontSize: 12,
    color: '#ccc',
  },
  statusDetailValue: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#333',
    marginTop: 15,
  },
  refreshText: {
    color: '#4CAF50',
    fontWeight: 'bold',
    marginLeft: 8,
  },

  // Chart Styles
  chart: {
    borderRadius: 8,
  },
});
