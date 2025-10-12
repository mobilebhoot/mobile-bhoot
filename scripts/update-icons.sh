#!/bin/bash

# PocketShield Icon Update Script
# This script will help convert your logo to the required app icon formats

echo "🛡️  PocketShield Icon Update Script"
echo "=================================="

# Check if source image exists
SOURCE_IMAGE="assets/pocketshield-logo-original.png"

if [ ! -f "$SOURCE_IMAGE" ]; then
    echo "❌ Please save your PocketShield logo as: $SOURCE_IMAGE"
    echo "   The image should be at least 1024x1024 pixels for best quality"
    exit 1
fi

echo "✅ Found source image: $SOURCE_IMAGE"

# Create different icon sizes for Android
echo "📱 Creating Android app icons..."

# Main app icon (512x512 for Play Store)
convert "$SOURCE_IMAGE" -resize 512x512 "assets/icon.png"
echo "   ✓ Created icon.png (512x512)"

# Android adaptive icon (foreground should be 432x432 centered in 1024x1024)
convert "$SOURCE_IMAGE" -resize 432x432 -background transparent -gravity center -extent 1024x1024 "assets/adaptive-icon.png"
echo "   ✓ Created adaptive-icon.png (1024x1024)"

# Notification icon (should be white/transparent, 24x24 to 192x192)
convert "$SOURCE_IMAGE" -resize 192x192 -colorspace Gray -channel RGB -negate "assets/notification-icon.png"
echo "   ✓ Created notification-icon.png (192x192)"

# Splash screen (1080x1920 or similar)
convert "$SOURCE_IMAGE" -resize 400x400 -background "#1a1a2e" -gravity center -extent 1080x1920 "assets/splash.png"
echo "   ✓ Created splash.png (1080x1920)"

echo ""
echo "🎉 Icon generation complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Review the generated icons in the assets/ folder"
echo "   2. Run: npm run android to rebuild the app"
echo "   3. Test the new icons on your device"
echo ""
echo "💡 If you don't have ImageMagick installed:"
echo "   brew install imagemagick"
