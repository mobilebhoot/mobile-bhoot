# PocketShield.io 🔒

Advanced Android security monitoring and threat detection app with AI-powered analysis.

## 🚀 Features

### Core Security Features
- **Real-time Threat Detection** - Monitor device for security vulnerabilities
- **Network Traffic Analysis** - Deep dive into network connections with AI insights
- **Root/Jailbreak Detection** - Detect compromised device states
- **App Vulnerability Scanning** - Identify risky applications and permissions
- **Background Security Monitoring** - Continuous protection even when app is closed

### AI-Powered Analysis
- **Interactive AI Chat** - Ask security questions and get intelligent responses
- **Smart Recommendations** - AI-driven security improvement suggestions
- **Threat Intelligence** - Advanced threat detection and analysis
- **Risk Scoring** - Comprehensive security score calculation

### User Experience
- **Modern Dark UI** - Beautiful, intuitive interface
- **Real-time Alerts** - Instant notifications for security issues
- **Detailed Reports** - Comprehensive security analysis
- **Authentication System** - Secure sign-in/sign-up with social options

## 📱 Screenshots

- **Dashboard** - Overview of device security status
- **Security Scanner** - Comprehensive vulnerability scanning
- **Alerts** - Real-time security notifications
- **Network Traffic** - Deep dive network analysis
- **AI Chat** - Interactive security assistant
- **Settings** - App configuration and preferences

## 🛠️ Tech Stack

- **React Native** - Cross-platform mobile development
- **Expo** - Development platform and tools
- **React Navigation** - Screen navigation
- **React Native Device Info** - Device information
- **React Native NetInfo** - Network monitoring
- **React Native Permissions** - Permission management
- **Expo Background Fetch** - Background tasks
- **React Native Chart Kit** - Data visualization

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Android Studio (for Android development)
- Android SDK (API level 21+)
- Java Development Kit (JDK) 11+

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/pocketshield/pocketshield-io.git
   cd pocketshield-io
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Run on Android device/emulator**
   ```bash
   npm run android
   ```

## 🏗️ Project Structure

```
pocketshield-io/
├── src/
│   ├── app/
│   │   ├── navigation/
│   │   │   ├── RootNavigator.js
│   │   │   └── types.js
│   │   ├── theme/
│   │   │   └── index.js
│   │   └── App.js
│   ├── components/
│   │   ├── RiskGauge.js
│   │   ├── StatusCard.js
│   │   └── ListItem.js
│   ├── screens/
│   │   ├── AuthScreen.js
│   │   ├── DashboardScreen.js
│   │   ├── ScanScreen.js
│   │   ├── AlertsScreen.js
│   │   ├── NetworkTrafficScreen.js
│   │   ├── AppMonitorScreen.js
│   │   ├── AIChatScreen.js
│   │   └── SettingsScreen.js
│   ├── state/
│   │   └── SecurityProvider.js
│   ├── services/
│   │   ├── background.js
│   │   ├── networking.js
│   │   └── riskScore.js
│   ├── modules/
│   │   ├── detections/
│   │   │   ├── index.js
│   │   │   ├── detectRoot.js
│   │   │   ├── detectJailbreak.js
│   │   │   ├── detectCertificateIssues.js
│   │   │   └── detectInsecureWifi.js
│   │   └── attestation/
│   │       ├── androidPlayIntegrity.js
│   │       └── iosDeviceCheck.js
│   └── utils/
│       └── formatting.js
├── android/
├── ios/
├── .github/
├── fastlane/
├── assets/
├── app.json
└── package.json
```

## 🔧 Configuration

### Android Permissions
The app requires the following Android permissions:
- `INTERNET` - Network monitoring
- `ACCESS_NETWORK_STATE` - Network status
- `READ_PHONE_STATE` - Device information
- `PACKAGE_USAGE_STATS` - App monitoring
- `SYSTEM_ALERT_WINDOW` - Security overlays

### Environment Variables
Create a `.env` file in the root directory:
```bash
# API Configuration
API_BASE_URL=https://api.pocketshield.io
API_KEY=your_api_key_here

# Security Configuration
ENCRYPTION_KEY=your_encryption_key
SECURITY_LEVEL=high

# Analytics
ANALYTICS_ENABLED=true
CRASH_REPORTING_ENABLED=true
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run linting
npm run lint

# Run type checking
npm run type-check
```

## 📦 Building

### Android
```bash
# Build APK
npm run build:android

# Build AAB (for Play Store)
npx expo build:android --type app-bundle
```

### iOS
```bash
# Build for iOS
npm run build:ios
```

## 🚀 Deployment

### Google Play Store
1. Create a Google Play Console account
2. Upload the AAB file
3. Configure store listing
4. Submit for review

### App Store
1. Create an App Store Connect account
2. Upload the IPA file
3. Configure app metadata
4. Submit for review

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [https://docs.pocketshield.io](https://docs.pocketshield.io)
- **Website**: [https://pocketshield.io](https://pocketshield.io)
- **Email**: support@pocketshield.io
- **Discord**: [https://discord.gg/pocketshield](https://discord.gg/pocketshield)

## 🙏 Acknowledgments

- React Native community
- Expo team
- Security researchers
- Open source contributors

---

**PocketShield.io** - Your Android device's security guardian 🛡️ 