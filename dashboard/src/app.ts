import './style.css'

// Check if logged in
const apiKey = localStorage.getItem('apiKey')

if (!apiKey) {
  showLoginPage()
} else {
  verifyAndShowDashboard(apiKey)
}

function showLoginPage() {
  document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px;">
      <div style="width: 100%; max-width: 400px;">
        <div style="background: #1e1e1e; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
          <h1 style="text-align: center; margin-bottom: 10px; font-size: 1.8rem;">🔐 WhatsApp Gateway</h1>
          <p style="text-align: center; color: #888; margin-bottom: 30px; font-size: 0.9rem;">Enter API Key to continue</p>
          
          <form id="login-form">
            <div style="margin-bottom: 20px;">
              <label style="display: block; margin-bottom: 8px; font-size: 0.9rem; color: #aaa;">API Key</label>
              <input 
                type="password" 
                id="api-key" 
                placeholder="Enter your API key"
                style="width: 100%; padding: 12px; background: #2a2a2a; border: 1px solid #444; border-radius: 6px; color: #fff; font-size: 0.95rem;"
                required
              />
            </div>
            
            <div id="error-message" style="display: none; padding: 10px; background: #ff4444; border-radius: 6px; margin-bottom: 15px; font-size: 0.9rem;">
            </div>
            
            <button 
              type="submit" 
              style="width: 100%; padding: 12px; background: #646cff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem; font-weight: 500;"
            >
              Login
            </button>
          </form>
          
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #333; text-align: center;">
            <p style="font-size: 0.85rem; color: #666; margin: 0;">
              API key is stored locally in your browser
            </p>
          </div>
        </div>
      </div>
    </div>
  `

  const form = document.querySelector('#login-form')
  form?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const input = document.querySelector<HTMLInputElement>('#api-key')
    const apiKey = input?.value.trim()
    
    if (apiKey) {
      await login(apiKey)
    }
  })
}

async function login(apiKey: string) {
  const errorDiv = document.querySelector('#error-message') as HTMLDivElement
  const submitBtn = document.querySelector('button[type="submit"]') as HTMLButtonElement
  
  // Show loading
  submitBtn.disabled = true
  submitBtn.textContent = 'Verifying...'
  errorDiv.style.display = 'none'
  
  try {
    // Verify API key by hitting /api/health with auth
    const res = await fetch('/api/sessions', {
      headers: {
        'x-api-key': apiKey
      }
    })
    
    if (res.ok) {
      // Valid API key
      localStorage.setItem('apiKey', apiKey)
      location.reload()
    } else if (res.status === 401 || res.status === 403) {
      // Invalid API key
      errorDiv.textContent = '❌ Invalid API Key'
      errorDiv.style.display = 'block'
      submitBtn.disabled = false
      submitBtn.textContent = 'Login'
    } else {
      throw new Error('Server error')
    }
  } catch (error) {
    errorDiv.textContent = '❌ Cannot connect to server'
    errorDiv.style.display = 'block'
    submitBtn.disabled = false
    submitBtn.textContent = 'Login'
  }
}

async function verifyAndShowDashboard(apiKey: string) {
  try {
    // Verify API key is still valid
    const res = await fetch('/api/health', {
      headers: {
        'x-api-key': apiKey
      }
    })
    
    if (!res.ok && (res.status === 401 || res.status === 403)) {
      // API key invalid, logout
      localStorage.removeItem('apiKey')
      location.reload()
      return
    }
    
    showDashboard(apiKey)
  } catch (error) {
    showDashboard(apiKey)
  }
}

function showDashboard(apiKey: string) {
  document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
    <div style="max-width: 1200px; margin: 0 auto; padding: 40px 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px;">
        <div>
          <h1 style="font-size: 2.5rem; margin: 0 0 10px 0;">WhatsApp Gateway Dashboard</h1>
          <p style="color: #888; margin: 0;">Multi-Session WhatsApp API Gateway</p>
        </div>
        <button 
          id="logout-btn"
          style="padding: 10px 20px; background: #333; color: #fff; border: none; border-radius: 6px; cursor: pointer;"
        >
          🚪 Logout
        </button>
      </div>
      
      <div style="display: grid; gap: 20px; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));">
        <div style="background: #1e1e1e; padding: 30px; border-radius: 8px;">
          <h2 style="margin-top: 0;">📱 Sessions</h2>
          <p id="session-count">Loading...</p>
          <button id="view-sessions" style="margin-top: 20px; padding: 10px 20px; background: #646cff; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Manage Sessions
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
curl -X POST ${window.location.origin}/api/sessions \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"name": "My Session"}'

# Send a message
curl -X POST ${window.location.origin}/api/send-text \\
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

  // Logout button
  document.querySelector('#logout-btn')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('apiKey')
      location.reload()
    }
  })

  // Load session count
  loadSessionCount(apiKey)
  
  // Check API health
  checkAPIHealth()
  
  // View sessions button
  document.querySelector('#view-sessions')?.addEventListener('click', () => {
    viewSessions(apiKey)
  })
}

async function loadSessionCount(apiKey: string) {
  try {
    const res = await fetch('/api/sessions', {
      headers: {
        'x-api-key': apiKey
      }
    })
    const data = await res.json()
    
    const countEl = document.querySelector('#session-count')
    if (countEl) {
      const count = data.data?.length || 0
      const connected = data.data?.filter((s: any) => s.status === 'connected').length || 0
      countEl.innerHTML = `<strong>${count}</strong> total sessions<br><small>${connected} connected</small>`
    }
  } catch (error) {
    const countEl = document.querySelector('#session-count')
    if (countEl) {
      countEl.textContent = 'Failed to load'
    }
  }
}

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

function viewSessions(apiKey: string) {
  window.open('/api/sessions?x-api-key=' + apiKey, '_blank')
}
