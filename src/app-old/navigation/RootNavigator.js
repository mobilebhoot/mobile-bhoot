import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Import screens
import AuthScreen from '../../screens/AuthScreen';
import DashboardScreen from '../../screens/DashboardScreen';
import VulnerabilityScreen from '../../screens/VulnerabilityScreen';
import NetworkTrafficScreen from '../../screens/NetworkTrafficScreen';
import AppMonitorScreen from '../../screens/AppMonitorScreen';
import SettingsScreen from '../../screens/SettingsScreen';
import SecurityReportScreen from '../../screens/SecurityReportScreen';
import AIChatScreen from '../../screens/AIChatScreen';
import ScanScreen from '../../screens/ScanScreen';
import AlertsScreen from '../../screens/AlertsScreen';

// Import components
import TabBarIcon from '../../components/TabBarIcon';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'shield-checkmark' : 'shield-checkmark-outline';
          } else if (route.name === 'Scan') {
            iconName = focused ? 'scan' : 'scan-outline';
          } else if (route.name === 'Alerts') {
            iconName = focused ? 'warning' : 'warning-outline';
          } else if (route.name === 'Network') {
            iconName = focused ? 'globe' : 'globe-outline';
          } else if (route.name === 'Apps') {
            iconName = focused ? 'apps' : 'apps-outline';
          } else if (route.name === 'AI Chat') {
            iconName = focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline';
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
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{ title: 'Security Dashboard' }}
      />
      <Tab.Screen 
        name="Scan" 
        component={ScanScreen}
        options={{ title: 'Security Scanner' }}
      />
      <Tab.Screen 
        name="Alerts" 
        component={AlertsScreen}
        options={{ title: 'Security Alerts' }}
      />
      <Tab.Screen 
        name="Network" 
        component={NetworkTrafficScreen}
        options={{ title: 'Network Traffic' }}
      />
      <Tab.Screen 
        name="Apps" 
        component={AppMonitorScreen}
        options={{ title: 'App Monitor' }}
      />
      <Tab.Screen 
        name="AI Chat" 
        component={AIChatScreen}
        options={{ title: 'AI Assistant' }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Auth"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1a1a2e',
            borderBottomColor: '#333',
            borderBottomWidth: 1,
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="Auth" 
          component={AuthScreen}
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
      </Stack.Navigator>
    </NavigationContainer>
  );
} 