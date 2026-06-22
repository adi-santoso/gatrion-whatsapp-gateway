const API_KEY = 'ab64fc4ff220b7cf13de38d993cb8f9b748d001a2ccbffc8cabd248912f19579';
const BASE_URL = 'http://localhost:3333/api';

async function testSendText() {
  console.log('🧪 Testing POST /api/send-text...\n');

  try {
    // 1. Get all sessions
    console.log('1️⃣ Getting sessions...');
    const sessionsRes = await fetch(`${BASE_URL}/sessions`, {
      headers: { 'x-api-key': API_KEY }
    });
    const sessionsData = await sessionsRes.json();
    console.log('Sessions:', JSON.stringify(sessionsData, null, 2));

    if (!sessionsData.data || sessionsData.data.length === 0) {
      console.log('\n❌ No sessions found. Create a session first!');
      return;
    }

    const sessionId = sessionsData.data[0].sessionId;
    const status = sessionsData.data[0].status;
    
    console.log(`\n2️⃣ Using session: ${sessionId}`);
    console.log(`   Status: ${status}`);

    if (status !== 'connected') {
      console.log('\n❌ Session not connected. Scan QR code first!');
      return;
    }

    // 2. Send text message
    console.log('\n3️⃣ Sending text message...');
    const sendRes = await fetch(`${BASE_URL}/send-text`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionId: sessionId,
        to: '085727042754', // From your error log
        message: 'santoso, booking untuk *santoso jr* berhasil dibuat!\n\n📅 Tanggal: 19/06/2026\n🕐 Jam: 08:00\n👨‍⚕️ Dokter: Santoso\n📋 Layanan: Konsultasi\n\nNo. Antrean: *01*\n\nMohon datang 10 menit sebelum jadwal. Terima kasih! 🙏'
      })
    });

    const sendData = await sendRes.json();
    console.log('Response:', JSON.stringify(sendData, null, 2));

    if (sendData.success) {
      console.log('\n✅ Message sent successfully!');
    } else {
      console.log('\n❌ Failed to send message');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Server is not running. Start with: npm start');
    }
    if (error.name === 'AbortError') {
      console.log('💡 Request timeout - possible infinite loop');
    }
  }
}

testSendText();
