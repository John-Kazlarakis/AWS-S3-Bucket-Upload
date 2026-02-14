// AWS S3 File Upload Script
// Install dependencies first: npm install @aws-sdk/client-s3 dotenv

// IMPORTANT: Load environment variables FIRST
require('dotenv').config();

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

// Debug: Check if environment variables are loaded
console.log('🔍 Checking environment variables...');
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '✅ Loaded' : '❌ Missing');
console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '✅ Loaded' : '❌ Missing');
console.log('AWS_REGION:', process.env.AWS_REGION || '❌ Missing');
console.log('S3_BUCKET_NAME:', process.env.S3_BUCKET_NAME || '❌ Missing');
console.log('');

// Validate environment variables
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.error('❌ ERROR: AWS credentials not found!');
  console.error('');
  console.error('Please make sure you have a .env file with:');
  console.error('AWS_ACCESS_KEY_ID=your_access_key');
  console.error('AWS_SECRET_ACCESS_KEY=your_secret_key');
  console.error('AWS_REGION=eu-north-1');
  console.error('S3_BUCKET_NAME=johnk-files-2026');
  process.exit(1);
}

// Configure AWS S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

// Your S3 bucket name
const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'johnk-files-2026';

/**
 * Upload a single file to S3
 * @param {string} filePath - Local path to the file
 * @param {string} s3Key - The key (path) where the file will be stored in S3
 */
async function uploadFileToS3(filePath, s3Key) {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Read the file
    const fileContent = fs.readFileSync(filePath);
    const fileSize = (fs.statSync(filePath).size / 1024 / 1024).toFixed(2);
    
    console.log(`📤 Uploading: ${path.basename(filePath)} (${fileSize} MB)`);
    
    // Prepare upload parameters
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: fileContent,
      ContentType: getContentType(filePath),
    };

    // Upload to S3
    const command = new PutObjectCommand(uploadParams);
    const response = await s3Client.send(command);
    
    console.log(`✅ File uploaded successfully!`);
    console.log(`   S3 Key: ${s3Key}`);
    console.log(`   S3 URL: https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`);
    console.log('');
    
    return response;
  } catch (error) {
    console.error('❌ Error uploading file:', error.message);
    throw error;
  }
}

/**
 * Upload multiple files to S3
 * @param {Array<{filePath: string, s3Key: string}>} files - Array of file objects
 */
async function uploadMultipleFiles(files) {
  console.log(`📦 Uploading ${files.length} files...`);
  console.log('');
  
  const results = await Promise.allSettled(
    files.map(file => uploadFileToS3(file.filePath, file.s3Key))
  );
  
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  console.log(`📊 Upload Summary:`);
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  
  return results;
}

/**
 * Get content type based on file extension
 * @param {string} filePath - Path to the file
 */
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes = {
    '.txt': 'text/plain',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg',
  };
  
  return contentTypes[ext] || 'application/octet-stream';
}

// Example Usage
async function main() {
  try {
    console.log('🚀 Starting S3 Upload...');
    console.log('');
    
    // Example 1: Upload a single file
    // Make sure you have a file called 'test.txt' in your folder first!
    await uploadFileToS3(
      './kill localhost.txt', // Local file path
      'uploads/kill localhost.txt' // S3 key (destination path)
    );
    
    // Example 2: Upload multiple files (uncomment to use)
    // await uploadMultipleFiles([
    //   { filePath: './document.pdf', s3Key: 'documents/document.pdf' },
    //   { filePath: './image.png', s3Key: 'images/image.png' },
    //   { filePath: './data.json', s3Key: 'data/data.json' },
    // ]);
    
    console.log('✨ All uploads completed!');
  } catch (error) {
    console.error('❌ Upload failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

// Export functions for use in other modules
module.exports = {
  uploadFileToS3,
  uploadMultipleFiles,
  s3Client,
};
