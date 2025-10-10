#!/usr/bin/env node

/**
 * Debug script for PocketShield Mobile Security App
 * 
 * This script helps debug real device data access and provides
 * useful commands for testing the app on real devices.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 PocketShield Debug Script');
console.log('============================\n');

// Check if we're in the right directory
if (!fs.existsSync('package.json')) {
  console.error('❌ Error: Please run this script from the project root directory');
  process.exit(1);
}

// Check if device is connected
function checkDeviceConnection() {
  try {
    console.log('📱 Checking device connection...');
    const result = execSync('adb devices', { encoding: 'utf8' });
    const lines = result.trim().split('\n');
    const devices = lines.filter(line => line.includes('\tdevice'));
    
    if (devices.length === 0) {
      console.log('⚠️  No Android devices connected');
      console.log('   Make sure USB debugging is enabled and device is connected');
      return false;
    }
    
    console.log(`✅ Found ${devices.length} device(s) connected:`);
    devices.forEach(device => {
      const deviceId = device.split('\t')[0];
      console.log(`   - ${deviceId}`);
    });
    return true;
  } catch (error) {
    console.error('❌ Error checking device connection:', error.message);
    return false;
  }
}

// Monitor app logs
function monitorLogs(deviceId = null) {
  console.log('\n📊 Starting log monitoring...');
  console.log('   Press Ctrl+C to stop monitoring\n');
  
  const deviceFilter = deviceId ? `-s ${deviceId}` : '';
  const logCommand = `adb ${deviceFilter} logcat | grep -E "(PocketShield|ReactNative|Expo|DeviceDataService)"`;
  
  try {
    execSync(logCommand, { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Error monitoring logs:', error.message);
  }
}

// Install and run the app
function installAndRun() {
  console.log('\n🚀 Installing and running PocketShield...');
  
  try {
    // Build debug APK
    console.log('   Building debug APK...');
    execSync('npm run build:apk:debug', { stdio: 'inherit' });
    
    // Install APK
    console.log('   Installing APK...');
    execSync('adb install -r android/app/build/outputs/apk/debug/app-debug.apk', { stdio: 'inherit' });
    
    // Launch app
    console.log('   Launching app...');
    execSync('adb shell am start -n io.pocketshield.security/.MainActivity', { stdio: 'inherit' });
    
    console.log('✅ App installed and launched successfully!');
  } catch (error) {
    console.error('❌ Error installing/running app:', error.message);
  }
}

// Test permissions
function testPermissions() {
  console.log('\n🔐 Testing permissions...');
  
  const permissions = [
    'READ_CONTACTS',
    'READ_SMS',
    'READ_PHONE_STATE',
    'ACCESS_FINE_LOCATION',
    'CAMERA',
    'READ_EXTERNAL_STORAGE'
  ];
  
  permissions.forEach(permission => {
    try {
      const result = execSync(`adb shell dumpsys package io.pocketshield.security | grep ${permission}`, { encoding: 'utf8' });
      if (result.includes('granted=true')) {
        console.log(`   ✅ ${permission}: GRANTED`);
      } else {
        console.log(`   ❌ ${permission}: NOT GRANTED`);
      }
    } catch (error) {
      console.log(`   ⚠️  ${permission}: UNKNOWN`);
    }
  });
}

// Clear app data
function clearAppData() {
  console.log('\n🧹 Clearing app data...');
  
  try {
    execSync('adb shell pm clear io.pocketshield.security', { stdio: 'inherit' });
    console.log('✅ App data cleared');
  } catch (error) {
    console.error('❌ Error clearing app data:', error.message);
  }
}

// Show device info
function showDeviceInfo() {
  console.log('\n📱 Device Information:');
  
  try {
    const model = execSync('adb shell getprop ro.product.model', { encoding: 'utf8' }).trim();
    const version = execSync('adb shell getprop ro.build.version.release', { encoding: 'utf8' }).trim();
    const sdk = execSync('adb shell getprop ro.build.version.sdk', { encoding: 'utf8' }).trim();
    
    console.log(`   Model: ${model}`);
    console.log(`   Android Version: ${version}`);
    console.log(`   SDK Version: ${sdk}`);
  } catch (error) {
    console.error('❌ Error getting device info:', error.message);
  }
}

// Main function
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'check':
      checkDeviceConnection();
      break;
      
    case 'logs':
      const deviceId = args[1];
      if (checkDeviceConnection()) {
        monitorLogs(deviceId);
      }
      break;
      
    case 'install':
      if (checkDeviceConnection()) {
        installAndRun();
      }
      break;
      
    case 'permissions':
      if (checkDeviceConnection()) {
        testPermissions();
      }
      break;
      
    case 'clear':
      if (checkDeviceConnection()) {
        clearAppData();
      }
      break;
      
    case 'info':
      if (checkDeviceConnection()) {
        showDeviceInfo();
      }
      break;
      
    case 'help':
    default:
      console.log('Usage: node debug-device.js <command> [options]');
      console.log('');
      console.log('Commands:');
      console.log('  check       - Check if Android device is connected');
      console.log('  logs [id]   - Monitor app logs (optional device ID)');
      console.log('  install     - Build, install and run the app');
      console.log('  permissions - Check app permissions');
      console.log('  clear       - Clear app data');
      console.log('  info        - Show device information');
      console.log('  help        - Show this help message');
      console.log('');
      console.log('Examples:');
      console.log('  node debug-device.js check');
      console.log('  node debug-device.js logs');
      console.log('  node debug-device.js install');
      console.log('  node debug-device.js logs emulator-5554');
      break;
  }
}

main();
