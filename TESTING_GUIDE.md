# PocketShield.io - Testing Guide

## 🚨 Quick Fix for File Watcher Error

If you're seeing `Error: EMFILE: too many open files`, run this:

```bash
./fix-file-limits.sh
```

Then close and reopen your terminal, and try again.

---

## ✅ Recommended: Test with Expo Go (Easiest)

### Step 1: Install Expo Go
- **iPhone:** Download "Expo Go" from App Store
- **Android:** Download "Expo Go" from Play Store

### Step 2: Start Development Server
```bash
npx expo start --tunnel
```

### Step 3: Connect Your Phone
- **iPhone:** Open Camera app, scan the QR code
- **Android:** Open Expo Go app, scan the QR code

**Done!** The app should load on your phone within 30-60 seconds.

---

## 🧪 Testing Methods Comparison

| Method | Speed | Native Features | Setup Required |
|--------|-------|----------------|----------------|
| **Expo Go** | ⚡️ Instant | ⚠️ Limited | None |
| **iOS Simulator** | ⚡️ Fast | ✅ Full | Xcode (large) |
| **Android Emulator** | 🐌 Slow | ✅ Full | Android Studio |
| **EAS Development Build** | 🐌 15-20 min | ✅ Full | None |

---

## 📱 Option 1: Expo Go (Recommended for Quick Testing)

### Pros:
- ✅ Instant testing on real device
- ✅ No emulator setup needed
- ✅ Hot reload works perfectly
- ✅ Test on multiple devices easily

### Cons:
- ❌ Some native modules may not work
- ❌ Can't test Play Integrity/Device Check
- ❌ Limited to Expo Go's environment

### Commands:
```bash
# Start with default (LAN)
npx expo start

# Start with tunnel (works anywhere)
npx expo start --tunnel

# Start with clear cache
npx expo start --clear
```

### Troubleshooting:
- **QR code not working?** Try tunnel mode: `npx expo start --tunnel`
- **Connection issues?** Make sure phone and computer are on same WiFi
- **App not updating?** Shake phone, tap "Reload"

---

## 💻 Option 2: iOS Simulator (macOS Only)

### Prerequisites:
```bash
# Install Xcode from App Store (12+ GB)
# Or install command line tools
xcode-select --install
```

### Start Simulator:
```bash
# Option A: Let Expo start simulator
npx expo start
# Then press 'i' in terminal

# Option B: Start iOS simulator directly
npx expo start --ios

# Option C: Specific iOS version
npx expo start --ios --simulator="iPhone 15 Pro"
```

### Pros:
- ✅ Full iOS native features
- ✅ Fast reload
- ✅ Debugging tools
- ✅ Screenshot/recording easy

### Cons:
- ❌ Requires Xcode (12+ GB)
- ❌ macOS only
- ❌ Slower than real device
- ❌ Can't test notifications properly

---

## 🤖 Option 3: Android Emulator

### Prerequisites:
1. Install [Android Studio](https://developer.android.com/studio)
2. Open Android Studio → Settings → Android SDK
3. Install Android 11+ SDK
4. Tools → AVD Manager → Create Virtual Device

### Start Emulator:
```bash
# Option A: Let Expo start emulator
npx expo start
# Then press 'a' in terminal

# Option B: Start Android emulator directly
npx expo start --android
```

### Pros:
- ✅ Full Android native features
- ✅ Test Play Integrity API
- ✅ Debugging tools
- ✅ Works on any OS

### Cons:
- ❌ Requires Android Studio (large)
- ❌ Slow to start (1-2 minutes)
- ❌ Heavy on system resources
- ❌ Slower than real device

---

## 🏗️ Option 4: EAS Development Build

If you need to test native features not available in Expo Go:

### Build for Android:
```bash
# Build APK (development)
npx eas build --profile development --platform android

# When done, install on your phone:
# Download APK from link and install
```

### Build for iOS:
```bash
# Build for iOS (requires Apple Developer account)
npx eas build --profile development --platform ios

# Or build for simulator (no account needed)
npx eas build --profile development --platform ios --simulator
```

### Pros:
- ✅ Full native features
- ✅ Test all native modules
- ✅ Real production-like experience
- ✅ No local setup needed

### Cons:
- ❌ Takes 15-20 minutes to build
- ❌ Slower iteration cycle
- ❌ Requires EAS account
- ❌ iOS needs Developer account ($99/year)

---

## 🔍 Testing Checklist

### Basic Functionality Tests
- [ ] **Authentication**
  - [ ] Sign up with email/password
  - [ ] Sign in with existing account
  - [ ] Form validation works
  - [ ] Error messages display

- [ ] **Dashboard**
  - [ ] Security score displays (0-100)
  - [ ] Risk gauge shows correct color
  - [ ] Quick stats appear
  - [ ] Scan button works

- [ ] **Security Scanning**
  - [ ] Initial scan completes
  - [ ] Progress indicator shows
  - [ ] Results appear after scan
  - [ ] Score updates correctly

- [ ] **Vulnerabilities Screen**
  - [ ] Vulnerability list displays
  - [ ] Severity badges show (High/Medium/Low)
  - [ ] Tap for details works
  - [ ] AI insights appear

- [ ] **Network Traffic Screen**
  - [ ] Connection list displays
  - [ ] Security status badges show
  - [ ] Tap for details works
  - [ ] Headers information visible

- [ ] **App Monitor Screen**
  - [ ] Installed apps list displays
  - [ ] Risk scores show
  - [ ] Permission list visible
  - [ ] AI analysis appears

- [ ] **AI Chat**
  - [ ] Can send messages
  - [ ] AI responds appropriately
  - [ ] Typing indicator works
  - [ ] Chat history persists
  - [ ] Different query types work:
    - [ ] "What network threats do I have?"
    - [ ] "How can I improve my score?"
    - [ ] "What apps are risky?"

- [ ] **Settings**
  - [ ] Toggles work
  - [ ] Settings persist
  - [ ] Background monitoring toggles
  - [ ] Notifications toggle

- [ ] **Navigation**
  - [ ] Bottom tabs work
  - [ ] Back button works
  - [ ] Screen transitions smooth
  - [ ] Deep linking works (if applicable)

### Visual/UI Tests
- [ ] Dark theme applies correctly
- [ ] Icons display properly
- [ ] Colors match design
- [ ] Text is readable
- [ ] No layout issues on different screen sizes
- [ ] Scrolling works smoothly
- [ ] Loading states show
- [ ] Error states display

### Performance Tests
- [ ] App launches in < 3 seconds
- [ ] Security scan completes in < 30 seconds
- [ ] No lag during scrolling
- [ ] Animations are smooth (60fps)
- [ ] Memory usage reasonable
- [ ] No memory leaks
- [ ] Battery drain acceptable

### Platform-Specific Tests

**iOS:**
- [ ] Notch/Dynamic Island handled
- [ ] Safe area insets correct
- [ ] Haptic feedback works
- [ ] Permissions prompts appear
- [ ] Background fetch works

**Android:**
- [ ] Navigation bar handled
- [ ] Back button behavior correct
- [ ] Permissions prompts appear
- [ ] Background service works
- [ ] Notifications work

---

## 🐛 Common Issues & Solutions

### Issue: "EMFILE: too many open files"
**Solution:**
```bash
./fix-file-limits.sh
# Then close and reopen terminal
```

### Issue: "Metro bundler not starting"
**Solution:**
```bash
# Clear cache and try again
npx expo start --clear

# Or reset everything
rm -rf node_modules
npm install
npx expo start --clear
```

### Issue: "Can't connect to development server"
**Solution:**
```bash
# Use tunnel mode
npx expo start --tunnel

# Or check firewall settings
# Make sure port 19000-19001 are open
```

### Issue: "App crashes on startup"
**Solution:**
```bash
# Check for JavaScript errors in terminal
# Clear AsyncStorage
# Reinstall app
```

### Issue: "Changes not reflecting in app"
**Solution:**
- Shake device → Reload
- Or close app and reopen
- Or restart Metro bundler

### Issue: "Expo Go says 'incompatible version'"
**Solution:**
```bash
# Update Expo CLI
npm install -g expo-cli

# Update Expo SDK in app
npx expo install --fix
```

---

## 📊 Test Reports

### Manual Testing Report Template

```markdown
**Date:** [Date]
**Tester:** [Name]
**Device:** [iPhone 15 / Samsung S23 / etc.]
**OS Version:** [iOS 17.0 / Android 14]
**App Version:** 1.0.0
**Build Type:** [Expo Go / Development / Production]

#### Test Results
- Dashboard: ✅ Pass / ❌ Fail / ⚠️ Issues
- Authentication: ✅ Pass / ❌ Fail / ⚠️ Issues
- Scanning: ✅ Pass / ❌ Fail / ⚠️ Issues
- Vulnerabilities: ✅ Pass / ❌ Fail / ⚠️ Issues
- Network: ✅ Pass / ❌ Fail / ⚠️ Issues
- Apps: ✅ Pass / ❌ Fail / ⚠️ Issues
- AI Chat: ✅ Pass / ❌ Fail / ⚠️ Issues
- Settings: ✅ Pass / ❌ Fail / ⚠️ Issues

#### Issues Found
1. [Describe issue]
2. [Describe issue]

#### Performance
- Launch time: [X] seconds
- Scan time: [X] seconds
- Memory usage: [X] MB
- Battery drain: Low / Medium / High

#### Notes
[Any additional observations]
```

---

## 🚀 Quick Start Commands

```bash
# Most common: Start with Expo Go on your phone
npx expo start --tunnel

# iOS Simulator (if you have Xcode)
npx expo start --ios

# Android Emulator (if you have Android Studio)
npx expo start --android

# Clear everything and start fresh
npx expo start --clear

# Build for distribution testing
npx eas build --profile preview --platform android
```

---

## 📞 Getting Help

If you run into issues:

1. **Check terminal output** - errors usually show there
2. **Check device/simulator logs** - more detailed errors
3. **Try clearing cache** - `npx expo start --clear`
4. **Restart Metro bundler** - Ctrl+C and restart
5. **Reinstall dependencies** - `rm -rf node_modules && npm install`

---

## ✅ You're Ready!

**Easiest way to start testing NOW:**

1. Install "Expo Go" on your iPhone
2. Run: `npx expo start --tunnel`
3. Scan QR code with iPhone camera
4. Wait 30 seconds for app to load
5. Start testing! 🎉

The app will hot-reload as you make changes. Happy testing!

