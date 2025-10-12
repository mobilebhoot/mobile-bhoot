# 🔐 Google OAuth Setup Guide for PocketShield

This guide will help you set up Google Sign-In authentication for the PocketShield app.

## 📋 Prerequisites

- Google Cloud Console account
- PocketShield app installed and running
- Android package name: `com.pocketshieldio`

## 🚀 Step 1: Create Google Cloud Project

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create a New Project**
   - Click "Select Project" → "New Project"
   - Project Name: `PocketShield Auth`
   - Click "Create"

## 🔧 Step 2: Enable Google+ API

1. **Navigate to APIs & Services**
   - In the sidebar: APIs & Services → Library
   - Search for "Google+ API"
   - Click "Enable"

2. **Enable Google Identity Services**
   - Search for "Google Identity Services API"
   - Click "Enable"

## 🔑 Step 3: Create OAuth 2.0 Credentials

### For Android:

1. **Go to Credentials**
   - APIs & Services → Credentials
   - Click "Create Credentials" → "OAuth 2.0 Client ID"

2. **Configure Android Client**
   - Application type: "Android"
   - Name: `PocketShield Android`
   - Package name: `com.pocketshieldio`

3. **Get SHA-1 Fingerprint**
   ```bash
   # For debug builds (development)
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

   # For release builds (production)
   keytool -list -v -keystore /path/to/your/release-keystore.jks -alias your-key-alias
   ```

4. **Add SHA-1 Fingerprint**
   - Copy the SHA-1 fingerprint from the command output
   - Paste it in the "SHA-1 certificate fingerprint" field
   - Click "Create"

### For iOS (if needed):

1. **Create iOS Client**
   - Application type: "iOS"
   - Name: `PocketShield iOS`
   - Bundle ID: `io.pocketshield.security`

### For Web (optional):

1. **Create Web Client**
   - Application type: "Web application"
   - Name: `PocketShield Web`
   - Authorized redirect URIs: `https://auth.expo.io/@your-expo-username/pocketshield`

## 📝 Step 4: Update App Configuration

1. **Copy Client IDs**
   - Copy your Android Client ID
   - Copy your iOS Client ID (if created)
   - Copy your Web Client ID (if created)

2. **Update authService.js**
   ```javascript
   const clientId = Platform.select({
     ios: 'YOUR_IOS_CLIENT_ID.googleusercontent.com',
     android: 'YOUR_ANDROID_CLIENT_ID.googleusercontent.com',
     web: 'YOUR_WEB_CLIENT_ID.googleusercontent.com',
     default: 'YOUR_WEB_CLIENT_ID.googleusercontent.com'
   });
   ```

3. **Replace the placeholders**:
   - `YOUR_ANDROID_CLIENT_ID` → Your actual Android Client ID
   - `YOUR_IOS_CLIENT_ID` → Your actual iOS Client ID
   - `YOUR_WEB_CLIENT_ID` → Your actual Web Client ID

## 🔄 Step 5: Rebuild the App

After updating the client IDs:

```bash
# Clean and rebuild
./build-local.sh android debug
```

## 🧪 Step 6: Test Google Sign-In

1. **Install the updated APK**
2. **Open PocketShield app**
3. **Tap "Google" button on login screen**
4. **Complete Google authentication flow**

## 🚨 Troubleshooting

### Common Issues:

1. **"Developer Error" Message**
   - **Cause**: Incorrect client ID or SHA-1 fingerprint
   - **Fix**: Double-check client ID and SHA-1 fingerprint in Google Cloud Console

2. **"Sign-in was cancelled"**
   - **Cause**: User cancelled or network issue
   - **Fix**: Try again with stable internet connection

3. **"Invalid client" Error**
   - **Cause**: Package name mismatch
   - **Fix**: Ensure package name in Google Cloud Console matches `com.pocketshieldio`

4. **"Redirect URI mismatch"**
   - **Cause**: Incorrect redirect URI configuration
   - **Fix**: Ensure app.json has correct scheme: `"scheme": "pocketshield"`

### Debug Steps:

1. **Check Logs**
   ```bash
   adb logcat | grep -i "google\|oauth\|auth"
   ```

2. **Verify Package Name**
   ```bash
   adb shell pm list packages | grep pocketshield
   ```

3. **Test with Debug Build First**
   - Always test with debug APK before release
   - Debug and release builds need different SHA-1 fingerprints

## 📋 Checklist

- [ ] Google Cloud project created
- [ ] Google+ API enabled
- [ ] Google Identity Services API enabled
- [ ] Android OAuth client created
- [ ] SHA-1 fingerprint added
- [ ] Client IDs copied to authService.js
- [ ] App rebuilt with new configuration
- [ ] Google Sign-In tested successfully

## 🔗 Useful Links

- [Google Cloud Console](https://console.cloud.google.com/)
- [Google Sign-In for Android](https://developers.google.com/identity/sign-in/android)
- [Expo AuthSession Documentation](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [SHA-1 Fingerprint Guide](https://developers.google.com/android/guides/client-auth)

---

**Note**: For demo/development purposes, the app will show a helpful error message if Google OAuth is not configured. Users can still use email/password authentication.