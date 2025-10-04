# Fastlane Configuration

Fastlane automates the deployment process for Android and iOS apps.

## Setup

1. **Install Fastlane**
   ```bash
   gem install fastlane
   ```

2. **Initialize Fastlane**
   ```bash
   fastlane init
   ```

## Android Deployment

### Google Play Store

1. **Setup Google Play Console**
   - Create a service account
   - Download JSON key file
   - Place in `fastlane/android/google-play-key.json`

2. **Deploy to Play Store**
   ```bash
   fastlane android deploy
   ```

### Internal Testing

```bash
fastlane android internal
```

## iOS Deployment

### App Store Connect

1. **Setup App Store Connect**
   - Create app in App Store Connect
   - Setup certificates and provisioning profiles

2. **Deploy to App Store**
   ```bash
   fastlane ios deploy
   ```

### TestFlight

```bash
fastlane ios beta
```

## Configuration Files

- `fastlane/Appfile` - App configuration
- `fastlane/Fastfile` - Lane definitions
- `fastlane/Pluginfile` - Fastlane plugins

## Lanes

### Android
- `android build` - Build APK/AAB
- `android internal` - Deploy to internal testing
- `android deploy` - Deploy to Play Store

### iOS
- `ios build` - Build IPA
- `ios beta` - Deploy to TestFlight
- `ios deploy` - Deploy to App Store

## Environment Variables

```bash
# Android
GOOGLE_PLAY_KEY_PATH=fastlane/android/google-play-key.json
GOOGLE_PLAY_PACKAGE_NAME=com.yourcompany.securityapp

# iOS
APP_STORE_CONNECT_API_KEY_PATH=fastlane/ios/app-store-connect-api-key.json
APP_STORE_CONNECT_APP_ID=1234567890
``` 