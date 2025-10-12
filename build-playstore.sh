#!/bin/bash

# PocketShield - Play Store Release Build Script
# This script builds a production-ready AAB for Google Play Store

set -e  # Exit on any error

echo "🚀 Building PocketShield for Google Play Store..."
echo "================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo -e "${RED}Error: package.json not found. Make sure you're in the project root directory.${NC}"
  exit 1
fi

# Check if EAS is installed
if ! command -v eas &> /dev/null; then
  echo -e "${YELLOW}EAS CLI not found. Installing...${NC}"
  npm install -g @expo/eas-cli
fi

# Login to EAS (if not already logged in)
echo -e "${BLUE}Checking EAS authentication...${NC}"
if ! eas whoami &> /dev/null; then
  echo -e "${YELLOW}Please log in to EAS:${NC}"
  eas login
fi

# Clean previous builds
echo -e "${BLUE}Cleaning previous builds...${NC}"
rm -rf android/build/
rm -rf android/app/build/
rm -rf dist/
rm -rf node_modules/.cache/

# Install dependencies
echo -e "${BLUE}Installing dependencies...${NC}"
npm ci

# Pre-build checks
echo -e "${BLUE}Running pre-build checks...${NC}"

# Check app.json configuration
if ! grep -q "\"targetSdkVersion\": 34" app.json; then
  echo -e "${RED}Warning: targetSdkVersion should be 34 for Play Store compliance${NC}"
fi

if ! grep -q "\"compileSdkVersion\": 34" app.json; then
  echo -e "${RED}Warning: compileSdkVersion should be 34 for Play Store compliance${NC}"
fi

# Check for privacy policy
if ! grep -q "privacyPolicy" app.json; then
  echo -e "${RED}Error: Privacy policy URL is required for Play Store submission${NC}"
  exit 1
fi

# Increment version code for new builds
CURRENT_VERSION_CODE=$(grep -o '"versionCode": [0-9]*' app.json | grep -o '[0-9]*')
NEW_VERSION_CODE=$((CURRENT_VERSION_CODE + 1))

echo -e "${YELLOW}Incrementing version code from ${CURRENT_VERSION_CODE} to ${NEW_VERSION_CODE}${NC}"

# Update version code in app.json
sed -i.bak "s/\"versionCode\": ${CURRENT_VERSION_CODE}/\"versionCode\": ${NEW_VERSION_CODE}/" app.json
rm app.json.bak

# Build the production AAB
echo -e "${BLUE}Building production AAB...${NC}"
eas build --platform android --profile production --local

# Check if build was successful
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Build successful!${NC}"
  echo ""
  echo -e "${GREEN}📱 Your AAB file is ready for Play Store upload${NC}"
  echo -e "${BLUE}Location: ${NC}Check the output above for the AAB file path"
  echo ""
  echo -e "${YELLOW}Next steps:${NC}"
  echo "1. 📋 Complete the Play Store listing in Google Play Console"
  echo "2. 📤 Upload the AAB file to Google Play Console"
  echo "3. 🔍 Complete the Content Rating questionnaire"
  echo "4. 🔒 Fill out the Data Safety section"
  echo "5. 📝 Add privacy policy URL: https://pocketshield.com/privacy-policy"
  echo "6. 🎯 Submit for review"
  echo ""
  echo -e "${GREEN}Good luck with your Play Store submission! 🚀${NC}"
else
  echo -e "${RED}❌ Build failed. Please check the errors above and try again.${NC}"
  exit 1
fi
