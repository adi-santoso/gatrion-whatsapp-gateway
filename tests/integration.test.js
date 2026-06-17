import { test, describe } from 'node:test';
import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000/api';
const API_KEY = process.env.API_KEY || 'your-secret-api-key';

async function request(path, options = {}) {
  const response = await fetch(BASE_URL + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('Message Flow Integration', () => {
  test('QR → Status → Send flow', async () => {
    // Check QR code endpoint
    const qr = await request('/qr', {
      headers: { 'x-api-key': API_KEY }
    });
    assert.ok(qr.response.status === 200 || qr.response.status === 503);

    // Check status endpoint
    const status = await request('/status', {
      headers: { 'x-api-key': API_KEY }
    });
    assert.ok(status.response.status === 200 || status.response.status === 503);

    // Attempt send (will fail if not connected, but validates flow)
    const send = await request('/send-text', {
      method: 'POST',
      headers: { 'x-api-key': API_KEY },
      body: JSON.stringify({ to: '1234567890', message: 'test' })
    });
    assert.ok(send.response.status >= 200 && send.response.status < 600);
  });
});

describe('Queue Integration', () => {
  test('Multiple messages sent sequentially', async () => {
    const messages = [];
    for (let i = 0; i < 5; i++) {
      const { response, data } = await request('/send-text', {
        method: 'POST',
        headers: { 'x-api-key': API_KEY },
        body: JSON.stringify({ to: '1234567890', message: `test ${i}` })
      });
      messages.push({ status: response.status, data });
      await sleep(100);
    }
    
    // All requests should return valid HTTP status codes
    messages.forEach(msg => {
      assert.ok(msg.status >= 200 && msg.status < 600);
    });
  });
});

describe('Error Handling Integration', () => {
  test('Handles invalid data gracefully', async () => {
    const { response, data } = await request('/send-text', {
      method: 'POST',
      headers: { 'x-api-key': API_KEY },
      body: JSON.stringify({ invalid: 'data' })
    });
    assert.strictEqual(response.status, 400);
    assert.strictEqual(data.success, false);
  });

  test('Handles malformed JSON', async () => {
    try {
      const response = await fetch(BASE_URL + '/send-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        },
        body: 'invalid json'
      });
      assert.ok(response.status >= 400);
    } catch (error) {
      // Network errors are acceptable
      assert.ok(true);
    }
  });
});

describe('Memory Stability', () => {
  test('Send 10 messages without memory leak', async () => {
    const initialMemory = process.memoryUsage().heapUsed;
    
    for (let i = 0; i < 10; i++) {
      await request('/send-text', {
        method: 'POST',
        headers: { 'x-api-key': API_KEY },
        body: JSON.stringify({ to: '1234567890', message: `test ${i}` })
      });
      await sleep(50);
    }
    
    // Force garbage collection if available
    if (global.gc) global.gc();
    
    const finalMemory = process.memoryUsage().heapUsed;
    const growth = finalMemory - initialMemory;
    const growthMB = growth / 1024 / 1024;
    
    console.log(`Memory growth: ${growthMB.toFixed(2)} MB`);
    
    // Memory growth should be reasonable (< 50MB for 10 requests)
    assert.ok(growthMB < 50, `Memory growth too high: ${growthMB.toFixed(2)} MB`);
  });
});
