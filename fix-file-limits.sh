#!/bin/bash

# Fix macOS file descriptor limits for React Native development
# This script increases the file watcher limits to prevent EMFILE errors

echo "🔧 Fixing macOS file descriptor limits..."

# Create launch daemon plist if it doesn't exist
PLIST_PATH="/Library/LaunchDaemons/limit.maxfiles.plist"

if [ ! -f "$PLIST_PATH" ]; then
    echo "Creating launch daemon configuration..."
    sudo tee "$PLIST_PATH" > /dev/null << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>limit.maxfiles</string>
    <key>ProgramArguments</key>
    <array>
      <string>launchctl</string>
      <string>limit</string>
      <string>maxfiles</string>
      <string>65536</string>
      <string>200000</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
  </dict>
</plist>
EOF
    
    sudo chown root:wheel "$PLIST_PATH"
    sudo chmod 644 "$PLIST_PATH"
    echo "✅ Launch daemon created"
else
    echo "✅ Launch daemon already exists"
fi

# Load the launch daemon
echo "Loading launch daemon..."
sudo launchctl load -w "$PLIST_PATH" 2>/dev/null || echo "Launch daemon already loaded"

# Set limits for current session
echo "Setting limits for current session..."
ulimit -n 65536

# Verify
echo ""
echo "📊 Current limits:"
ulimit -n
launchctl limit maxfiles

echo ""
echo "✅ File limits increased!"
echo ""
echo "🎯 Next steps:"
echo "1. Close this terminal"
echo "2. Open a new terminal"
echo "3. Run: cd $(pwd)"
echo "4. Run: npm start"
echo ""
echo "If the issue persists, restart your Mac for changes to take full effect."

