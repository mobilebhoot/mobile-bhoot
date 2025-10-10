#!/bin/bash

echo "🏗️  PocketShield.io - Local Build Script"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

echo "📱 Building for iOS (local)..."
echo ""

# Export the app
echo "Step 1: Exporting Expo app..."
npx expo export --platform ios

if [ $? -eq 0 ]; then
    echo "✅ Export completed successfully!"
    echo ""
    echo "📦 Your app bundle is ready in: ./dist/"
    echo ""
    echo "🎯 Next steps to test:"
    echo ""
    echo "Option 1: Use iOS Simulator"
    echo "  npx expo run:ios"
    echo ""
    echo "Option 2: Use Expo Go"
    echo "  1. Install 'Expo Go' from App Store on your iPhone"
    echo "  2. Run: npx expo start --offline"
    echo "  3. Scan QR code with your iPhone"
    echo ""
    echo "Option 3: Build with Xcode"
    echo "  npx expo prebuild --platform ios"
    echo "  Then open ios/mobilebhoot.xcworkspace in Xcode"
    echo ""
else
    echo "❌ Export failed. Trying alternative method..."
    echo ""
    echo "Let's try running in development mode instead:"
    echo "npx expo start --offline"
fi

