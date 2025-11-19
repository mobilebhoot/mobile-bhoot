import 'react-native-url-polyfill/auto';
import React from 'react';
import { AppRegistry } from 'react-native';
import { useTranslation } from 'react-i18next';

// Initialize i18n
import './src/i18n/i18n';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';

// Import screens
import AuthenticationScreen from './src/screens/AuthenticationScreen';
import MobileAuthScreen from './src/screens/MobileAuthScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import VulnerabilityScreen from './src/screens/VulnerabilityScreen';
import NetworkTrafficScreen from './src/screens/NetworkTrafficScreen';
import AppMonitorScreen from './src/screens/AppMonitorScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SecurityReportScreen from './src/screens/SecurityReportScreen';
import EnhancedLinkScannerScreen from './src/screens/EnhancedLinkScannerScreen';
import UltimateSecurityScreen from './src/screens/UltimateSecurityScreen';
import EnhancedQRScannerScreen from './src/screens/EnhancedQRScannerScreen';
import FileSecurityScreen from './src/screens/FileSecurityScreen';
import FilesystemScanScreen from './src/screens/FilesystemScanScreen';
import BreachDetectionScreen from './src/screens/BreachDetectionScreen';
import SecurityComplianceScreen from './src/screens/SecurityComplianceScreen';
import PrivacyPolicyScreen from './src/screens/PrivacyPolicyScreen';

// Import components
import TabBarIcon from './src/components/TabBarIcon';
import { SecurityProvider } from './src/state/SecurityProvider';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Home button component for all screens - always goes to Dashboard
const HomeButton = ({ navigation }) => {
  const handleHome = () => {
    // Navigate to Main stack and then to Dashboard tab
    try {
      // If we're in the Main navigator, navigate to Dashboard tab
      navigation.navigate('Dashboard');
    } catch (error) {
      // If we're in a Stack screen, navigate to Main first, then Dashboard
      try {
        navigation.navigate('Main', { screen: 'Dashboard' });
      } catch (err) {
        console.warn('Navigation to home failed:', err);
      }
    }
  };

  return (
    <TouchableOpacity
      onPress={handleHome}
      style={{
        marginLeft: 15,
        padding: 5,
      }}
    >
      <Ionicons name="home" size={24} color="#fff" />
    </TouchableOpacity>
  );
};

function TabNavigator() {
  const { t } = useTranslation();
  
  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => {
        // Get translated title for each route
        const getTitle = (routeName) => {
          switch (routeName) {
            case 'Dashboard': return t('navigation.dashboard');
            case 'Deep Scan': return t('navigation.deepScan');
            case 'App Scan': return t('navigation.appScan');
            case 'URL Guard': return t('navigation.urlGuard');
            case 'Network': return t('navigation.network');
            case 'Settings': return t('navigation.settings');
            default: return routeName;
          }
        };

        return {
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'shield-checkmark' : 'shield-checkmark-outline';
          } else if (route.name === 'Deep Scan') {
            iconName = focused ? 'scan' : 'scan-outline';
          } else if (route.name === 'App Scan') {
            iconName = focused ? 'apps' : 'apps-outline';
          } else if (route.name === 'URL Guard') {
            iconName = focused ? 'shield' : 'shield-outline';
          } else if (route.name === 'Network') {
            iconName = focused ? 'globe' : 'globe-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <TabBarIcon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: {
          backgroundColor: '#1a1a2e',
          borderTopColor: '#333',
          borderTopWidth: 1,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerStyle: {
          backgroundColor: '#1a1a2e',
          borderBottomColor: '#333',
          borderBottomWidth: 1,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerLeft: (props) => <HomeButton navigation={navigation} />,
        title: getTitle(route.name),
      };
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
      />
      <Tab.Screen 
        name="Deep Scan" 
        component={VulnerabilityScreen}
      />
      <Tab.Screen 
        name="App Scan" 
        component={AppMonitorScreen}
      />
      <Tab.Screen 
        name="URL Guard" 
        component={UltimateSecurityScreen}
      />
      <Tab.Screen 
        name="Network" 
        component={NetworkTrafficScreen}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SecurityProvider>
          <NavigationContainer>
            <Stack.Navigator
              initialRouteName="Auth"
              screenOptions={({ navigation }) => ({
                headerStyle: {
                  backgroundColor: '#1a1a2e',
                  borderBottomColor: '#333',
                  borderBottomWidth: 1,
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
                headerLeft: (props) => <HomeButton navigation={navigation} />,
              })}
            >
              <Stack.Screen 
                name="Auth" 
                component={AuthenticationScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen 
                name="MobileAuth" 
                component={MobileAuthScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen 
                name="Main" 
                component={TabNavigator}
                options={{ headerShown: false }}
              />
              <Stack.Screen 
                name="SecurityReport" 
                component={SecurityReportScreen}
                options={{ title: 'Security Report' }}
              />
              <Stack.Screen 
                name="QRScanner" 
                component={EnhancedQRScannerScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen 
                name="SecurityCenter" 
                component={UltimateSecurityScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen 
                name="FileSecurity" 
                component={FileSecurityScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen 
                name="FilesystemScan" 
                component={FilesystemScanScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen 
                name="BreachDetection" 
                component={BreachDetectionScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen 
                name="EnhancedQRScanner" 
                component={EnhancedQRScannerScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen 
                name="SecurityCompliance" 
                component={SecurityComplianceScreen}
                options={{ title: 'Security Compliance' }}
              />
              <Stack.Screen 
                name="PrivacyPolicy" 
                component={PrivacyPolicyScreen}
                options={{ title: 'Privacy Policy' }}
              />
            </Stack.Navigator>
          </NavigationContainer>
          <Toast />
        </SecurityProvider>
      </SafeAreaProvider>
      <StatusBar style="light" />
    </GestureHandlerRootView>
  );
}

// Register the main component
AppRegistry.registerComponent('main', () => App); 