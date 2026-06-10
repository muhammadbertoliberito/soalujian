import handler from '../api/webhook.js';
import crypto from 'crypto';

// Setup environment for testing
process.env.HMAC_SECRET = 'test_secret_key_12345';
process.env.TELEGRAM_BOT_TOKEN = ''; // Empty to skip network dispatch during unit test
process.env.TELEGRAM_CHAT_ID = '';

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(obj) {
      this.body = obj;
      return this;
    }
  };
}

async function runTests() {
  console.log('🧪 RUNNING SECURITY WORKFLOW TESTS...\n');
  let passed = 0;
  let failed = 0;

  // Test Case 1: Valid HMAC Webhook Signature
  try {
    const payload = {
      status: 'BAHAYA',
      level: 3,
      message: 'Uji Ancaman Valid',
      timestamp: Date.now()
    };
    const payloadString = JSON.stringify(payload);
    
    // Calculate signature
    const signature = crypto
      .createHmac('sha256', process.env.HMAC_SECRET)
      .update(payloadString)
      .digest('hex');

    const req = {
      method: 'POST',
      headers: {
        'x-signature': signature
      },
      body: payload
    };
    
    const res = mockRes();
    await handler(req, res);

    if (res.statusCode === 200 && res.body.success === true) {
      console.log('✅ TEST 1 PASSED: Valid HMAC signature accepted successfully.');
      passed++;
    } else {
      console.error('❌ TEST 1 FAILED: Valid signature rejected.', res.statusCode, res.body);
      failed++;
    }
  } catch (error) {
    console.error('❌ TEST 1 EXCEPTION:', error);
    failed++;
  }

  // Test Case 2: Invalid/Tampered HMAC Signature (Spoofing)
  try {
    const payload = {
      status: 'BAHAYA',
      level: 3,
      message: 'Uji Ancaman Palsu',
      timestamp: Date.now()
    };
    
    const req = {
      method: 'POST',
      headers: {
        'x-signature': 'invalid_tampered_signature_abcd1234'
      },
      body: payload
    };
    
    const res = mockRes();
    await handler(req, res);

    if (res.statusCode === 401 && res.body.error.includes('Palsu!')) {
      console.log('✅ TEST 2 PASSED: Tampered/invalid HMAC signature successfully blocked.');
      passed++;
    } else {
      console.error('❌ TEST 2 FAILED: Tampered signature did not return 401 unauthorized.', res.statusCode, res.body);
      failed++;
    }
  } catch (error) {
    console.error('❌ TEST 2 EXCEPTION:', error);
    failed++;
  }

  // Test Case 3: Missing Signature Header
  try {
    const payload = { status: 'AMAN', level: 0 };
    const req = {
      method: 'POST',
      headers: {}, // No x-signature header
      body: payload
    };
    
    const res = mockRes();
    await handler(req, res);

    if (res.statusCode === 400 && res.body.error.includes('Missing x-signature')) {
      console.log('✅ TEST 3 PASSED: Request with missing signature header rejected.');
      passed++;
    } else {
      console.error('❌ TEST 3 FAILED: Missing signature header did not return 400 bad request.', res.statusCode, res.body);
      failed++;
    }
  } catch (error) {
    console.error('❌ TEST 3 EXCEPTION:', error);
    failed++;
  }

  console.log(`\n📊 TEST RESULTS: ${passed} passed, ${failed} failed.\n`);
  
  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
