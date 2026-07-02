#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '../dist/index.html');

if (!fs.existsSync(htmlPath)) {
  console.error('Error: dist/index.html not found');
  process.exit(1);
}

let html = fs.readFileSync(htmlPath, 'utf8');

// Check if manifest link already exists
if (html.includes('rel="manifest"')) {
  console.log('Manifest link already exists in index.html');
  process.exit(0);
}

// Add manifest link after the opening <head> tag or before theme-color meta tag
const manifestLink = '<link rel="manifest" href="/manifest.json" />\n';

if (html.includes('<meta name="theme-color"')) {
  // Insert before theme-color meta tag
  html = html.replace(
    /<meta name="theme-color"/,
    `${manifestLink}  <meta name="theme-color"`
  );
} else if (html.includes('</head>')) {
  // Insert before closing head tag as fallback
  html = html.replace(
    /<\/head>/,
    `  ${manifestLink}</head>`
  );
} else {
  console.error('Error: Could not find suitable insertion point for manifest link');
  process.exit(1);
}

fs.writeFileSync(htmlPath, html);
console.log('Successfully added manifest link to index.html');
