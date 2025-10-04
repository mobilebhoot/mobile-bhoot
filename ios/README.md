# iOS Build Configuration

This directory contains iOS-specific build configurations and native code.

> **Note**: This app is primarily focused on Android development. iOS support is minimal.

## Build Instructions

1. **Prerequisites**
   - Xcode 12+
   - iOS Simulator or physical device
   - Apple Developer Account (for distribution)

2. **Build Commands**
   ```bash
   # Install dependencies
   npm install
   
   # Run on iOS simulator/device
   npx expo run:ios
   
   # Build for App Store
   npx expo build:ios
   ```

3. **iOS-Specific Features**
   - Jailbreak detection
   - Device Check API integration
   - iOS-specific security monitoring

## Configuration Files

- `app.json` - Expo configuration
- `ios/Podfile` - CocoaPods dependencies
- `ios/Info.plist` - iOS app configuration 