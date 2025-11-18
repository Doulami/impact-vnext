#!/usr/bin/env node
/**
 * ClicToPay API Integration Test Script
 * Run this to test API calls without a real order
 */

const axios = require('axios');
const crypto = require('crypto');

// Test configuration
const testConfig = {
  username: 'test_merchant_user',
  password: 'test_merchant_pass',
  apiUrl: 'https://sandbox.clictopay.com/api', // This will likely fail, but that's expected
  timeout: 5000,
};

// Test data
const testPaymentRequest = {
  userName: testConfig.username,
  password: testConfig.password,
  orderNumber: `TEST-${Date.now()}`,
  amount: 10000, // 100.00 EUR in cents
  currency: 'EUR',
  returnUrl: 'http://localhost:3001/payment/success',
  failUrl: 'http://localhost:3001/payment/failure',
  description: 'Test Order Payment',
  pageView: 'DESKTOP',
  language: 'en',
  jsonParams: JSON.stringify({
    orderId: `TEST-${Date.now()}`,
    customerEmail: 'test@example.com'
  })
};

async function testClicToPayAPI() {
  console.log('🧪 ClicToPay API Integration Test');
  console.log('==================================\n');

  console.log('1. Testing API connectivity...');
  try {
    const response = await axios.post(
      `${testConfig.apiUrl}/register.do`,
      new URLSearchParams(testPaymentRequest).toString(),
      {
        timeout: testConfig.timeout,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'Vendure-ClicToPay/1.0-TEST'
        }
      }
    );

    console.log('✅ API Response received:');
    console.log('Status:', response.status);
    console.log('Data:', response.data);

  } catch (error) {
    if (error.code === 'ENOTFOUND') {
      console.log('❌ DNS Error: ClicToPay sandbox URL not reachable');
      console.log('   This is expected if using test credentials');
    } else if (error.response) {
      console.log('❌ API Error Response:');
      console.log('   Status:', error.response.status);
      console.log('   Data:', error.response.data);
    } else {
      console.log('❌ Network Error:', error.message);
    }
  }

  console.log('\n2. Testing URL building...');
  const baseUrl = 'http://localhost:3001';
  const orderCode = 'TEST-123';
  
  const successUrl = `${baseUrl}/payment/success?order=${orderCode}`;
  const failureUrl = `${baseUrl}/payment/failure?order=${orderCode}`;
  
  console.log('✅ Success URL:', successUrl);
  console.log('✅ Failure URL:', failureUrl);

  console.log('\n3. Testing webhook signature generation...');
  const webhookSecret = 'clictopay_webhook_secret_123';
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({
    orderId: 'CLICTO-123456',
    orderNumber: 'TEST-123',
    status: 'PAID',
    amount: 10000,
    currency: 'EUR'
  });
  
  const message = `${timestamp}.${payload}`;
  const signature = crypto.createHmac('sha256', webhookSecret).update(message).digest('hex');
  const fullSignature = `t=${timestamp},v1=${signature}`;
  
  console.log('✅ Webhook signature generated:');
  console.log('   Timestamp:', timestamp);
  console.log('   Signature:', fullSignature);

  console.log('\n4. Testing order metadata...');
  const orderMetadata = {
    orderId: 'TEST-123',
    customerEmail: 'test@example.com',
    items: [
      { name: 'Test Product', quantity: 2, price: 5000 }
    ],
    shipping: {
      country: 'MA',
      city: 'Casablanca'
    }
  };
  
  console.log('✅ Order metadata:', JSON.stringify(orderMetadata, null, 2));

  console.log('\n🎉 API Integration Test Complete!');
  console.log('Next steps:');
  console.log('- Replace test credentials with real ClicToPay sandbox credentials');
  console.log('- Test with actual payment flow in Vendure');
  console.log('- Configure webhook URL in ClicToPay dashboard');
}

// Run the test
if (require.main === module) {
  testClicToPayAPI().catch(console.error);
}

module.exports = { testClicToPayAPI };