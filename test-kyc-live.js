// Live KYC Endpoints Test
// Using real JWT token and BVN for testing

const fs = require('fs');
const path = require('path');

// Configuration
const API_BASE_URL = 'https://5a498535736b.ngrok-free.app/kyc';
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjbWN2MmFqc3gwMDAwMWdmdXA4MWpqOGI2IiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNzUyMDQ5MTc1LCJleHAiOjE3NTI2NTM5NzV9.9Gy3oK8PXzQ2QF9h63znB2V9dqgLbY1mjDUWDlJ-Jss';
const TEST_BVN = '22347795339';

// Find the correct port
async function findRunningServer() {
  console.log('🔍 Searching for running backend server...');
  
  for (const port of POSSIBLE_PORTS) {
    const testUrl = `http://localhost:${port}`;
    console.log(`Trying port ${port}...`);
    
    try {
      const response = await fetch(testUrl, { 
        method: 'GET',
        headers: { 'Authorization': `Bearer ${JWT_TOKEN}` }
      });
      
      if (response.status !== 404 || response.status < 500) {
        console.log(`✅ Found server on port ${port}`);
        API_BASE_URL = `${testUrl}/api`;
        return true;
      }
    } catch (error) {
      // Connection refused or other network error
      continue;
    }
  }
  
  console.log('❌ No running server found on common ports');
  console.log('💡 Make sure your backend server is running on one of these ports:', POSSIBLE_PORTS.join(', '));
  return false;
}

// Test if KYC endpoints exist
async function testEndpointExistence() {
  console.log('\n🔍 Testing if KYC endpoints exist...');
  
  const endpoints = [
    { name: 'KYC Status', path: '/status', method: 'GET' },
    { name: 'BVN Verification', path: '/verify-bvn', method: 'POST' },
    { name: 'Selfie Upload', path: '/upload-selfie', method: 'POST' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint.path}`, {
        method: endpoint.method,
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: endpoint.method === 'POST' ? JSON.stringify({}) : undefined
      });
      
      if (response.status === 404) {
        console.log(`❌ ${endpoint.name}: Endpoint not found (404)`);
      } else {
        console.log(`✅ ${endpoint.name}: Endpoint exists (Status: ${response.status})`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint.name}: Network error - ${error.message}`);
    }
  }
}

// Test 1: KYC Status Check
async function testKYCStatus() {
  console.log('\n📊 Testing KYC Status...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      }
    });

    console.log('Status Code:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    
    // Verify response structure
    const expectedFields = ['kycStatus', 'message', 'isVerified', 'bvnVerified', 'selfieVerified'];
    const hasRequiredFields = expectedFields.every(field => data.hasOwnProperty(field));
    
    console.log('✅ Has required fields:', hasRequiredFields);
    return data;
  } catch (error) {
    console.error('❌ KYC Status Error:', error.message);
    return null;
  }
}

// Test 2: BVN Verification
async function testBVNVerification() {
  console.log('\n🔍 Testing BVN Verification...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/verify-bvn`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        bvn: TEST_BVN
      })
    });

    console.log('Status Code:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('✅ BVN Verification Successful');
      console.log('✅ KYC Status:', data.kycStatus);
      console.log('✅ Wallet Created:', data.walletCreated);
    } else {
      console.log('❌ BVN Verification Failed');
      console.log('Error Message:', data.message);
    }
    
    return data;
  } catch (error) {
    console.error('❌ BVN Verification Error:', error.message);
    return null;
  }
}

// Test 3: Selfie Upload
async function testSelfieUpload() {
  console.log('\n📸 Testing Selfie Upload...');
  
  try {
    // Find an image from assets
    const imagePath = path.join(__dirname, 'assets', 'images', 'icon.png');
    
    if (!fs.existsSync(imagePath)) {
      console.log('❌ Image not found at:', imagePath);
      // Try alternative paths
      const alternatives = [
        path.join(__dirname, 'assets', 'images', 'image.png'),
        path.join(__dirname, 'assets', 'images', 'splash-icon.png'),
        path.join(__dirname, 'assets', 'images', 'adaptive-icon.png')
      ];
      
      let foundImage = null;
      for (const altPath of alternatives) {
        if (fs.existsSync(altPath)) {
          foundImage = altPath;
          break;
        }
      }
      
      if (!foundImage) {
        console.log('❌ No images found in assets/images');
        return null;
      }
      
      console.log('✅ Using image:', foundImage);
      
      // Create FormData
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('selfie', fs.createReadStream(foundImage), {
        filename: 'test-selfie.png',
        contentType: 'image/png'
      });

      const response = await fetch(`${API_BASE_URL}/upload-selfie`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`,
          'ngrok-skip-browser-warning': 'true',
          ...formData.getHeaders()
        },
        body: formData
      });

      console.log('Status Code:', response.status);
      const data = await response.json();
      console.log('Response:', JSON.stringify(data, null, 2));
      
      if (data.success) {
        console.log('✅ Selfie Upload Successful');
        console.log('✅ KYC Status:', data.kycStatus);
        console.log('✅ Wallet Created:', data.walletCreated);
      } else {
        console.log('❌ Selfie Upload Failed');
        console.log('Error Message:', data.message);
      }
      
      return data;
    }
  } catch (error) {
    console.error('❌ Selfie Upload Error:', error.message);
    return null;
  }
}

// Test 4: Check status after each step
async function testFullFlow() {
  console.log('\n🔄 Testing Full KYC Flow...');
  console.log('=======================================');
  
  // Step 1: Initial status
  console.log('\n--- Step 1: Check Initial Status ---');
  let status = await testKYCStatus();
  
  if (status && status.kycStatus === 'PENDING') {
    console.log('✅ Initial status is PENDING - ready for BVN verification');
    
    // Step 2: BVN Verification
    console.log('\n--- Step 2: BVN Verification ---');
    const bvnResult = await testBVNVerification();
    
    if (bvnResult && bvnResult.success) {
      console.log('✅ BVN verification successful');
      
      // Step 3: Check status after BVN
      console.log('\n--- Step 3: Status After BVN ---');
      status = await testKYCStatus();
      
      if (status && status.kycStatus === 'IN_PROGRESS') {
        console.log('✅ Status is now IN_PROGRESS - ready for selfie');
        
        // Step 4: Selfie Upload
        console.log('\n--- Step 4: Selfie Upload ---');
        const selfieResult = await testSelfieUpload();
        
        if (selfieResult) {
          // Step 5: Final status check
          console.log('\n--- Step 5: Final Status Check ---');
          status = await testKYCStatus();
          
          if (status && status.kycStatus === 'VERIFIED') {
            console.log('🎉 KYC Flow Completed Successfully!');
            console.log('✅ User is fully verified');
            console.log('✅ Wallet should be created');
          } else if (status && status.kycStatus === 'UNDER_REVIEW') {
            console.log('⏳ Selfie is under admin review');
          } else {
            console.log('❌ Unexpected final status:', status?.kycStatus);
          }
        }
      } else {
        console.log('❌ Expected IN_PROGRESS status after BVN, got:', status?.kycStatus);
      }
    } else {
      console.log('❌ BVN verification failed');
    }
  } else {
    console.log('ℹ️ User already has status:', status?.kycStatus);
    
    // Still test remaining endpoints based on current status
    if (status?.kycStatus === 'IN_PROGRESS') {
      console.log('\n--- Testing Selfie Upload (IN_PROGRESS) ---');
      await testSelfieUpload();
    }
  }
}

// Test error scenarios
async function testErrorScenarios() {
  console.log('\n🚨 Testing Error Scenarios...');
  
  // Test invalid BVN
  console.log('\n--- Testing Invalid BVN ---');
  try {
    const response = await fetch(`${API_BASE_URL}/verify-bvn`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        bvn: '12345' // Invalid BVN
      })
    });
    
    const data = await response.json();
    console.log('Invalid BVN Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.log('Invalid BVN Error:', error.message);
  }
  
  // Test missing BVN
  console.log('\n--- Testing Missing BVN ---');
  try {
    const response = await fetch(`${API_BASE_URL}/verify-bvn`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({}) // Missing BVN
    });
    
    const data = await response.json();
    console.log('Missing BVN Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.log('Missing BVN Error:', error.message);
  }
}

// Run all tests
async function runTests() {
  console.log('🧪 Starting Live KYC Testing...');
  console.log('JWT Token:', JWT_TOKEN.substring(0, 50) + '...');
  console.log('Test BVN:', TEST_BVN);
  console.log('API URL:', API_BASE_URL);
  console.log('=======================================');
  
  await testEndpointExistence();
  await testFullFlow();
  await testErrorScenarios();
  
  console.log('\n✅ Live KYC Testing Complete!');
  console.log('=======================================');
}

// Run the tests
runTests(); 