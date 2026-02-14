// s3-upload-advanced.js
// Enhanced version with dotenv, streaming, and better error handling

require('dotenv').config();
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

// Validate environment variables
const requiredEnvVars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];
requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});

// Configure S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'johnk-files-2026';

/**
 * Upload file to S3 with streaming support for large files
 */
async function uploadFileToS3(filePath, s3Key, options = {}) {
  try {
    // Validate file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileStats = fs.statSync(filePath);
    const fileSizeMB = (fileStats.size / 1024 / 1024).toFixed(2);
    
    console.log(`📤 Uploading: ${path.basename(filePath)} (${fileSizeMB} MB)`);

    // Use streaming for large files (>5MB)
    const fileContent = fileStats.size > 5 * 1024 * 1024
      ? fs.createReadStream(filePath)
      : fs.readFileSync(filePath);

    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: fileContent,
      ContentType: options.contentType || getContentType(filePath),
      Metadata: options.metadata || {},
      ...options.additionalParams,
    };

    const command = new PutObjectCommand(uploadParams);
    const startTime = Date.now();
    const response = await s3Client.send(command);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    const s3Url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'eu-north-1'}.amazonaws.com/${s3Key}`;
    
    console.log(`✅ Upload successful in ${duration}s`);
    console.log(`   S3 Key: ${s3Key}`);
    console.log(`   URL: ${s3Url}`);
    
    return {
      success: true,
      s3Key,
      url: s3Url,
      etag: response.ETag,
      duration,
    };
  } catch (error) {
    console.error(`❌ Upload failed for ${path.basename(filePath)}:`, error.message);
    return {
      success: false,
      error: error.message,
      filePath,
    };
  }
}

/**
 * Upload all files from a directory
 */
async function uploadDirectory(dirPath, s3Prefix = '') {
  const files = fs.readdirSync(dirPath);
  const uploadPromises = [];

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stats = fs.statSync(filePath);

    if (stats.isFile()) {
      const s3Key = s3Prefix ? `${s3Prefix}/${file}` : file;
      uploadPromises.push(uploadFileToS3(filePath, s3Key));
    } else if (stats.isDirectory()) {
      // Recursive upload for subdirectories
      const subResults = await uploadDirectory(
        filePath,
        s3Prefix ? `${s3Prefix}/${file}` : file
      );
      uploadPromises.push(...subResults);
    }
  }

  return Promise.all(uploadPromises);
}

/**
 * Upload with retry logic
 */
async function uploadWithRetry(filePath, s3Key, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries}...`);
      const result = await uploadFileToS3(filePath, s3Key);
      
      if (result.success) {
        return result;
      }
      
      lastError = result.error;
    } catch (error) {
      lastError = error;
      console.log(`Attempt ${attempt} failed, retrying...`);
      
      // Exponential backoff
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }
  
  throw new Error(`Upload failed after ${maxRetries} attempts: ${lastError}`);
}

/**
 * Get content type based on file extension
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
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.zip': 'application/zip',
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.webm': 'video/webm',
  };
  
  return contentTypes[ext] || 'application/octet-stream';
}

// Example Usage
async function main() {
  try {
    console.log('🚀 Starting S3 Upload Demo\n');
    
    // Example 1: Upload a single file
    console.log('--- Example 1: Single File Upload ---');
    // await uploadFileToS3('./myfile.txt', 'uploads/myfile.txt');
    
    // Example 2: Upload with custom metadata
    console.log('\n--- Example 2: Upload with Metadata ---');
    // await uploadFileToS3('./document.pdf', 'documents/important.pdf', {
    //   metadata: {
    //     uploadedBy: 'john',
    //     uploadDate: new Date().toISOString(),
    //     category: 'important',
    //   }
    // });
    
    // Example 3: Upload with retry
    console.log('\n--- Example 3: Upload with Retry ---');
    // await uploadWithRetry('./largefile.zip', 'archives/largefile.zip', 3);
    
    // Example 4: Upload entire directory
    console.log('\n--- Example 4: Upload Directory ---');
    // await uploadDirectory('./my-folder', 'uploads/my-folder');
    
    console.log('\n✨ All uploads completed!\n');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  uploadFileToS3,
  uploadDirectory,
  uploadWithRetry,
  s3Client,
};
