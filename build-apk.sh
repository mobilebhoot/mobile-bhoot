#!/bin/bash

# PocketShield APK Build Script
# This script rebuilds the Android project and creates a release APK

set -e  # Exit on error

echo "🚀 PocketShield APK Build Script"
echo "=================================="
echo ""

# Set Java environment
export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"
export JAVA_HOME="/opt/homebrew/opt/openjdk@17"
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools"

echo "✓ Java Environment:"
java -version
echo ""

# Clean old build
echo "🧹 Cleaning old build files..."
rm -rf android/app/build
rm -rf android/build
rm -rf android/.gradle
echo "✓ Cleaned"
echo ""

# Rebuild Android project
echo "🔨 Rebuilding Android project with expo prebuild..."
npx expo prebuild --platform android --clean
echo "✓ Android project rebuilt"
echo ""

# Build APK
echo "📦 Building release APK..."
cd android
./gradlew assembleRelease
cd ..
echo "✓ APK built successfully!"
echo ""

# Find and display APK location
APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
if [ -f "$APK_PATH" ]; then
    APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
    echo "✅ SUCCESS! APK created at:"
    echo "   $APK_PATH"
    echo "   Size: $APK_SIZE"
    echo ""
    echo "📱 Install on device:"
    echo "   adb install $APK_PATH"
    echo ""
    echo "📋 Or copy to Desktop:"
    echo "   cp $APK_PATH ~/Desktop/PocketShield-v1.2.0-test.apk"
else
    echo "❌ APK not found at expected location"
    exit 1
fi

