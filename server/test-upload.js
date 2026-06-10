import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testUpload() {
  console.log('--- Testing Cloudinary Upload ---');

  // Create a dummy text file to upload
  const dummyFilePath = path.join(__dirname, 'dummy.txt');
  fs.writeFileSync(dummyFilePath, 'This is a test file for Cloudinary upload.');

  try {
    // 1. We need a user to login or we need to generate a token.
    // Instead of messing with DB directly here, we can try to register a temporary user via API.
    
    console.log('1. Requesting OTP for a temporary user...');
    const otpRes = await fetch('http://localhost:5001/api/v1/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'testcloudinary@example.com' })
    });
    const otpData = await otpRes.json();
    const mockOtp = otpData.data.mockOtp;
    
    console.log('2. Verifying OTP...');
    const verifyRes = await fetch('http://localhost:5001/api/v1/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'testcloudinary@example.com', otp: mockOtp })
    });
    const verifyData = await verifyRes.json();
    const otpToken = verifyData.data.otpToken;

    console.log('3. Registering temporary user...');
    const regRes = await fetch('http://localhost:5001/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'testcloudinary@example.com',
        username: 'testcloudinaryuser' + Date.now(),
        password: 'Password123!',
        otpToken: otpToken
      })
    });
    const regData = await regRes.json();
    const accessToken = regData.data.accessToken;

    if (!accessToken) {
      throw new Error('Failed to get access token');
    }

    console.log('4. Uploading file to Cloudinary...');
    const formData = new FormData();
    const fileBlob = new Blob([fs.readFileSync(dummyFilePath)], { type: 'text/plain' });
    formData.append('file', fileBlob, 'dummy.txt');
    formData.append('iv', 'dummy_iv');
    formData.append('key', 'dummy_key');

    const uploadRes = await fetch('http://localhost:5001/api/v1/media/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: formData
    });
    const uploadData = await uploadRes.json();

    if (uploadData.success) {
      console.log('✅ Upload Successful!');
      console.log('Cloudinary URL:', uploadData.data.media.url);
    } else {
      console.error('❌ Upload Failed:', uploadData);
    }

  } catch (error) {
    console.error('❌ Error during testing:', error);
  } finally {
    if (fs.existsSync(dummyFilePath)) {
      fs.unlinkSync(dummyFilePath);
    }
  }
}

testUpload();
