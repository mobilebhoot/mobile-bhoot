# 🔗 Correct Redirect URIs for Your OAuth Setup

## ✅ Your Configuration

Based on your `app.json`:
- **Expo Owner**: `suresh_seema`
- **Project Slug**: `pocketshield`
- **App Name in Google Cloud**: `test-app` (just a label, doesn't affect functionality)
- **Client ID**: `133932633311-3q2a81jf7qijsqklh7mbgpbhtv7h7rkc.apps.googleusercontent.com`

---

## 📋 Add These Redirect URIs to Google Cloud Console

Go to: https://console.cloud.google.com/apis/credentials?project=amp-sandbox-e328

Click on your "test-app" OAuth client and add **ALL** of these redirect URIs:

### For Expo Go (Development):
```
https://auth.expo.io/@suresh_seema/pocketshield
https://auth.expo.io/@suresh_seema/pocketshield/
```

### For Localhost (Development):
```
http://localhost:19000
http://localhost:19000/
http://localhost:8081
http://localhost:8081/
http://localhost:8082
http://localhost:8082/
```

### For Expo Protocol:
```
exp://localhost:19000
exp://localhost:19000/
exp://localhost:8081
exp://localhost:8081/
exp://localhost:8082
exp://localhost:8082/
```

### For Custom Scheme (Standalone App):
```
pocketshield://
pocketshield://oauth
pocketshield://oauth/
```

---

## 🎯 Step-by-Step Instructions

### 1. Open Your OAuth Client

1. Go to: https://console.cloud.google.com/apis/credentials?project=amp-sandbox-e328
2. Find your OAuth client named **"test-app"**
3. Click on it to edit

### 2. Add Redirect URIs

Scroll down to **"Authorized redirect URIs"** section:

1. Click **"+ ADD URI"**
2. Paste the first URI: `https://auth.expo.io/@suresh_seema/pocketshield`
3. Click **"+ ADD URI"** again
4. Paste the next URI: `https://auth.expo.io/@suresh_seema/pocketshield/`
5. Repeat for ALL URIs listed above

**Pro tip**: Copy all URIs, click "Add URI" multiple times to create empty fields, then paste each one.

### 3. Save Changes

Click **"SAVE"** at the bottom

---

## ⚠️ Important: OAuth Consent Screen

Make sure your OAuth consent screen is configured:

Go to: https://console.cloud.google.com/apis/credentials/consent?project=amp-sandbox-e328

### Required Settings:

1. **App Information**:
   - App name: `test-app` (or `PocketShield` - user-facing name)
   - User support email: Your email
   - App logo: (optional, can skip)

2. **App Domain** (optional for testing):
   - Application home page: `https://pocketshield.io` (optional)
   - Privacy policy: `https://pocketshield.io/privacy` (optional)
   - Terms of service: `https://pocketshield.io/terms` (optional)

3. **Authorized Domains**:
   - Add: `expo.io`
   - Add: `localhost` (if testing locally)

4. **Scopes**:
   - Click "ADD OR REMOVE SCOPES"
   - Check: `../auth/userinfo.email`
   - Check: `../auth/userinfo.profile`
   - Check: `openid`
   - Save

5. **Test Users** (IMPORTANT!):
   - Click "ADD USERS"
   - Add your Gmail address (the one you'll use to test)
   - Save

6. **Publishing Status**:
   - Keep it in **"Testing"** mode for now
   - Only your test users can sign in

---

## 🧪 Quick Test

After adding redirect URIs:

```bash
# Kill old process
kill -9 7799

# Start fresh
cd /Users/suresh.s/workspace/personal/mobile-bhoot
npx expo start --clear --port 8082
```

Then:
1. Open the app
2. Click **"Continue with Google"**
3. Sign in with the email you added as a test user
4. Should work! ✅

---

## 🚨 Common Errors & Fixes

### Error: "redirect_uri_mismatch"

**Full error**: `Error 400: redirect_uri_mismatch`

**Cause**: The redirect URI in the error message is not in your authorized list

**Fix**:
1. Look at the error message - it will show you the exact URI it's trying to use
2. Copy that exact URI (including trailing slashes!)
3. Add it to your OAuth client's redirect URIs
4. Example: If error shows `https://auth.expo.io/@suresh_seema/pocketshield/`, add that exact URI

### Error: "access_denied"

**Full error**: `Error 403: access_denied`

**Cause**: Your email is not added as a test user

**Fix**:
1. Go to OAuth consent screen
2. Scroll to "Test users"
3. Click "ADD USERS"
4. Add your Gmail address
5. Save and try again

### Error: "invalid_client"

**Full error**: `Error 401: invalid_client`

**Cause**: Client ID mismatch or OAuth client not properly configured

**Fix**:
1. Verify client ID in your code matches Google Cloud Console
2. Current ID: `133932633311-3q2a81jf7qijsqklh7mbgpbhtv7h7rkc.apps.googleusercontent.com`
3. Make sure OAuth client type is correct (Web, Android, or iOS)

---

## 📊 What Each URI Is For

| Redirect URI | Purpose | When Used |
|-------------|---------|-----------|
| `https://auth.expo.io/@suresh_seema/pocketshield` | Expo Go development | Testing in Expo Go app |
| `http://localhost:19000` | Local development | Running on development server |
| `exp://localhost:19000` | Expo protocol | Deep linking in development |
| `pocketshield://` | Custom scheme | Standalone app (APK/IPA) |

---

## ✅ Verification Checklist

After configuration, verify:

- [ ] All redirect URIs added to OAuth client
- [ ] OAuth consent screen configured
- [ ] Test user (your email) added
- [ ] Scopes (`email`, `profile`) added
- [ ] App restarted with `--clear` flag
- [ ] Tested "Continue with Google" button
- [ ] Successfully signed in

---

## 🎯 Summary

**What you need to do**:
1. ✅ Client ID already updated in code (done!)
2. ⚠️ Add redirect URIs to Google Cloud Console (see list above)
3. ⚠️ Add your email as test user
4. ⚠️ Configure OAuth consent screen
5. ✅ Restart app and test

**The name "test-app"** is just the label for your OAuth client in Google Cloud Console - it doesn't need to be in your code at all! The important thing is the **Client ID**, which is already configured. ✅

---

## 🚀 Ready to Test?

```bash
cd /Users/suresh.s/workspace/personal/mobile-bhoot
kill -9 7799
npx expo start --clear --port 8082
```

Open the app and click "Continue with Google"! 🎉

