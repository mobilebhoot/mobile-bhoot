# 🚀 Quick Google OAuth Setup for PocketShield (Expo)

## 📱 For Expo Development (Easiest - No SHA-1 Needed!)

Since you're using **expo-auth-session**, you can use the **Web-based OAuth flow** which doesn't require SHA-1 fingerprints.

### Option 1: Web OAuth Client (Recommended for Expo)

1. **Go to Google Cloud Console**:
   - Visit: https://console.cloud.google.com/apis/credentials
   - Create a project (or select existing)

2. **Create Web Application Credentials**:
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Application type: **Web application**
   - Name: `PocketShield Web OAuth`

3. **Add Authorized Redirect URIs**:
   ```
   https://auth.expo.io/@suresh_seema/pocketshield
   http://localhost:19000
   exp://localhost:19000
   ```

4. **Copy the Client ID**:
   - It will look like: `XXXXXX.apps.googleusercontent.com`
   - Copy this entire string

5. **Update Your App**:
   Open `src/screens/AuthenticationScreen.js` and replace line 46:
   ```javascript
   // OLD:
   clientId: '1050104985553-24kvh48331qqrvotuasmj3qr9fhf6mmf.apps.googleusercontent.com',
   
   // NEW:
   clientId: 'YOUR_NEW_CLIENT_ID.apps.googleusercontent.com',
   ```

6. **Restart the App**:
   ```bash
   cd /Users/suresh.s/workspace/personal/mobile-bhoot
   npx expo start --clear
   ```

---

## 🤖 For Native Android Build (Requires SHA-1)

If you plan to build a standalone Android APK, you'll need SHA-1 fingerprint.

### Step 1: Check if Debug Keystore Exists

```bash
ls -la ~/.android/debug.keystore
```

If it **doesn't exist**, create it:

```bash
mkdir -p ~/.android
keytool -genkey -v -keystore ~/.android/debug.keystore \
  -storepass android -alias androiddebugkey -keypass android \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=Android Debug,O=Android,C=US"
```

### Step 2: Get SHA-1 Fingerprint

```bash
keytool -list -v -keystore ~/.android/debug.keystore \
  -alias androiddebugkey -storepass android -keypass android | \
  grep SHA1
```

**Expected Output**:
```
SHA1: A1:B2:C3:D4:E5:F6:G7:H8:I9:J0:K1:L2:M3:N4:O5:P6:Q7:R8:S9:T0
```

### Step 3: Add to Google Cloud Console

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click "Create Credentials" → "OAuth 2.0 Client ID"
3. Application type: **Android**
4. Name: `PocketShield Android`
5. Package name: `com.pocketshieldio`
6. SHA-1 certificate fingerprint: `[paste the SHA-1 from step 2]`
7. Click "Create"

### Step 4: Update App with Android Client ID

```javascript
// In src/screens/AuthenticationScreen.js
androidClientId: 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com',
```

---

## 🧪 Testing Without Google OAuth Setup

Your app already has a **"Skip Login (Testing)"** button that works perfectly without any Google OAuth configuration!

Just click that button to access all features while you're setting up Google OAuth.

---

## ✅ Quick Test

### Test with Skip Login (Works Now):
1. Run the app
2. Click "Skip Login (Testing)"
3. You're in! ✅

### Test with Google (After Setup):
1. Run the app
2. Click "Continue with Google"
3. Sign in with your Google account
4. You're in! ✅

---

## 🔍 Current Status Check

Your current Client ID in the code:
```
1050104985553-24kvh48331qqrvotuasmj3qr9fhf6mmf.apps.googleusercontent.com
```

**To check if this is valid**:
1. Go to: https://console.cloud.google.com/apis/credentials
2. Look for this Client ID
3. If you find it, check:
   - ✅ Is it enabled?
   - ✅ Are redirect URIs configured?
   - ✅ Is OAuth consent screen configured?

If you **don't find it** or it belongs to someone else, create a **new one** following Option 1 above.

---

## 🚨 Common Issues

### "The app has been blocked"
- **Cause**: OAuth consent screen not configured or in "Testing" mode
- **Fix**: Go to OAuth consent screen → Add your email as a test user

### "Invalid client"
- **Cause**: Wrong Client ID or not configured for your package
- **Fix**: Double-check Client ID matches what's in Google Cloud Console

### "Redirect URI mismatch"
- **Cause**: Missing redirect URI in Google Cloud Console
- **Fix**: Add `https://auth.expo.io/@suresh_seema/pocketshield`

---

## 📝 Summary: What You Actually Need

For **Expo Development** (what you're doing now):
- ✅ Web OAuth Client ID
- ✅ Redirect URIs configured
- ❌ SHA-1 fingerprint (NOT needed for Expo!)

For **Standalone APK** (future):
- ✅ Android OAuth Client ID  
- ✅ SHA-1 fingerprint
- ✅ Package name: `com.pocketshieldio`

---

## 🎯 Recommended Next Steps

1. **For Now**: Use "Skip Login (Testing)" button → App works!
2. **Later**: Set up Web OAuth (5 minutes) → Google login works!
3. **Much Later**: Set up Android OAuth + SHA-1 → Native APK Google login works!

---

**Quick Command to Start the App:**
```bash
cd /Users/suresh.s/workspace/personal/mobile-bhoot
npx expo start --clear
```

Then use **"Skip Login (Testing)"** to access all features! 🎉

