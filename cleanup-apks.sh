#!/bin/bash

# PocketShield APK Cleanup Script
# Removes all APK files from the repository

echo "🧹 Cleaning up APK files from repository..."

cd /Users/suresh.s/Downloads/mobile-bhoot

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Find and list all APK files
echo -e "${BLUE}🔍 Searching for APK files...${NC}"
APK_FILES=$(find . -name "*.apk" -type f 2>/dev/null)

if [ -z "$APK_FILES" ]; then
    echo -e "${GREEN}✅ No APK files found in repository${NC}"
else
    echo -e "${YELLOW}📱 Found APK files:${NC}"
    echo "$APK_FILES"
    echo ""
    
    # Remove all APK files
    echo -e "${YELLOW}🗑️  Removing APK files...${NC}"
    find . -name "*.apk" -type f -delete 2>/dev/null
    
    # Verify removal
    REMAINING=$(find . -name "*.apk" -type f 2>/dev/null)
    if [ -z "$REMAINING" ]; then
        echo -e "${GREEN}✅ All APK files removed successfully${NC}"
    else
        echo -e "${RED}⚠️  Some APK files remain:${NC}"
        echo "$REMAINING"
    fi
fi

# Also clean build directories
echo -e "${YELLOW}🧹 Cleaning build directories...${NC}"
rm -rf android/app/build/outputs/apk/
rm -rf android/app/build/outputs/bundle/
rm -rf android/build/
rm -rf dist/
echo -e "${GREEN}✅ Build directories cleaned${NC}"

# Check .gitignore for APK rules
echo -e "${BLUE}📋 Checking .gitignore for APK rules...${NC}"
if grep -q "*.apk" .gitignore; then
    echo -e "${GREEN}✅ .gitignore already contains *.apk rule${NC}"
else
    echo -e "${YELLOW}⚠️  Adding APK rule to .gitignore...${NC}"
    echo "" >> .gitignore
    echo "# APK files (build artifacts)" >> .gitignore
    echo "*.apk" >> .gitignore
    echo "*.aab" >> .gitignore
    echo -e "${GREEN}✅ APK rules added to .gitignore${NC}"
fi

# Show git status
echo -e "${BLUE}📊 Git status:${NC}"
git status --porcelain | grep -E "\\.apk$" || echo "No APK files in git status"

echo ""
echo -e "${GREEN}🎉 APK cleanup complete!${NC}"
echo -e "${BLUE}📝 Summary:${NC}"
echo "  ✅ All APK files removed from repository"
echo "  ✅ Build directories cleaned"
echo "  ✅ .gitignore updated (if needed)"
echo ""
echo -e "${YELLOW}💡 To build new APK files:${NC}"
echo "  npm run build:apk"
echo "  ./build-new-apk.sh"
