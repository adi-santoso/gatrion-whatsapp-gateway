import { describe, it, after } from 'node:test';
import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000/api';
const createdSessionIds = [];

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

async function createTestSession(name = 'Test Session') {
  const { response, data } = await request('/sessions', {
    method: 'POST',
    body: JSON.stringify({ name })
  });
  if (response.status === 201 && data.data?.sessionId) {
    createdSessionIds.push(data.data.sessionId);
  }
  return { response, data };
}

async function deleteTestSession(sessionId) {
  await request(`/sessions/${sessionId}`, { method: 'DELETE' });
}

describe('Session Management', () => {
  it('should create a new session', async () => {
    const { response, data } = await createTestSession('Test Session 1');
    
    assert.strictEqual(response.status, 201);
    assert.strictEqual(data.success, true);
    assert.ok(data.data.sessionId);
    assert.strictEqual(data.data.name, 'Test Session 1');
    assert.ok(data.data.status);
  });
  
  it('should prevent duplicate session creation', async () => {
    const sessionId = 'test-duplicate-' + Date.now();
    
    const first = await request('/sessions', {
      method: 'POST',
      body: JSON.stringify({ sessionId, name: 'First' })
    });
    
    if (first.response.status === 201) {
      createdSessionIds.push(sessionId);
    }
    
    const second = await request('/sessions', {
      method: 'POST',
      body: JSON.stringify({ sessionId, name: 'Second' })
    });
    
    assert.strictEqual(first.response.status, 201);
    assert.strictEqual(second.response.status, 400);
    assert.ok(second.data.error);
  });
  
  it('should list all sessions', async () => {
    const { response, data } = await request('/sessions');
    
    assert.strictEqual(response.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.data));
  });
  
  it('should get single session details', async () => {
    const { data: createData } = await createTestSession('Detail Test');
    const sessionId = createData.data.sessionId;
    
    const { response, data } = await request(`/sessions/${sessionId}`);
    
    assert.strictEqual(response.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.sessionId, sessionId);
    assert.strictEqual(data.data.name, 'Detail Test');
    assert.ok(data.data.status);
  });
  
  it('should return 404 for non-existent session', async () => {
    const { response, data } = await request('/sessions/invalid-id-999');
    
    assert.strictEqual(response.status, 404);
    assert.strictEqual(data.success, false);
  });
  
  it('should update webhook config', async () => {
    const { data: createData } = await createTestSession('Webhook Test');
    const sessionId = createData.data.sessionId;
    
    const { response, data } = await request(`/sessions/${sessionId}/webhook`, {
      method: 'PATCH',
      body: JSON.stringify({
        webhookUrl: 'https://example.com/webhook',
        webhookEnabled: true
      })
    });
    
    assert.strictEqual(response.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.webhookUrl, 'https://example.com/webhook');
    assert.strictEqual(data.data.webhookEnabled, true);
  });
  
  it('should delete session', async () => {
    const { data: createData } = await createTestSession('Delete Test');
    const sessionId = createData.data.sessionId;
    
    const deleteRes = await request(`/sessions/${sessionId}`, {
      method: 'DELETE'
    });
    
    assert.strictEqual(deleteRes.response.status, 200);
    assert.strictEqual(deleteRes.data.success, true);
    
    const getRes = await request(`/sessions/${sessionId}`);
    assert.strictEqual(getRes.response.status, 404);
    
    const index = createdSessionIds.indexOf(sessionId);
    if (index > -1) createdSessionIds.splice(index, 1);
  });
});

describe('Send Messages with SessionId', () => {
  it('should reject send-text without sessionId', async () => {
    const { response, data } = await request('/send-text', {
      method: 'POST',
      body: JSON.stringify({ to: '1234567890', message: 'test' })
    });
    
    assert.strictEqual(response.status, 400);
    assert.strictEqual(data.success, false);
    assert.ok(data.error.includes('sessionId'));
  });
  
  it('should reject send-text with invalid sessionId', async () => {
    const { response, data } = await request('/send-text', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'invalid-session-999',
        to: '1234567890',
        message: 'test'
      })
    });
    
    assert.strictEqual(response.status, 400);
    assert.strictEqual(data.success, false);
  });
  
  it('should reject send-text when session not connected', async () => {
    const { data: createData } = await createTestSession('Send Test');
    const sessionId = createData.data.sessionId;
    
    const { response, data } = await request('/send-text', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        to: '1234567890',
        message: 'test'
      })
    });
    
    assert.strictEqual(response.status, 400);
    assert.strictEqual(data.success, false);
  });
  
  it('should reject send-image without sessionId', async () => {
    const { response, data } = await request('/send-image', {
      method: 'POST',
      body: JSON.stringify({ to: '1234567890' })
    });
    
    assert.strictEqual(response.status, 400);
    assert.strictEqual(data.success, false);
    assert.ok(data.error.includes('sessionId'));
  });
});

describe('QR and Status Endpoints', () => {
  it('should require sessionId for QR endpoint', async () => {
    const { response, data } = await request('/qr');
    
    assert.strictEqual(response.status, 400);
    assert.strictEqual(data.success, false);
    assert.ok(data.error.includes('sessionId'));
  });
  
  it('should require sessionId for status endpoint', async () => {
    const { response, data } = await request('/status');
    
    assert.strictEqual(response.status, 400);
    assert.strictEqual(data.success, false);
    assert.ok(data.error.includes('sessionId'));
  });
  
  it('should return QR code when available', async () => {
    const { data: createData } = await createTestSession('QR Test');
    const sessionId = createData.data.sessionId;
    
    const { response, data } = await request(`/sessions/${sessionId}/qr`);
    
    assert.strictEqual(response.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(data.data.hasOwnProperty('qr'));
    assert.ok(data.data.status);
  });
  
  it('should return session status', async () => {
    const { data: createData } = await createTestSession('Status Test');
    const sessionId = createData.data.sessionId;
    
    const { response, data } = await request(`/sessions/${sessionId}/status`);
    
    assert.strictEqual(response.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(data.data.status);
  });
  
  it('should return 404 for QR of non-existent session', async () => {
    const { response, data } = await request('/qr?sessionId=invalid-999');
    
    assert.strictEqual(response.status, 404);
    assert.strictEqual(data.success, false);
  });
  
  it('should return 404 for status of non-existent session', async () => {
    const { response, data } = await request('/status?sessionId=invalid-999');
    
    assert.strictEqual(response.status, 404);
    assert.strictEqual(data.success, false);
  });
});

describe('Multi-Session Isolation', () => {
  it('should handle multiple sessions independently', async () => {
    const { data: session1Data } = await createTestSession('Session 1');
    const { data: session2Data } = await createTestSession('Session 2');
    
    const session1Id = session1Data.data.sessionId;
    const session2Id = session2Data.data.sessionId;
    
    assert.notStrictEqual(session1Id, session2Id);
    
    const s1 = await request(`/sessions/${session1Id}`);
    const s2 = await request(`/sessions/${session2Id}`);
    
    assert.strictEqual(s1.data.data.name, 'Session 1');
    assert.strictEqual(s2.data.data.name, 'Session 2');
  });
  
  it('should not leak QR codes between sessions', async () => {
    const { data: session1Data } = await createTestSession('QR Session 1');
    const { data: session2Data } = await createTestSession('QR Session 2');
    
    const session1Id = session1Data.data.sessionId;
    const session2Id = session2Data.data.sessionId;
    
    const qr1 = await request(`/sessions/${session1Id}/qr`);
    const qr2 = await request(`/sessions/${session2Id}/qr`);
    
    assert.strictEqual(qr1.response.status, 200);
    assert.strictEqual(qr2.response.status, 200);
    
    if (qr1.data.data.qr && qr2.data.data.qr) {
      assert.notStrictEqual(qr1.data.data.qr, qr2.data.data.qr);
    }
  });
});

describe('Database Persistence', () => {
  it('should persist session to database', async () => {
    const { data: createData } = await createTestSession('Persist Test');
    const sessionId = createData.data.sessionId;
    
    const { response, data } = await request(`/sessions/${sessionId}`);
    
    assert.strictEqual(response.status, 200);
    assert.strictEqual(data.data.sessionId, sessionId);
    assert.ok(data.data.createdAt);
  });
});

after(async () => {
  console.log(`\nCleaning up ${createdSessionIds.length} test sessions...`);
  
  for (const sessionId of createdSessionIds) {
    try {
      await deleteTestSession(sessionId);
    } catch (err) {
      console.error(`Failed to cleanup ${sessionId}:`, err.message);
    }
  }
  
  console.log('Cleanup complete');
});
