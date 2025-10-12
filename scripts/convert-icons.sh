#!/bin/bash

# Convert SVG icons to PNG for Android APK
echo "🛡️ Converting PocketShield SVG icons to PNG..."

# Check if we have a way to convert SVG to PNG
if command -v convert &> /dev/null; then
    CONVERTER="convert"
    echo "✓ Using ImageMagick convert"
elif command -v rsvg-convert &> /dev/null; then
    CONVERTER="rsvg-convert"
    echo "✓ Using rsvg-convert"
else
    echo "❌ No SVG converter found!"
    echo "Please install one of:"
    echo "  - ImageMagick: brew install imagemagick"
    echo "  - librsvg: brew install librsvg"
    exit 1
fi

cd assets

# Convert main app icon
if [ "$CONVERTER" = "convert" ]; then
    convert icon.svg -resize 512x512 icon.png
    convert adaptive-icon.svg -resize 1024x1024 adaptive-icon.png
    convert splash.svg -resize 1080x1920 splash.png
    convert pocketshield-icon-192.svg -resize 192x192 notification-icon.png
else
    rsvg-convert -w 512 -h 512 icon.svg -o icon.png
    rsvg-convert -w 1024 -h 1024 adaptive-icon.svg -o adaptive-icon.png
    rsvg-convert -w 1080 -h 1920 splash.svg -o splash.png
    rsvg-convert -w 192 -h 192 pocketshield-icon-192.svg -o notification-icon.png
fi

echo "✓ Created icon.png (512x512)"
echo "✓ Created adaptive-icon.png (1024x1024)"
echo "✓ Created splash.png (1080x1920)"
echo "✓ Created notification-icon.png (192x192)"

# Verify files were created
if [ -f "icon.png" ] && [ -f "adaptive-icon.png" ] && [ -f "splash.png" ] && [ -f "notification-icon.png" ]; then
    echo ""
    echo "🎉 All PNG icons created successfully!"
    echo ""
    echo "📱 Icon files ready for APK:"
    ls -la *.png
    echo ""
    echo "🚀 Next step: Rebuild the app to use the new icons"
    echo "   npx expo run:android --variant release"
else
    echo "❌ Some PNG files were not created properly"
    exit 1
fi
