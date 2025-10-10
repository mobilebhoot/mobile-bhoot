export default ({ config }) => ({
  ...config,
  name: 'PocketShield.io',
  slug: 'pocketshieldai',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#1a1a2e'
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'io.pocketshield.security',
    buildNumber: '1.0.0',
    infoPlist: {
      NSLocationWhenInUseUsageDescription: 'PocketShield.io needs location access for network security monitoring.',
      NSCameraUsageDescription: 'PocketShield.io needs camera access for QR code scanning and security analysis.',
      NSMicrophoneUsageDescription: 'PocketShield.io needs microphone access for voice commands and security monitoring.',
      NSContactsUsageDescription: 'PocketShield.io needs contacts access to analyze communication patterns and detect security risks.',
      NSPhotoLibraryUsageDescription: 'PocketShield.io needs photo library access to scan for malicious files.',
      NSFaceIDUsageDescription: 'PocketShield.io uses Face ID for secure authentication.',
      NSCalendarsUsageDescription: 'PocketShield.io needs calendar access to monitor suspicious scheduling patterns.',
      NSRemindersUsageDescription: 'PocketShield.io needs reminders access for security alerts.',
      UIBackgroundModes: ['background-processing', 'background-fetch']
    }
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#1a1a2e'
    },
    package: 'io.pocketshield.security',
    versionCode: 1,
    permissions: [
      'INTERNET',
      'ACCESS_NETWORK_STATE',
      'READ_PHONE_STATE',
      'PACKAGE_USAGE_STATS',
      'SYSTEM_ALERT_WINDOW',
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'CAMERA',
      'RECORD_AUDIO',
      'READ_EXTERNAL_STORAGE',
      'WRITE_EXTERNAL_STORAGE',
      'READ_CONTACTS',
      'READ_SMS',
      'READ_CALL_LOG',
      'WRITE_CONTACTS',
      'SEND_SMS',
      'READ_PHONE_NUMBERS',
      'ACCESS_WIFI_STATE',
      'CHANGE_WIFI_STATE',
      'VIBRATE',
      'WAKE_LOCK',
      'FOREGROUND_SERVICE',
      'RECEIVE_BOOT_COMPLETED'
    ],
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          {
            scheme: 'pocketshield'
          }
        ],
        category: ['BROWSABLE', 'DEFAULT']
      }
    ]
  },
  plugins: [
    'expo-media-library',
    'expo-file-system',
    'expo-location',
    'expo-contacts',
    'expo-dev-client',
    [
      'expo-build-properties',
      {
        android: {
          compileSdkVersion: 34,
          targetSdkVersion: 34,
          minSdkVersion: 21
        },
        ios: {
          deploymentTarget: '13.0'
        }
      }
    ]
  ],
  owner: 'jyothikumar',
  description: 'Advanced Android security monitoring and threat detection app',
  keywords: [
    'security',
    'android',
    'threat-detection',
    'vulnerability-scanning',
    'network-monitoring',
    'pocketshield'
  ],
  primaryColor: '#4CAF50',
  backgroundColor: '#1a1a2e',
  extra: {
    eas: {
      projectId: 'b9d04c3e-e814-408d-8445-da342b62e21d'
    }
  }
});
