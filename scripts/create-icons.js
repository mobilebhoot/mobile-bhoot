#!/usr/bin/env node

// Simple script to create a basic PocketShield icon using SVG
const fs = require('fs');
const path = require('path');

// Create a basic SVG icon that matches the PocketShield design
const createPocketShieldSVG = (size) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background circle -->
  <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="#1e4a6b"/>
  
  <!-- Shield shape -->
  <path d="M${size*0.2} ${size*0.25} L${size*0.8} ${size*0.25} L${size*0.8} ${size*0.55} Q${size*0.8} ${size*0.75} ${size*0.5} ${size*0.85} Q${size*0.2} ${size*0.75} ${size*0.2} ${size*0.55} Z" fill="#2d5a87"/>
  
  <!-- Lock body -->
  <rect x="${size*0.35}" y="${size*0.45}" width="${size*0.3}" height="${size*0.25}" rx="${size*0.02}" fill="white"/>
  
  <!-- Lock shackle -->
  <path d="M${size*0.4} ${size*0.45} Q${size*0.4} ${size*0.35} ${size*0.5} ${size*0.35} Q${size*0.6} ${size*0.35} ${size*0.6} ${size*0.45}" 
        stroke="white" stroke-width="${size*0.02}" fill="none"/>
  
  <!-- Lock keyhole -->
  <circle cx="${size*0.5}" cy="${size*0.55}" r="${size*0.025}" fill="#1e4a6b"/>
  <rect x="${size*0.49}" y="${size*0.56}" width="${size*0.02}" height="${size*0.06}" fill="#1e4a6b"/>
</svg>`;
};

// Create different sizes
const sizes = [48, 72, 96, 144, 192, 512, 1024];
const assetsDir = path.join(__dirname, '..', 'assets');

console.log('🛡️ Creating PocketShield icons...');

// Ensure assets directory exists
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Create SVG icons
sizes.forEach(size => {
  const svgContent = createPocketShieldSVG(size);
  const filename = `pocketshield-icon-${size}.svg`;
  const filepath = path.join(assetsDir, filename);
  
  fs.writeFileSync(filepath, svgContent);
  console.log(`✓ Created ${filename}`);
});

// Create the main app icons
const mainIconSVG = createPocketShieldSVG(512);
fs.writeFileSync(path.join(assetsDir, 'icon.svg'), mainIconSVG);
console.log('✓ Created icon.svg (main app icon)');

const adaptiveIconSVG = createPocketShieldSVG(1024);
fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.svg'), adaptiveIconSVG);
console.log('✓ Created adaptive-icon.svg');

// Create a simple splash screen SVG
const splashSVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="1080" height="1920" fill="#1a1a2e"/>
  
  <!-- Centered logo -->
  <g transform="translate(340, 760)">
    ${createPocketShieldSVG(400).replace('<?xml version="1.0" encoding="UTF-8"?>', '').replace('<svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">', '').replace('</svg>', '')}
  </g>
  
  <!-- App name -->
  <text x="540" y="1300" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="48" font-weight="bold">PocketShield</text>
  <text x="540" y="1350" text-anchor="middle" fill="#ccc" font-family="Arial, sans-serif" font-size="24">SECURITY APP</text>
</svg>`;

fs.writeFileSync(path.join(assetsDir, 'splash.svg'), splashSVG);
console.log('✓ Created splash.svg');

console.log('\n🎉 PocketShield icons created successfully!');
console.log('\n📋 Next steps:');
console.log('1. Convert SVG files to PNG using the conversion script');
console.log('2. Or replace with your actual logo files');
console.log('3. Rebuild the app to see the new icons');
