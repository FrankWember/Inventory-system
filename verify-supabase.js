#!/usr/bin/env node

/**
 * Supabase Configuration Verification Script
 * Run this to diagnose authentication issues
 *
 * Usage: node verify-supabase.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(message) {
  log('\n' + '═'.repeat(70), 'blue');
  log(`  ${message}`, 'blue');
  log('═'.repeat(70), 'blue');
}

// Read .env file
function loadEnv() {
  try {
    const envPath = path.join(__dirname, '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const env = {};

    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    });

    return env;
  } catch (error) {
    log('❌ Error reading .env file: ' + error.message, 'red');
    return null;
  }
}

// Make HTTPS request
function makeRequest(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          data: data,
          headers: res.headers
        });
      });
    }).on('error', reject);
  });
}

async function main() {
  header('🔍 Supabase Configuration Verification');

  // Step 1: Load environment variables
  log('\n📁 Step 1: Loading Environment Variables...', 'yellow');
  const env = loadEnv();

  if (!env) {
    log('❌ Cannot proceed without .env file', 'red');
    process.exit(1);
  }

  const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    log('❌ Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY', 'red');
    process.exit(1);
  }

  log(`✅ Supabase URL: ${supabaseUrl}`, 'green');
  log(`✅ Anon Key: ${supabaseKey.substring(0, 20)}...`, 'green');

  // Step 2: Check if Supabase project is reachable
  header('🌐 Step 2: Testing Supabase Connection');

  try {
    log('\n⏳ Checking if Supabase project is active...', 'yellow');
    const restResponse = await makeRequest(`${supabaseUrl}/rest/v1/`, {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    });

    if (restResponse.statusCode === 200) {
      log('✅ Supabase REST API is responding (200 OK)', 'green');
      log('   Your project is ACTIVE and running!', 'green');
    } else if (restResponse.statusCode === 404) {
      log('❌ ERROR: Got 404 - Project might be PAUSED or URL is wrong', 'red');
      log('   👉 Go to https://supabase.com/dashboard', 'yellow');
      log('   👉 Find your project and click "Restore" or "Unpause"', 'yellow');
    } else {
      log(`⚠️  Unexpected status code: ${restResponse.statusCode}`, 'yellow');
    }
  } catch (error) {
    log('❌ Cannot connect to Supabase:', 'red');
    log(`   ${error.message}`, 'red');
    log('\n   Possible causes:', 'yellow');
    log('   1. Project is paused (most common)', 'yellow');
    log('   2. Wrong Supabase URL', 'yellow');
    log('   3. Internet connection issue', 'yellow');
  }

  // Step 3: Check Auth endpoint
  header('🔐 Step 3: Testing Authentication Endpoint');

  try {
    log('\n⏳ Checking auth health endpoint...', 'yellow');
    const authResponse = await makeRequest(`${supabaseUrl}/auth/v1/health`, {
      'apikey': supabaseKey
    });

    if (authResponse.statusCode === 200) {
      log('✅ Authentication endpoint is working', 'green');
      log(`   Response: ${authResponse.data}`, 'green');
    } else if (authResponse.statusCode === 404) {
      log('❌ Auth endpoint returned 404', 'red');
      log('   This is the error you\'re seeing in the app!', 'red');
      log('\n   Solutions:', 'yellow');
      log('   1. Unpause your Supabase project', 'yellow');
      log('   2. Verify URL is correct in .env', 'yellow');
    } else {
      log(`⚠️  Auth endpoint status: ${authResponse.statusCode}`, 'yellow');
    }
  } catch (error) {
    log('❌ Cannot reach auth endpoint:', 'red');
    log(`   ${error.message}`, 'red');
  }

  // Step 4: Recommendations
  header('💡 Recommendations');

  log('\n📋 Checklist to fix authentication:', 'magenta');
  log('   □ 1. Go to Supabase Dashboard', 'white');
  log('   □ 2. Check if project is paused (UNPAUSE IT!)', 'white');
  log('   □ 3. Enable Email auth: Authentication → Providers → Email', 'white');
  log('   □ 4. Run database migrations in SQL Editor', 'white');
  log('   □ 5. Create user with supabase-create-user.sql', 'white');
  log('   □ 6. Restart your dev server: npm start --clear', 'white');

  log('\n📖 For detailed troubleshooting, see: TROUBLESHOOTING_AUTH.md', 'blue');

  header('✨ Verification Complete');

  // Exit codes
  process.exit(0);
}

main().catch(error => {
  log('\n❌ Verification failed with error:', 'red');
  log(error.message, 'red');
  process.exit(1);
});
