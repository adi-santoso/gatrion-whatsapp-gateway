import './style.css'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div style="max-width: 1200px; margin: 0 auto; padding: 40px 20px;">
    <h1 style="font-size: 2.5rem; margin-bottom: 10px;">WhatsApp Gateway Dashboard</h1>
    <p style="color: #888; margin-bottom: 40px;">Multi-Session WhatsApp API Gateway</p>
    
    <div style="display: grid; gap: 20px; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));">
      <div style="background: #1e1e1e; padding: 30px; border-radius: 8px;">
        <h2 style="margin-top: 0;">📱 Sessions</h2>
        <p>Manage your WhatsApp sessions</p>
        <button id="view-sessions" style="margin-top: 20px; padding: 10px 20px; background: #646cff; color: white; border: none; border-radius: 4px; cursor: pointer;">
          View Sessions
        </button>
      </div>
      
      <div style="background: #1e1e1e; padding: 30px; border-radius: 8px;">
        <h2 style="margin-top: 0;">📊 API Status</h2>
        <p id="api-status">Checking...</p>
        <code style="display: block; margin-top: 10px; padding: 10px; background: #000; border-radius: 4px; font-size: 0.85rem;">
          GET /api/health
        </code>
      </div>
      
      <div style="background: #1e1e1e; padding: 30px; border-radius: 8px;">
        <h2 style="margin-top: 0;">📚 Documentation</h2>
        <p>API endpoints and usage guide</p>
        <a href="https://github.com/adi-santoso/gatrion-whatsapp-gateway" target="_blank" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background: #333; color: white; text-decoration: none; border-radius: 4px;">
          View on GitHub
        </a>
      </div>
    </div>
    
    <div style="margin-top: 40px; padding: 30px; background: #1e1e1e; border-radius: 8px;">
      <h2>Quick Start</h2>
      <pre style="background: #000; padding: 20px; border-radius: 4px; overflow-x: auto;"><code># Create a session
curl -X POST http://localhost:3333/api/sessions \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"name": "My Session"}'

# Send a message
curl -X POST http://localhost:3333/api/send-text \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{
    "sessionId": "session-xxx",
    "to": "628123456789",
    "message": "Hello from WhatsApp Gateway!"
  }'</code></pre>
    </div>
  </div>
`

// Check API health
async function checkAPIHealth() {
  try {
    const res = await fetch('/api/health')
    const data = await res.json()
    const statusEl = document.querySelector('#api-status')
    if (statusEl) {
      statusEl.innerHTML = `✅ <strong>Online</strong><br><small>Uptime: ${Math.floor(data.uptime / 1000)}s</small>`
    }
  } catch (error) {
    const statusEl = document.querySelector('#api-status')
    if (statusEl) {
      statusEl.innerHTML = `❌ <strong>Offline</strong>`
    }
  }
}

// View sessions
document.querySelector('#view-sessions')?.addEventListener('click', async () => {
  window.location.href = '/api/sessions'
})

checkAPIHealth()
