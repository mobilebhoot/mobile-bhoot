# PocketShield.io - Build Guide

## 🏗️ Local Build Methods

### ✅ Method 1: iOS Simulator (Fastest - Running Now!)

This is currently building in the background. It will:
- Generate native iOS files
- Build with Xcode
- Launch in iOS Simulator

**Command:**
```bash
npx expo run:ios
```

**First Run:** 2-3 minutes  
**Subsequent Runs:** 30-60 seconds

**What's Happening:**
1. Generating native iOS project → `ios/` folder
2. Installing CocoaPods dependencies
3. Building with Xcode
4. Launching iOS Simulator
5. Installing app on simulator

**Once Complete:**
- iOS Simulator will open automatically
- App will launch
- You can test all features
- Changes require rebuild (not hot reload)

---

### 🤖 Method 2: Build APK for Android (UPDATED & TESTED ✅)

**WORKING BUILD COMMANDS:**

cd /Users/suresh.s/workspace/personal/mobile-bhoot && export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH" && export JAVA_HOME="/opt/homebrew/opt/openjdk@17" && export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools && export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools" && npx expo run:android --variant release

cd /Users/suresh.s/workspace/personal/mobile-bhoot && export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH" && export JAVA_HOME="/opt/homebrew/opt/openjdk@17" && export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools && export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools" && npx expo run:android --variant release

```bash
# Debug Build (for development)
npx expo run:android

# Release Build (for distribution) - RECOMMENDED
npx expo run:android --variant release
```

**Generated Files:**
- **Debug APK:** `android/app/build/outputs/apk/debug/app-debug.apk`
- **Release APK:** `android/app/build/outputs/apk/release/app-release.apk` (~71.6 MB)

**Installation:**
```bash
# Install on connected Android device
adb install android/app/build/outputs/apk/release/app-release.apk
```

**Alternative Direct Gradle Build:**
```bash
# If you prefer direct Gradle commands
cd android
./gradlew assembleDebug        # For debug
./gradlew assembleRelease      # For release
```

**Build Time:** 1-2 minutes (after initial setup)  
**Status:** ✅ VERIFIED WORKING

---

### 📱 Method 3: Expo Go (If Build Issues)

If local builds fail, use Expo Go:

```bash
# Start in offline mode (no VPN needed)
npx expo start --offline
```

Then:
1. Install "Expo Go" from App Store
2. Connect iPhone to same WiFi
3. Scan QR code
4. App loads in Expo Go

---

## 🔧 Troubleshooting

### Issue: "command not found: xcodebuild"
**Solution:** Install Xcode from App Store

### Issue: "Unable to boot device"
**Solution:**
```bash
# Open Simulator manually first
open -a Simulator

# Then run
npx expo run:ios
```

### Issue: "Pod install failed"
**Solution:**
```bash
cd ios
pod deintegrate
pod install
cd ..
npx expo run:ios
```

### Issue: Build fails with module errors
**Solution:**
```bash
# Clean everything
rm -rf node_modules ios android
npm install
npx expo run:ios
```

### Issue: "No devices found"
**Solution:**
```bash
# List available simulators
xcrun simctl list devices

# Run on specific device
npx expo run:ios --device "iPhone 15 Pro"
```

---

## 📦 Build Outputs

### iOS Simulator Build
- **Location:** `ios/build/Build/Products/Debug-iphonesimulator/`
- **File:** `mobilebhoot.app`
- **Use:** Testing on simulator only

### iOS Device Build (requires Apple Developer account)
```bash
npx expo run:ios --configuration Release --device
```
- **Location:** `ios/build/Build/Products/Release-iphoneos/`
- **File:** `mobilebhoot.app`
- **Use:** Real device testing

### Android Debug APK
- **Location:** `android/app/build/outputs/apk/debug/`
- **File:** `app-debug.apk`
- **Size:** ~50-70 MB
- **Use:** Install on any Android device

### Android Release APK (production)
```bash
cd android
./gradlew assembleRelease
```
- **Location:** `android/app/build/outputs/apk/release/`
- **File:** `app-release.apk`
- **Size:** ~30-40 MB (optimized)
- **Use:** Distribution testing

---

## 🎯 Quick Commands Reference

```bash
# iOS Simulator (recommended)
npx expo run:ios

# iOS on specific device
npx expo run:ios --device "iPhone 14"

# Android Debug Build ✅ WORKING
npx expo run:android

# Android Release Build ✅ WORKING (RECOMMENDED)
npx expo run:android --variant release

# Android Emulator (specific)
npx expo run:android --device "Pixel_8"

# Alternative Android Builds
cd android && ./gradlew assembleDebug
cd android && ./gradlew assembleRelease

# Clean build
rm -rf node_modules ios android
npm install
npx expo run:android

# Expo Go (fallback)
npx expo start --offline

# Export bundle
npx expo export --platform android

# Check what's running
ps aux | grep expo

# Install APK on device
adb install android/app/build/outputs/apk/release/app-release.apk
```

---

## ✅ Current Build Status

**Method:** iOS Simulator (`npx expo run:ios`)  
**Status:** Building in background  
**ETA:** 2-3 minutes  

**What to expect:**
1. ⏳ Generating native files... (30s)
2. ⏳ Installing pods... (60s)
3. ⏳ Building with Xcode... (90s)
4. ✅ Simulator opens
5. ✅ App launches

**Once running:**
- App will be installed on simulator
- Appears in simulator home screen
- Can be launched anytime
- Persists between restarts

---

## 🎓 Understanding Build Types

### Development Build
- Includes debugging tools
- Larger file size
- Fast reload possible
- Error messages visible
- **Use for:** Testing & development

### Release Build
- Optimized & minified
- Smaller file size
- No debugging info
- Better performance
- **Use for:** Distribution

### Expo Go
- No build needed
- Quick iteration
- Limited native features
- Internet required (first load)
- **Use for:** Rapid prototyping

---

## 📊 Build Comparison

| Method | Time | Size | Features | Best For |
|--------|------|------|----------|----------|
| **iOS Simulator** | 2-3 min | N/A | Full | Local testing |
| **Android APK** | 3-5 min | 50MB | Full | Device testing |
| **Expo Go** | Instant | N/A | Limited | Quick preview |
| **EAS Build** | 15-20 min | 40MB | Full | Distribution |

---

## 🚀 Next Steps After Build Completes

1. **Test the app** on iOS Simulator
2. **Check all features** work correctly
3. **Note any bugs** or issues
4. **Test on real device** if needed
5. **Build for Android** if required

---

## 💡 Pro Tips

### Faster Rebuilds
```bash
# Only rebuild if native code changed
# Otherwise use Expo Go for JS-only changes
```

### Multiple Devices
```bash
# Open multiple simulators
npx expo run:ios --device "iPhone 15 Pro"
npx expo run:ios --device "iPhone SE"
```

### Debug Build
```bash
# Build opens Xcode for debugging
npx expo run:ios --no-build-cache
```

### Clean Slate
```bash
# Nuclear option - clean everything
rm -rf node_modules ios android .expo dist
npm install
npx expo run:ios
```

---

## 📞 Need Help?

If the build fails, check:
1. Terminal output for errors
2. Xcode version (should be latest)
3. iOS Simulator available
4. Enough disk space (5GB+)
5. macOS version (Ventura+ recommended)

**Common Solutions:**
- Update Xcode
- Restart computer
- Clear derived data
- Use Expo Go as fallback

