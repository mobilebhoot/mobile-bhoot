# Git Commands Quick Reference 🔧

## 📝 First Time Setup (if needed)

```bash
# Set your Git identity (one time setup)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## 🚀 Push Code to Git Repository

### Option 1: Initialize New Repository
```bash
# Initialize git repository
git init

# Add all files to staging
git add .

# Create first commit
git commit -m "Initial commit - PocketShield.io mobile security app

✅ Features:
- React Native/Expo security app
- Real-time threat detection
- Network traffic analysis
- AI-powered security chat
- Android APK builds working
- Comprehensive security dashboard

🔧 Build Commands:
- Debug: npx expo run:android
- Release: npx expo run:android --variant release"

# Add remote repository (replace with your repo URL)
git remote add origin https://github.com/yourusername/mobile-bhoot.git

# Push to remote repository
git push -u origin main
```

### Option 2: Connect to Existing Repository
```bash
# Add all changes
git add .

# Commit with meaningful message
git commit -m "Update: Working Android builds + Documentation

✅ Fixed:
- Package name mismatch in Android Kotlin files
- Build configuration for release APK
- Updated build documentation
- Enhanced .gitignore for React Native/Expo

🔧 Build Status:
- Android Debug/Release builds: ✅ WORKING
- APK generation: ✅ SUCCESSFUL
- App launches on emulator: ✅ CONFIRMED"

# Push to repository
git push origin main
```

## 📁 What Gets Committed vs Ignored

### ✅ COMMITTED (Tracked):
- Source code (`src/`, `App.js`)
- Configuration (`app.json`, `package.json`, `eas.json`)
- Documentation (`README.md`, `BUILD_GUIDE.md`)
- Assets (`assets/`)
- Native configuration (`android/app/src/main/`)

### ❌ IGNORED (Not tracked):
- `node_modules/` - Dependencies
- `android/app/build/` - Build outputs
- `*.apk`, `*.aab` - Generated APK files
- `.env` - Environment variables
- `ios/build/`, `android/.gradle/` - Build artifacts
- `.DS_Store` - macOS system files

## 🔄 Common Git Workflows

### Daily Development
```bash
# Check status
git status

# Add specific files
git add src/screens/NewScreen.js
# OR add all changes
git add .

# Commit with descriptive message
git commit -m "Add new security feature: Real-time malware detection"

# Push to remote
git push origin main
```

### Before Major Changes
```bash
# Create a feature branch
git checkout -b feature/new-security-scanner

# Work on your changes...
git add .
git commit -m "Implement advanced security scanner"

# Push feature branch
git push origin feature/new-security-scanner

# Merge back to main (or create Pull Request)
git checkout main
git merge feature/new-security-scanner
git push origin main
```

### Check Repository Status
```bash
# View commit history
git log --oneline -10

# Check what's changed
git status

# See differences
git diff

# View remote repositories
git remote -v
```

## 🚨 Emergency Commands

### Undo Last Commit (keep changes)
```bash
git reset --soft HEAD~1
```

### Undo All Uncommitted Changes
```bash
git checkout -- .
```

### Force Push (use carefully!)
```bash
git push --force-with-lease origin main
```

## 📊 Repository Size Check
```bash
# Check repository size
du -sh .git

# See largest files
git ls-files | xargs ls -l | sort -k5 -rn | head -10
```

## 🎯 Ready to Push Commands

**For your current project, run these commands:**

```bash
# Stage all changes
git add .

# Create comprehensive commit
git commit -m "Mobile Security App - Initial Release

🔒 PocketShield.io - Advanced Android Security Monitoring

✅ Core Features:
- Real-time threat detection & analysis
- Network traffic monitoring with AI insights  
- Root/jailbreak detection
- App vulnerability scanning
- Interactive AI security chat
- Background security monitoring
- Modern dark UI with intuitive navigation

🛠️ Technical Stack:
- React Native + Expo framework
- React Navigation for screen management
- Expo modules (Device, Application, Constants)
- React Native Chart Kit for data visualization
- Comprehensive security analysis algorithms

📱 Build Status:
- Android Debug builds: ✅ WORKING
- Android Release builds: ✅ WORKING  
- APK generation: ✅ TESTED (71.6MB release APK)
- Emulator testing: ✅ CONFIRMED

🔧 Build Commands:
- Development: npx expo run:android
- Production: npx expo run:android --variant release
- Direct Gradle: cd android && ./gradlew assembleRelease

📚 Documentation:
- Complete build guide with verified commands
- Troubleshooting section for common issues
- Project architecture and structure docs
- Comprehensive .gitignore for React Native/Expo

🐛 Issues Resolved:
- Fixed package name mismatch in Android Kotlin files
- Resolved R and BuildConfig compilation errors
- Updated deprecated build commands in documentation
- Added proper error handling and null safety checks
- Fixed Ionicons naming issues
- Corrected JavaScript syntax errors

Ready for production deployment and further development!"

# Push to repository (replace with your repo URL)
git push origin main
```

---

**Your project is now ready to be pushed to Git! 🚀**
