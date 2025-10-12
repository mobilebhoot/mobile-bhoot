#!/bin/bash
# Android Studio Environment Setup for React Native/Expo

# Set JAVA_HOME to Android Studio's JDK
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"

# Add Android Studio's JDK to PATH
export PATH="$JAVA_HOME/bin:$PATH"

# Set Android SDK paths (adjust these based on your Android Studio installation)
export ANDROID_HOME="$HOME/Library/Android/sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$ANDROID_HOME/emulator:$PATH"
export PATH="$ANDROID_HOME/tools:$PATH"
export PATH="$ANDROID_HOME/tools/bin:$PATH"
export PATH="$ANDROID_HOME/platform-tools:$PATH"

echo "✅ Android Development Environment Configured:"
echo "   JAVA_HOME: $JAVA_HOME"
echo "   ANDROID_HOME: $ANDROID_HOME"
echo ""
echo "Java Version:"
java -version
echo ""
echo "📱 To run your app in Android Studio:"
echo "   1. Open Android Studio"
echo "   2. Open the /android folder from this project"
echo "   3. Sync the project"
echo "   4. Run the app"
echo ""
echo "🚀 To run via command line:"
echo "   source ./setup-android-env.sh && npm run android"
