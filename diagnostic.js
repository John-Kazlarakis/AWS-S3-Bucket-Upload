// diagnostic.js - Check your S3 upload setup
require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('═══════════════════════════════════════════════════════');
console.log('🔍 S3 Upload Diagnostic Tool');
console.log('═══════════════════════════════════════════════════════');
console.log('');

let hasErrors = false;

// Check 1: .env file exists
console.log('1️⃣  Checking .env file...');
if (fs.existsSync('./.env')) {
  console.log('   ✅ .env file found');
  
  // Show file content (safely, without exposing full secrets)
  const envContent = fs.readFileSync('./.env', 'utf8');
  const lines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  console.log('   📄 Found', lines.length, 'configuration lines');
} else {
  console.log('   ❌ .env file NOT found');
  console.log('   👉 Solution: Copy .env.example to .env');
  hasErrors = true;
}
console.log('');

// Check 2: Environment variables loaded
console.log('2️⃣  Checking environment variables...');
const requiredVars = {
  'AWS_ACCESS_KEY_ID': process.env.AWS_ACCESS_KEY_ID,
  'AWS_SECRET_ACCESS_KEY': process.env.AWS_SECRET_ACCESS_KEY,
  'AWS_REGION': process.env.AWS_REGION,
  'S3_BUCKET_NAME': process.env.S3_BUCKET_NAME,
};

for (const [name, value] of Object.entries(requiredVars)) {
  if (value) {
    // Show partial value for security
    let displayValue = value;
    if (name === 'AWS_ACCESS_KEY_ID') {
      displayValue = value.substring(0, 8) + '...' + value.substring(value.length - 4);
    } else if (name === 'AWS_SECRET_ACCESS_KEY') {
      displayValue = '***' + value.substring(value.length - 4);
    }
    console.log(`   ✅ ${name}: ${displayValue}`);
  } else {
    console.log(`   ❌ ${name}: MISSING`);
    hasErrors = true;
  }
}
console.log('');

// Check 3: Node modules installed
console.log('3️⃣  Checking dependencies...');
try {
  require('@aws-sdk/client-s3');
  console.log('   ✅ @aws-sdk/client-s3 installed');
} catch (e) {
  console.log('   ❌ @aws-sdk/client-s3 NOT installed');
  console.log('   👉 Solution: Run npm install');
  hasErrors = true;
}

try {
  require('dotenv');
  console.log('   ✅ dotenv installed');
} catch (e) {
  console.log('   ❌ dotenv NOT installed');
  console.log('   👉 Solution: Run npm install');
  hasErrors = true;
}
console.log('');

// Check 4: Test file exists
console.log('4️⃣  Checking test file...');
if (fs.existsSync('./test.txt')) {
  const size = fs.statSync('./test.txt').size;
  console.log(`   ✅ test.txt found (${size} bytes)`);
} else {
  console.log('   ⚠️  test.txt NOT found');
  console.log('   👉 Create it with: echo "Hello S3!" > test.txt');
}
console.log('');

// Check 5: Node version
console.log('5️⃣  Checking Node.js version...');
console.log('   ℹ️  Node.js version:', process.version);
const majorVersion = parseInt(process.version.slice(1).split('.')[0]);
if (majorVersion >= 18) {
  console.log('   ✅ Version is compatible');
} else {
  console.log('   ⚠️  Version is old (recommended: v18+)');
}
console.log('');

// Check 6: AWS credentials format
console.log('6️⃣  Checking AWS credentials format...');
if (process.env.AWS_ACCESS_KEY_ID) {
  if (process.env.AWS_ACCESS_KEY_ID.startsWith('AKIA')) {
    console.log('   ✅ Access Key ID format looks correct');
  } else {
    console.log('   ⚠️  Access Key ID should start with AKIA');
  }
  
  if (process.env.AWS_ACCESS_KEY_ID.includes(' ')) {
    console.log('   ❌ Access Key ID contains spaces!');
    console.log('   👉 Remove any spaces from the key');
    hasErrors = true;
  }
}

if (process.env.AWS_SECRET_ACCESS_KEY) {
  if (process.env.AWS_SECRET_ACCESS_KEY.length >= 40) {
    console.log('   ✅ Secret Access Key length looks correct');
  } else {
    console.log('   ⚠️  Secret Access Key seems too short');
  }
  
  if (process.env.AWS_SECRET_ACCESS_KEY.includes(' ')) {
    console.log('   ❌ Secret Access Key contains spaces!');
    console.log('   👉 Remove any spaces from the key');
    hasErrors = true;
  }
}
console.log('');

// Check 7: Region
console.log('7️⃣  Checking AWS region...');
if (process.env.AWS_REGION) {
  console.log(`   ✅ Region set to: ${process.env.AWS_REGION}`);
  if (process.env.AWS_REGION === 'eu-north-1') {
    console.log('   ✅ Region matches your bucket (Stockholm)');
  }
} else {
  console.log('   ⚠️  Region not set (will use default)');
}
console.log('');

// Summary
console.log('═══════════════════════════════════════════════════════');
if (hasErrors) {
  console.log('❌ ISSUES FOUND - Please fix the errors above');
  console.log('');
  console.log('Quick fixes:');
  console.log('  1. Make sure .env file exists: cp .env.example .env');
  console.log('  2. Add your AWS credentials to .env file');
  console.log('  3. Install dependencies: npm install');
  console.log('  4. Remove any spaces from your AWS keys');
  process.exit(1);
} else {
  console.log('✅ ALL CHECKS PASSED!');
  console.log('');
  console.log('You should be ready to upload. Try:');
  console.log('  node s3-upload-fixed.js');
}
console.log('═══════════════════════════════════════════════════════');
