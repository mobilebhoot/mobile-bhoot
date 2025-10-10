#!/bin/bash

# PocketShield.io Local Build Script
# This script builds APK and IPA files locally using Gradle and Xcode

set -e  # Exit on any error

# Set Java environment
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
export PATH=$JAVA_HOME/bin:$PATH

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to build Android APK
build_android() {
    local build_type=$1
    print_status "Building Android APK ($build_type)..."
    
    if [ ! -d "android" ]; then
        print_error "Android directory not found!"
        exit 1
    fi
    
    cd android
    
    # Clean previous builds
    print_status "Cleaning previous builds..."
    ./gradlew clean
    
    # Build APK
    if [ "$build_type" = "debug" ]; then
        ./gradlew assembleDebug
        APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
    else
        ./gradlew assembleRelease
        APK_PATH="app/build/outputs/apk/release/app-release.apk"
    fi
    
    cd ..
    
    if [ -f "android/$APK_PATH" ]; then
        print_success "Android APK built successfully: android/$APK_PATH"
        
        # Get APK size
        APK_SIZE=$(du -h "android/$APK_PATH" | cut -f1)
        print_status "APK size: $APK_SIZE"
        
        # Copy to root directory for easy access
        cp "android/$APK_PATH" "./PocketShield-$build_type.apk"
        print_success "APK copied to: ./PocketShield-$build_type.apk"
    else
        print_error "Failed to build Android APK!"
        exit 1
    fi
}

# Function to build iOS IPA
build_ios() {
    local build_type=$1
    print_status "Building iOS IPA ($build_type)..."
    
    if [ ! -d "ios" ]; then
        print_error "iOS directory not found!"
        exit 1
    fi
    
    cd ios
    
    # Clean previous builds
    print_status "Cleaning previous builds..."
    xcodebuild clean -workspace PocketShieldio.xcworkspace -scheme PocketShieldio
    
    # Create build directory
    mkdir -p build
    
    # Build archive
    print_status "Creating archive..."
    xcodebuild -workspace PocketShieldio.xcworkspace \
               -scheme PocketShieldio \
               -configuration $build_type \
               -destination generic/platform=iOS \
               -archivePath build/PocketShieldio.xcarchive \
               archive
    
    # Export IPA
    print_status "Exporting IPA..."
    xcodebuild -exportArchive \
               -archivePath build/PocketShieldio.xcarchive \
               -exportPath build/ipa \
               -exportOptionsPlist ExportOptions.plist
    
    cd ..
    
    if [ -f "ios/build/ipa/PocketShieldio.ipa" ]; then
        print_success "iOS IPA built successfully: ios/build/ipa/PocketShieldio.ipa"
        
        # Get IPA size
        IPA_SIZE=$(du -h "ios/build/ipa/PocketShieldio.ipa" | cut -f1)
        print_status "IPA size: $IPA_SIZE"
        
        # Copy to root directory for easy access
        cp "ios/build/ipa/PocketShieldio.ipa" "./PocketShield-$build_type.ipa"
        print_success "IPA copied to: ./PocketShield-$build_type.ipa"
    else
        print_error "Failed to build iOS IPA!"
        exit 1
    fi
}

# Function to build iOS using Expo (alternative method)
build_ios_expo() {
    print_status "Building iOS using Expo export..."
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        print_error "package.json not found. Please run this script from the project root."
        exit 1
    fi
    
    # Export the app
    print_status "Exporting Expo app..."
    npx expo export --platform ios
    
    if [ $? -eq 0 ]; then
        print_success "Export completed successfully!"
        print_status "Your app bundle is ready in: ./dist/"
        print_status "Next steps to test:"
        print_status "  Option 1: Use iOS Simulator - npx expo run:ios"
        print_status "  Option 2: Use Expo Go - npx expo start --offline"
        print_status "  Option 3: Build with Xcode - npx expo prebuild --platform ios"
    else
        print_error "Export failed. Trying alternative method..."
        print_status "Let's try running in development mode instead:"
        print_status "npx expo start --offline"
    fi
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  android [debug|release]    Build Android APK"
    echo "  ios [debug|release]        Build iOS IPA"
    echo "  ios-expo                   Build iOS using Expo export"
    echo "  all [debug|release]        Build both Android and iOS"
    echo "  install-android            Install debug APK on connected device"
    echo "  clean                      Clean all build artifacts"
    echo "  help                       Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 android debug           # Build debug APK"
    echo "  $0 ios release             # Build release IPA"
    echo "  $0 ios-expo                # Build iOS using Expo"
    echo "  $0 all debug               # Build both debug versions"
    echo "  $0 install-android         # Install debug APK on device"
}

# Main script logic
case "$1" in
    "android")
        if [ -z "$2" ]; then
            print_error "Please specify build type: debug or release"
            exit 1
        fi
        build_android "$2"
        ;;
    "ios")
        if [ -z "$2" ]; then
            print_error "Please specify build type: debug or release"
            exit 1
        fi
        build_ios "$2"
        ;;
    "ios-expo")
        build_ios_expo
        ;;
    "all")
        if [ -z "$2" ]; then
            print_error "Please specify build type: debug or release"
            exit 1
        fi
        build_android "$2"
        build_ios "$2"
        ;;
    "install-android")
        install_android
        ;;
    "clean")
        print_status "Cleaning all build artifacts..."
        rm -f ./PocketShield-*.apk ./PocketShield-*.ipa
        if [ -d "android" ]; then
            cd android && ./gradlew clean && cd ..
        fi
        if [ -d "ios" ]; then
            cd ios && xcodebuild clean -workspace PocketShieldio.xcworkspace -scheme PocketShieldio && cd ..
        fi
        print_success "Clean completed!"
        ;;
    "help"|"-h"|"--help")
        show_usage
        ;;
    *)
        print_error "Invalid option: $1"
        show_usage
        exit 1
        ;;
esac

print_success "Build process completed!"

