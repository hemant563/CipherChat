import { v2 as cloudinary } from 'cloudinary';
import env from './src/config/env.js';
import fs from 'fs';

// Create a dummy file
fs.writeFileSync('test_image.png', 'fake image content');

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

console.log('Testing Cloudinary upload...');

cloudinary.uploader.upload('test_image.png', { resource_type: 'auto', folder: 'chatsphere_uploads' })
  .then(result => {
    console.log('✅ Upload Successful!');
    console.log('URL:', result.url);
  })
  .catch(error => {
    console.error('❌ Upload Failed:', error.message || error);
  })
  .finally(() => {
    fs.unlinkSync('test_image.png');
  });
