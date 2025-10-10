# 📱 Real Device Data Implementation Guide

This guide explains how to enable real-time scanning and device runtime access in your PocketShield mobile security app.

## 🎯 Overview

The app now supports two modes:
- **🎭 Mock Data Mode**: For emulator testing and development
- **📱 Real Device Mode**: For actual device scanning with real data

## 🔧 Configuration

### 1. Data Mode Toggle

The app automatically detects the mode based on the `USE_MOCK_DATA` flag in `src/services/DeviceDataService.js`:

```javascript
const USE_MOCK_DATA = false; // Set to true for emulator, false for real devices
```

### 2. Runtime Toggle

Users can also toggle between modes using the UI toggle in the dashboard.

## 📱 Real Device Data Access

### Supported Data Types

1. **Device Information**
   - Model, brand, OS version
   - Security status (emulator detection)
   - Battery, storage, memory levels
   - Network connectivity

2. **Contacts Data**
   - Total contacts count
   - Recent contacts analysis
   - Suspicious contact detection
   - Risk assessment

3. **App Data**
   - Installed apps list
   - Permission analysis
   - Risk assessment
   - High-risk app identification

4. **SMS Data** (Android only)
   - SMS message analysis
   - Phishing detection
   - Spam identification

5. **Call Log Data** (Android only)
   - Call history analysis
   - Suspicious number detection
   - Call pattern analysis

## 🔐 Permissions Required

### Android Permissions (app.json)

```json
{
  "android": {
    "permissions": [
      "READ_CONTACTS",
      "READ_SMS",
      "READ_CALL_LOG",
      "READ_PHONE_STATE",
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION",
      "CAMERA",
      "READ_EXTERNAL_STORAGE",
      "WRITE_EXTERNAL_STORAGE",
      "ACCESS_NETWORK_STATE",
      "INTERNET"
    ]
  }
}
```

### iOS Permissions (app.json)

```json
{
  "ios": {
    "infoPlist": {
      "NSContactsUsageDescription": "PocketShield needs contacts access to analyze communication patterns.",
      "NSCameraUsageDescription": "PocketShield needs camera access for security analysis.",
      "NSLocationWhenInUseUsageDescription": "PocketShield needs location access for network monitoring.",
      "NSPhotoLibraryUsageDescription": "PocketShield needs photo library access to scan for malicious files."
    }
  }
}
```

## 🚀 Building and Testing

### 1. Build APK for Real Device

```bash
# Build debug APK
npm run build:apk:debug

# Build release APK
npm run build:apk:release

# Install and run
npm run build:apk:debug:install
```

### 2. Debug Commands

```bash
# Check device connection
npm run debug:check

# Monitor app logs
npm run debug:logs

# Install and run app
npm run debug:install

# Check permissions
npm run debug:permissions

# Clear app data
npm run debug:clear

# Show device info
npm run debug:info
```

### 3. Manual ADB Commands

```bash
# Check connected devices
adb devices

# Install APK
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# Launch app
adb shell am start -n io.pocketshield.security/.MainActivity

# Monitor logs
adb logcat | grep -E "(PocketShield|ReactNative|Expo|DeviceDataService)"

# Check permissions
adb shell dumpsys package io.pocketshield.security | grep -E "(READ_CONTACTS|READ_SMS|READ_PHONE_STATE)"

# Clear app data
adb shell pm clear io.pocketshield.security
```

## 🔍 Debugging Real Device Data

### 1. Console Logs

The app provides detailed logging for debugging:

```javascript
console.log('🔧 DeviceDataService: Initializing...');
console.log('📱 Real data mode:', isRealDataMode);
console.log('🔐 Permissions:', DeviceDataService.getPermissionStatus());
console.log('📞 Contacts data fetched:', contactsData.total, 'contacts');
console.log('📱 Apps data generated:', appsData.total, 'apps');
```

### 2. ADB Logcat Filtering

```bash
# Filter for PocketShield logs
adb logcat | grep PocketShield

# Filter for permission-related logs
adb logcat | grep -E "(Permission|Contact|SMS|Phone)"

# Filter for device data logs
adb logcat | grep DeviceDataService
```

### 3. Permission Debugging

```bash
# Check if permissions are granted
adb shell dumpsys package io.pocketshield.security | grep -A 5 "requested permissions"

# Check runtime permissions
adb shell dumpsys package io.pocketshield.security | grep -A 10 "runtime permissions"
```

## 📊 Data Flow

### 1. Initialization

```javascript
// App.js
useEffect(() => {
  const initializeSecurity = async () => {
    await DeviceDataService.initialize();
    const initialDeviceData = await DeviceDataService.runSecurityScan();
    setDeviceData(initialDeviceData);
  };
  initializeSecurity();
}, []);
```

### 2. Real-time Scanning

```javascript
// App.js
const onRefresh = async () => {
  if (isRealDataMode) {
    const scanResults = await DeviceDataService.runSecurityScan();
    setDeviceData(scanResults);
  }
};
```

### 3. Permission Handling

```javascript
// DeviceDataService.js
async requestAllPermissions() {
  const permissionResults = {
    contacts: await this.requestContactsPermission(),
    location: await this.requestLocationPermission(),
    mediaLibrary: await this.requestMediaLibraryPermission(),
    sms: await this.requestSmsPermission(),
    phone: await this.requestPhonePermission(),
  };
  return permissionResults;
}
```

## 🛠️ Troubleshooting

### Common Issues

1. **Permissions Not Granted**
   - Check if permissions are properly declared in app.json
   - Verify permission descriptions are user-friendly
   - Test permission flow on real device

2. **Data Not Loading**
   - Check console logs for errors
   - Verify device connection
   - Ensure app is built with proper permissions

3. **Mock Data Still Showing**
   - Check `USE_MOCK_DATA` flag in DeviceDataService.js
   - Verify real device mode toggle in UI
   - Check if permissions are granted

### Debug Steps

1. **Check Device Connection**
   ```bash
   npm run debug:check
   ```

2. **Monitor Logs**
   ```bash
   npm run debug:logs
   ```

3. **Verify Permissions**
   ```bash
   npm run debug:permissions
   ```

4. **Clear and Reinstall**
   ```bash
   npm run debug:clear
   npm run debug:install
   ```

## 📈 Performance Considerations

### 1. Data Caching

The app caches scan results to avoid repeated expensive operations:

```javascript
// DeviceDataService.js
async cacheScanResults(results) {
  await AsyncStorage.setItem('lastScanResults', JSON.stringify(results));
}
```

### 2. Permission Optimization

Only request permissions when needed:

```javascript
// DeviceDataService.js
async getContactsData() {
  if (!this.permissions.contacts) {
    return this.getEmptyContactsData();
  }
  // ... fetch real data
}
```

### 3. Background Processing

Consider implementing background scanning for continuous monitoring.

## 🔒 Security Considerations

### 1. Data Privacy

- All data is processed locally on the device
- No data is sent to external servers
- User permissions are respected

### 2. Permission Management

- Permissions are requested with clear explanations
- Users can deny permissions and still use the app
- Graceful fallback to empty data when permissions are denied

### 3. Data Storage

- Scan results are cached locally using AsyncStorage
- No sensitive data is stored in plain text
- Cache can be cleared by the user

## 📝 Next Steps

1. **Implement Native Modules**: For SMS and call log access
2. **Add Background Scanning**: For continuous monitoring
3. **Enhance Risk Analysis**: More sophisticated threat detection
4. **Add Data Export**: Allow users to export their security data
5. **Implement Notifications**: Alert users to security threats

## 🎯 Testing Checklist

- [ ] App builds successfully for both debug and release
- [ ] Permissions are properly requested on real device
- [ ] Real device data is displayed correctly
- [ ] Mock data mode works for emulator testing
- [ ] Toggle between modes works in UI
- [ ] Logs show proper debugging information
- [ ] App handles permission denials gracefully
- [ ] Data is cached and persisted between app launches
