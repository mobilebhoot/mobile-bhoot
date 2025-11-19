# 🚀 Build PocketShield v1.0.1 APK - Step by Step

## Quick Build Commands

Open your terminal and run these commands:

### Method 1: Using Build Script (Recommended)
```bash
cd /Users/suresh.s/Downloads/mobile-bhoot
chmod +x build-new-apk.sh
./build-new-apk.sh
```

### Method 2: Direct Gradle Build
```bash
cd /Users/suresh.s/Downloads/mobile-bhoot

# 1. Install dependencies
npm install

# 2. Build APK
cd android
chmod +x gradlew
./gradlew assembleRelease

# 3. Copy APK with proper naming
cp app/build/outputs/apk/release/app-release.apk ../pocketshield-v1.0.1-build2.apk

cd ..
echo "✅ APK built: pocketshield-v1.0.1-build2.apk"
```

### Method 3: Using NPM Scripts
```bash
cd /Users/suresh.s/Downloads/mobile-bhoot
npm run build:apk
```

### Method 4: Expo CLI
```bash
cd /Users/suresh.s/Downloads/mobile-bhoot
npx expo run:android --variant release
```

## Expected Output

After successful build:
- ✅ APK file: `pocketshield-v1.0.1-build2.apk`
- ✅ Size: ~50-100MB
- ✅ Version: 1.0.1
- ✅ Package: com.pocketshieldio

## Installation
```bash
adb install pocketshield-v1.0.1-build2.apk
```

## Troubleshooting

If you get errors:

**Missing dependencies:**
```bash
npm install expo-media-library
npm install
```

**Build cache issues:**
```bash
cd android && ./gradlew clean && cd ..
npx expo prebuild --clear
```

**Permission issues:**
```bash
chmod +x android/gradlew
```

Try Method 2 (Direct Gradle Build) - it's the most reliable!
