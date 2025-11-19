#!/usr/bin/env node

/**
 * Translation Sync Script
 * Ensures all Indian language translation files have the same structure as en.json
 * Missing keys will be filled with English text as placeholder
 */

const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/i18n/locales');
const enFile = path.join(localesDir, 'en.json');

// All Indian languages supported
const indianLanguages = [
  'hi',  // Hindi
  'bn',  // Bengali
  'te',  // Telugu
  'mr',  // Marathi
  'ta',  // Tamil
  'ur',  // Urdu
  'gu',  // Gujarati
  'kn',  // Kannada
  'or',  // Odia
  'ml',  // Malayalam
  'pa',  // Punjabi
  'as',  // Assamese
  'mai', // Maithili
  'sa',  // Sanskrit
  'ne',  // Nepali
];

// Read English translation file
const enTranslations = JSON.parse(fs.readFileSync(enFile, 'utf8'));

// Function to deep merge objects
function deepMerge(target, source) {
  const output = { ...target };
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  
  return output;
}

function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

// Function to sync translation file
function syncTranslationFile(langCode) {
  const langFile = path.join(localesDir, `${langCode}.json`);
  
  let existingTranslations = {};
  
  // Read existing translations if file exists
  if (fs.existsSync(langFile)) {
    try {
      existingTranslations = JSON.parse(fs.readFileSync(langFile, 'utf8'));
    } catch (error) {
      console.warn(`⚠️  Error reading ${langCode}.json, creating new file`);
      existingTranslations = {};
    }
  }
  
  // Merge English structure with existing translations
  // This ensures all keys exist, but preserves existing translations
  const syncedTranslations = deepMerge(enTranslations, existingTranslations);
  
  // Write synced translations
  fs.writeFileSync(
    langFile,
    JSON.stringify(syncedTranslations, null, 2),
    'utf8'
  );
  
  console.log(`✅ Synced ${langCode}.json`);
  
  // Count missing translations (keys that still have English values)
  const missingCount = countMissingTranslations(syncedTranslations, enTranslations);
  if (missingCount > 0) {
    console.log(`   ⚠️  ${missingCount} keys still need translation`);
  }
}

// Count missing translations
function countMissingTranslations(synced, en) {
  let count = 0;
  
  function compare(obj1, obj2, path = '') {
    for (const key in obj2) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (typeof obj2[key] === 'object' && obj2[key] !== null) {
        if (obj1[key]) {
          compare(obj1[key], obj2[key], currentPath);
        }
      } else {
        // If value is same as English, it's not translated
        if (obj1[key] === obj2[key]) {
          count++;
        }
      }
    }
  }
  
  compare(synced, en);
  return count;
}

// Main execution
console.log('🔄 Syncing translation files...\n');

// Sync all Indian language files
indianLanguages.forEach(langCode => {
  syncTranslationFile(langCode);
});

console.log('\n✅ Translation sync complete!');
console.log('\n📝 Next Steps:');
console.log('   1. Review translation files in src/i18n/locales/');
console.log('   2. Translate English placeholder text to respective languages');
console.log('   3. Run this script again after adding translations to preserve them');
console.log('\n💡 Tip: Use translation services or native speakers for accurate translations');
