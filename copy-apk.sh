#!/bin/bash

# Simple APK Copy Script
echo "📱 Copying existing PocketShield APK..."

# Copy the existing APK with proper naming
cp /Users/suresh.s/Downloads/mobile-bhoot/android/app/build/outputs/apk/release/pocketshield-v1.0.0-release.apk /Users/suresh.s/Downloads/mobile-bhoot/pocketshield-build-2.apk

echo "✅ APK copied successfully!"
echo "📁 Location: /Users/suresh.s/Downloads/mobile-bhoot/pocketshield-build-2.apk"
echo "📱 File size:"
ls -lh /Users/suresh.s/Downloads/mobile-bhoot/pocketshield-build-2.apk
