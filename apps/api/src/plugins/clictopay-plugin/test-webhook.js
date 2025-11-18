#!/usr/bin/env node
/**
 * ClicToPay Webhook Test Script
 * Simulates webhook calls to test the webhook endpoint
 */

const axios = require('axios');
const crypto = require('crypto');

const WEBHOOK_SECRET = 'clictopay_webhook_secret_123';
const VENDURE_BASE_URL = 'http://localhost:3000';
const WEBHOOK_URL = `${VENDURE_BASE_URL}/clictopay/webhook`;

function createWebhookSignature(payload, timestamp, secret) {
  const message = `${timestamp}.${payload}`;
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

function createWebhookPayload(data) {
  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createWebhookSignature(payload, timestamp, WEBHOOK_SECRET);
  
  return {
    payload,
    headers: {
      'x-clictopay-signature': `t=${timestamp},v1=${signature}`,
      'x-clictopay-timestamp': timestamp.toString(),
      'content-type': 'application/json',
      'user-agent': 'ClicToPay-Webhook/1.0'
    }
  };
}

async function testWebhook(name, webhookData) {
  console.log(`\n🧪 Testing: ${name}`);
  console.log('=' .repeat(50));
  
  const { payload, headers } = createWebhookPayload(webhookData);
  
  console.log('Payload:', payload);
  console.log('Headers:', JSON.stringify(headers, null, 2));
  
  try {
    const response = await axios.post(WEBHOOK_URL, payload, { 
      headers,
      timeout: 5000 
    });
    
    console.log('✅ Response Status:', response.status);
    console.log('✅ Response Data:', response.data);
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Connection refused - Vendure server not running');
      console.log('   Start Vendure with: npm run dev');
      return false;
    } else if (error.response) {
      console.log('❌ HTTP Error:', error.response.status);
      console.log('❌ Error Data:', error.response.data);
      return false;
    } else {
      console.log('❌ Network Error:', error.message);
      return false;
    }
  }
}

async function runWebhookTests() {
  console.log('🚀 ClicToPay Webhook Test Suite');
  console.log('================================\n');
  
  console.log('Target webhook URL:', WEBHOOK_URL);
  console.log('Using webhook secret:', WEBHOOK_SECRET ? '***SET***' : 'MISSING');
  
  // Test 1: Successful Payment
  await testWebhook('Successful Payment Webhook', {
    orderId: 'CLICTO-123456',
    orderNumber: 'ORD-123',
    status: 'PAID',
    amount: 10000,
    currency: 'EUR',
    authRefNum: 'AUTH123456',
    depositedDate: '2025-11-18T12:00:00Z',
    ip: '192.168.1.1',
    cardholderName: 'John Doe'
  });
  
  // Test 2: Failed Payment
  await testWebhook('Failed Payment Webhook', {
    orderId: 'CLICTO-789012',
    orderNumber: 'ORD-456',
    status: 'FAILED',
    amount: 5000,
    currency: 'EUR',
    ip: '192.168.1.2'
  });
  
  // Test 3: Pending Payment
  await testWebhook('Pending Payment Webhook', {
    orderId: 'CLICTO-345678',
    orderNumber: 'ORD-789',
    status: 'PENDING',
    amount: 15000,
    currency: 'USD',
    ip: '192.168.1.3'
  });
  
  // Test 4: Invalid Signature (tampered payload)
  console.log('\n🧪 Testing: Invalid Signature (Security Test)');
  console.log('=' .repeat(50));
  
  try {
    const tamperedData = {
      orderId: 'CLICTO-999999',
      orderNumber: 'ORD-HACKED',
      status: 'PAID',
      amount: 999999, // Tampered amount
      currency: 'EUR'
    };
    
    const { payload } = createWebhookPayload(tamperedData);
    
    // Create invalid signature
    const fakeTimestamp = Math.floor(Date.now() / 1000);
    const fakeSignature = 'invalid_signature_12345';
    
    const response = await axios.post(WEBHOOK_URL, payload, {
      headers: {
        'x-clictopay-signature': `t=${fakeTimestamp},v1=${fakeSignature}`,
        'x-clictopay-timestamp': fakeTimestamp.toString(),
        'content-type': 'application/json',
        'user-agent': 'Evil-Bot/1.0'
      },
      timeout: 5000
    });
    
    console.log('❌ Security Error: Invalid signature was accepted!');
    console.log('Response:', response.status, response.data);
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ Security Test Passed: Invalid signature rejected');
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }
  
  // Test 5: Malformed JSON
  console.log('\n🧪 Testing: Malformed JSON');
  console.log('=' .repeat(50));
  
  try {
    const malformedPayload = '{ invalid json }';
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createWebhookSignature(malformedPayload, timestamp, WEBHOOK_SECRET);
    
    const response = await axios.post(WEBHOOK_URL, malformedPayload, {
      headers: {
        'x-clictopay-signature': `t=${timestamp},v1=${signature}`,
        'x-clictopay-timestamp': timestamp.toString(),
        'content-type': 'application/json'
      },
      timeout: 5000
    });
    
    console.log('❌ Error: Malformed JSON was accepted');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('✅ Malformed JSON correctly rejected');
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }
  
  console.log('\n🎉 Webhook Test Suite Complete!');
  console.log('\nNext Steps:');
  console.log('1. Start Vendure server: npm run dev');
  console.log('2. Check webhook logs in Vendure console');
  console.log('3. Verify order state changes in Admin UI');
  console.log('4. Test with ngrok for external webhooks');
}

// Health check function
async function healthCheck() {
  console.log('🔍 Checking Vendure server health...\n');
  
  try {
    const response = await axios.get(`${VENDURE_BASE_URL}/health`, { timeout: 3000 });
    console.log('✅ Vendure server is running');
    return true;
  } catch (error) {
    console.log('❌ Vendure server is not accessible');
    console.log('   Make sure to run: npm run dev');
    return false;
  }
}

// Main execution
async function main() {
  const isHealthy = await healthCheck();
  
  if (process.argv.includes('--force') || isHealthy) {
    await runWebhookTests();
  } else {
    console.log('\nUse --force to run tests anyway');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testWebhook, createWebhookSignature, runWebhookTests };