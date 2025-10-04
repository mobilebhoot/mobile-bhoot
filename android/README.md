# Android Build Configuration

This directory contains Android-specific build configurations and native code.

## Build Instructions

1. **Prerequisites**
   - Android Studio
   - Android SDK (API level 21+)
   - Java Development Kit (JDK) 11+

2. **Build Commands**
   ```bash
   # Install dependencies
   npm install
   
   # Run on Android device/emulator
   npx expo run:android
   
   # Build APK
   npx expo build:android
   
   # Build AAB (for Play Store)
   npx expo build:android --type app-bundle
   ```

3. **Permissions**
   The app requires the following Android permissions:
   - `INTERNET` - Network monitoring
   - `ACCESS_NETWORK_STATE` - Network status
   - `READ_PHONE_STATE` - Device information
   - `PACKAGE_USAGE_STATS` - App monitoring
   - `SYSTEM_ALERT_WINDOW` - Security overlays

4. **Security Features**
   - Root detection
   - Network traffic monitoring
   - App vulnerability scanning
   - Device integrity checks
   - Background security monitoring

## Native Modules

- **Device Info**: React Native Device Info
- **Network Info**: React Native NetInfo
- **Permissions**: React Native Permissions
- **Background Tasks**: Expo Background Fetch

## Configuration Files

- `app.json` - Expo configuration
- `android/app/build.gradle` - Android build settings
- `android/app/src/main/AndroidManifest.xml` - Permissions and app config 