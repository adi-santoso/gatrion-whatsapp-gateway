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

describe('Health Check', () => {
  test('GET /api/health returns 200', async () => {
    const { response, data } = await request('/health');
    assert.strictEqual(response.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(data.status);
    assert.ok(data.timestamp);
  });
});

describe('Authentication', () => {
  test('Protected routes require API key', async () => {
    const { response } = await request('/status');
    assert.strictEqual(response.status, 401);
  });

  test('Invalid API key returns 401', async () => {
    const { response } = await request('/status', {
      headers: { 'x-api-key': 'invalid-key' }
    });
    assert.strictEqual(response.status, 401);
  });

  test('Valid API key allows access', async () => {
    const { response } = await request('/status', {
      headers: { 'x-api-key': API_KEY }
    });
    assert.ok(response.status === 200 || response.status === 503);
  });
});

describe('QR Code', () => {
  test('GET /api/qr returns QR or status', async () => {
    const { response, data } = await request('/qr', {
      headers: { 'x-api-key': API_KEY }
    });
    assert.ok(response.status === 200 || response.status === 503);
    if (response.status === 200) {
      assert.ok(data.qr || data.message);
    }
  });
});

describe('Status', () => {
  test('GET /api/status returns connection state', async () => {
    const { response, data } = await request('/status', {
      headers: { 'x-api-key': API_KEY }
    });
    assert.ok(response.status === 200 || response.status === 503);
    assert.ok(data.status !== undefined);
  });
});

describe('Send Text Validation', () => {
  test('Missing to field returns error', async () => {
    const { response, data } = await request('/send-text', {
      method: 'POST',
      headers: { 'x-api-key': API_KEY },
      body: JSON.stringify({ message: 'test' })
    });
    assert.strictEqual(response.status, 400);
    assert.strictEqual(data.success, false);
  });

  test('Missing message field returns error', async () => {
    const { response, data } = await request('/send-text', {
      method: 'POST',
      headers: { 'x-api-key': API_KEY },
      body: JSON.stringify({ to: '1234567890' })
    });
    assert.strictEqual(response.status, 400);
    assert.strictEqual(data.success, false);
  });

  test('Invalid phone format returns error', async () => {
    const { response, data } = await request('/send-text', {
      method: 'POST',
      headers: { 'x-api-key': API_KEY },
      body: JSON.stringify({ to: 'invalid', message: 'test' })
    });
    assert.strictEqual(response.status, 400);
    assert.strictEqual(data.success, false);
  });

  test('Empty message returns error', async () => {
    const { response, data } = await request('/send-text', {
      method: 'POST',
      headers: { 'x-api-key': API_KEY },
      body: JSON.stringify({ to: '1234567890', message: '' })
    });
    assert.strictEqual(response.status, 400);
    assert.strictEqual(data.success, false);
  });
});

describe('Rate Limiting', () => {
  test('21st request returns 429', async () => {
    const requests = [];
    for (let i = 0; i < 21; i++) {
      requests.push(
        request('/send-text', {
          method: 'POST',
          headers: { 'x-api-key': API_KEY },
          body: JSON.stringify({ to: '1234567890', message: 'test' })
        })
      );
    }
    const results = await Promise.all(requests);
    const rateLimited = results.some(r => r.response.status === 429);
    assert.ok(rateLimited, 'Expected at least one 429 response');
  });
});

describe('Security Headers', () => {
  test('Security headers present', async () => {
    const { response } = await request('/health');
    assert.ok(response.headers.get('x-frame-options'));
    assert.ok(response.headers.get('x-content-type-options'));
    assert.ok(response.headers.get('x-xss-protection'));
  });
});
