/**
 * Firebase Configuration
 * Web config only - works with Expo on Android and iOS
 * 
 * To get your Firebase config:
 * 1. Go to Firebase Console: https://console.firebase.google.com/
 * 2. Select your project (or create a new one)
 * 3. Go to Project Settings (gear icon)
 * 4. Scroll down to "Your apps" section
 * 5. Click on the Web app icon (</>) or "Add app" if no web app exists
 * 6. Register your app with a nickname
 * 7. Copy the firebaseConfig object
 * 8. Replace the values below with your actual config
 */

import { initializeApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase web config for pocketshiled-firebase project
const firebaseConfig = {
  apiKey: "AIzaSyA4lqTMtSEIXu4ITi1PqFXYuk-sXdmIh3M",
  authDomain: "pocketshiled-firebase.firebaseapp.com",
  projectId: "pocketshiled-firebase",
  storageBucket: "pocketshiled-firebase.firebasestorage.app",
  messagingSenderId: "739358674832",
  appId: "1:739358674832:web:f90d8d081b1378333ded15",
  measurementId: "G-Z635MXBHH0"
};

// Initialize Firebase
let app;
let auth;
let db;

try {
  app = initializeApp(firebaseConfig);
  
  // Initialize Auth with AsyncStorage persistence for React Native
  // Use getAuth if already initialized, otherwise initialize with persistence
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
    console.log('✅ Firebase initialized successfully with AsyncStorage persistence');
  } catch (authError) {
    // If auth is already initialized, use getAuth instead
    if (authError.code === 'auth/already-initialized') {
      auth = getAuth(app);
      console.log('✅ Firebase Auth already initialized, using existing instance');
    } else {
      throw authError;
    }
  }
  
  // Initialize Firestore Database
  db = getFirestore(app);
  console.log('✅ Firestore Database initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  throw error;
}

export { app, auth, db };
export default app;

