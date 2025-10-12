# PocketShield Icon Update Guide

## 🛡️ Using Your New PocketShield Logo

### Step 1: Save the Logo Image
1. Save the PocketShield logo image you provided as: `assets/pocketshield-logo-original.png`
2. Make sure it's at least 1024x1024 pixels for best quality
3. PNG format with transparent background is preferred

### Step 2: Generate Icons (Option A - Automatic)
If you have ImageMagick installed:
```bash
# Install ImageMagick (if not already installed)
brew install imagemagick

# Run the icon generation script
./scripts/update-icons.sh
```

### Step 2: Generate Icons (Option B - Manual)
If you prefer to create icons manually or don't have ImageMagick:

1. **Main App Icon** (`assets/icon.png`):
   - Size: 512x512 pixels
   - Format: PNG
   - Use: Play Store listing and app launcher

2. **Adaptive Icon** (`assets/adaptive-icon.png`):
   - Size: 1024x1024 pixels (with 432x432 logo centered)
   - Format: PNG with transparent background
   - Use: Android adaptive icons

3. **Notification Icon** (`assets/notification-icon.png`):
   - Size: 192x192 pixels
   - Format: PNG, preferably white/monochrome
   - Use: Status bar notifications

4. **Splash Screen** (`assets/splash.png`):
   - Size: 1080x1920 pixels (or similar ratio)
   - Background: #1a1a2e (dark blue to match app theme)
   - Logo: Centered, about 400x400 pixels
   - Use: App startup screen

### Step 3: Update App Configuration
The app.json is already configured to use these icon files:
- `icon`: "./assets/icon.png"
- `adaptiveIcon.foregroundImage`: "./assets/adaptive-icon.png"
- `splash.image`: "./assets/splash.png"
- Notification icon is configured in the plugins section

### Step 4: Rebuild the App
```bash
# Clean and rebuild
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="/Users/suresh.s/Library/Android/sdk"
export PATH=$JAVA_HOME/bin:$PATH

# Build new APK with updated icons
npx expo run:android --variant release
```

### Step 5: Install and Test
```bash
# Install the updated APK
adb install android/app/build/outputs/apk/release/app-release.apk

# Launch the app to see new icons
adb shell am start -n com.pocketshield/.MainActivity
```

## 🎨 Icon Design Tips
- Use the shield design as the primary element
- Ensure good contrast for visibility on different backgrounds
- Keep the design simple and recognizable at small sizes
- The lock symbol should be clearly visible
- Use the brand colors (#1a1a2e dark blue, #4CAF50 green)

## 📱 Testing Checklist
- [ ] App launcher icon appears correctly
- [ ] Notification icon shows properly in status bar
- [ ] Splash screen displays the new logo
- [ ] Icons look good on both light and dark themes
- [ ] Adaptive icon works with different device themes
