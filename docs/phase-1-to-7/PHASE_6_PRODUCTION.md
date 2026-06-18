# PHASE 6: Production Ready

**Objective:** Setup PM2, graceful shutdown, monitoring, dan production configuration

**Estimated Time:** 20 minutes  
**Dependencies:** PHASE_5_SECURITY.md (completed)  
**Next Phase:** PHASE_7_TESTING.md

---

## 📋 Tasks Checklist

- [ ] PM2 ecosystem configuration
- [ ] Graceful shutdown handler
- [ ] Process monitoring
- [ ] Logging to file (production)
- [ ] Environment validation on startup
- [ ] Production README documentation
- [ ] Health check enhancement
- [ ] Startup script

---

## 🎯 Deliverables

### 1. ecosystem.config.js (PM2 Configuration)

**Requirements:**
- App name: whatsapp-gateway
- Script: src/index.js
- Instances: 1 (single WhatsApp session)
- Auto restart on crash
- Max memory: 512 MB
- Log files configuration
- Environment variables

**Configuration:**
```javascript
module.exports = {
    apps: [{
        name: 'whatsapp-gateway',
        script: './src/index.js',
        instances: 1,  // MUST be 1 (single WhatsApp session)
        exec_mode: 'fork',  // NOT cluster
        max_memory_restart: '512M',
        env_production: {
            NODE_ENV: 'production',
            PORT: 3000
        },
        env_development: {
            NODE_ENV: 'development',
            PORT: 3000
        },
        error_file: './logs/error.log',
        out_file: './logs/out.log',
        log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
        merge_logs: true,
        autorestart: true,
        max_restarts: 10,
        min_uptime: '10s',
        watch: false,  // Don't watch in production
        ignore_watch: ['node_modules', 'logs', 'auth_info_baileys'],
        kill_timeout: 5000  // Time for graceful shutdown
    }]
}
```

### 2. Update src/index.js (Graceful Shutdown)

**Add shutdown handler:**
```javascript
async function gracefulShutdown(signal) {
    logger.info(`${signal} received. Starting graceful shutdown...`)
    
    // 1. Stop accepting new connections
    server.close(() => {
        logger.info('HTTP server closed')
    })
    
    // 2. Disconnect WhatsApp
    try {
        await disconnectWhatsApp()
        logger.info('WhatsApp disconnected')
    } catch (error) {
        logger.error('Error disconnecting WhatsApp:', error)
    }
    
    // 3. Close any other resources
    // (database connections, redis, etc.)
    
    // 4. Exit
    logger.info('Graceful shutdown complete')
    process.exit(0)
}

// Register handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error)
    gracefulShutdown('UNCAUGHT_EXCEPTION')
})

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason)
    gracefulShutdown('UNHANDLED_REJECTION')
})
```

### 3. Update src/api/controllers/status.controller.js

**Enhanced Health Check:**
```javascript
export const health = async (req, res) => {
    const uptime = process.uptime()
    const memoryUsage = process.memoryUsage()
    
    const health = {
        success: true,
        data: {
            status: 'healthy',
            uptime: Math.floor(uptime),
            timestamp: new Date().toISOString(),
            memory: {
                used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
                external: Math.round(memoryUsage.external / 1024 / 1024),
                rss: Math.round(memoryUsage.rss / 1024 / 1024),
                unit: 'MB'
            },
            whatsapp: {
                connected: isConnected(),
                state: getConnectionState().state
            },
            nodeVersion: process.version,
            platform: process.platform,
            pid: process.pid
        }
    }
    
    res.json(health)
}
```

### 4. scripts/start.sh (Startup Script)

**Production start script:**
```bash
#!/bin/bash

echo "Starting WhatsApp Gateway..."

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "PM2 not found. Installing..."
    npm install -g pm2
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo "ERROR: .env file not found"
    echo "Copy .env.example to .env and configure it"
    exit 1
fi

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "ERROR: Node.js version 20+ required"
    echo "Current version: $(node -v)"
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Start with PM2
echo "Starting application with PM2..."
pm2 start ecosystem.config.js --env production

# Save PM2 process list
pm2 save

# Setup PM2 startup script
echo "Setting up PM2 startup..."
pm2 startup

echo "✓ WhatsApp Gateway started successfully!"
echo ""
echo "Commands:"
echo "  pm2 status           - Check status"
echo "  pm2 logs             - View logs"
echo "  pm2 monit            - Monitor resources"
echo "  pm2 restart all      - Restart app"
echo "  pm2 stop all         - Stop app"
echo "  pm2 delete all       - Remove app"
```

### 5. scripts/stop.sh (Stop Script)

```bash
#!/bin/bash

echo "Stopping WhatsApp Gateway..."

pm2 stop whatsapp-gateway
pm2 delete whatsapp-gateway

echo "✓ WhatsApp Gateway stopped"
```

### 6. src/utils/validateEnv.js

**Validate environment on startup:**
```javascript
import config from '../config/env.js'
import logger from './logger.js'

export function validateEnvironment() {
    const errors = []
    
    // Check required variables
    if (!config.apiKey || config.apiKey === 'your-secret-api-key-here') {
        errors.push('API_KEY must be set in production')
    }
    
    if (config.apiKey && config.apiKey.length < 32) {
        errors.push('API_KEY must be at least 32 characters')
    }
    
    if (!config.whatsapp.sessionPath) {
        errors.push('WA_SESSION_PATH is not set')
    }
    
    // Node version check
    const nodeVersion = process.version.match(/^v(\d+)/)[1]
    if (parseInt(nodeVersion) < 20) {
        errors.push(`Node.js 20+ required. Current: ${process.version}`)
    }
    
    if (errors.length > 0) {
        logger.error('Environment validation failed:')
        errors.forEach(err => logger.error(`  - ${err}`))
        
        if (config.nodeEnv === 'production') {
            process.exit(1)
        }
    } else {
        logger.info('✓ Environment validation passed')
    }
}
```

### 7. Update README.md

**Add production section:**
```markdown
## Production Deployment

### Prerequisites
- Node.js 20+
- PM2 (npm install -g pm2)
- Linux/Windows server with 1GB RAM

### Setup

1. Clone repository
2. Install dependencies: `npm install`
3. Copy environment: `cp .env.example .env`
4. Edit .env with your configuration
5. Generate secure API key (min 32 chars)

### Start

```bash
# Linux/Mac
chmod +x scripts/start.sh
./scripts/start.sh

# Windows
pm2 start ecosystem.config.js --env production
```

### Monitor

```bash
pm2 status              # Check status
pm2 logs                # View logs
pm2 monit               # Resource monitor
pm2 restart all         # Restart
pm2 stop all            # Stop
```

### Health Check

```bash
curl http://localhost:3000/health
```

### Backup Session

Important: Backup `auth_info_baileys/` directory regularly to prevent re-scanning QR.

### Logs

- Error logs: `./logs/error.log`
- Output logs: `./logs/out.log`
- Pino logs: JSON format

### Resource Usage

- RAM: ~100-150 MB normal operation
- CPU: <5% idle, 10-20% during message send
- Disk: <100 MB (excluding logs)

### Security Checklist

- [ ] Strong API key (32+ chars)
- [ ] CORS origin restricted
- [ ] Firewall configured
- [ ] HTTPS/reverse proxy (nginx/caddy)
- [ ] Rate limiting enabled
- [ ] Logs monitored
```

---

## 🔧 PM2 Useful Commands

```bash
# Start
pm2 start ecosystem.config.js --env production

# Monitor
pm2 monit                  # Live monitoring
pm2 status                 # Status overview
pm2 logs                   # Live logs
pm2 logs --lines 100       # Last 100 lines

# Control
pm2 restart whatsapp-gateway
pm2 reload whatsapp-gateway   # Zero-downtime (not applicable for single instance)
pm2 stop whatsapp-gateway
pm2 delete whatsapp-gateway

# Persistence
pm2 save                   # Save process list
pm2 startup                # Generate startup script
pm2 unstartup              # Remove startup script

# Logs
pm2 flush                  # Clear logs
pm2 logs --err             # Error logs only
pm2 logs --json            # JSON format
```

---

## ✅ Acceptance Criteria

### Functional:
1. ✓ PM2 starts application successfully
2. ✓ Application auto-restarts on crash
3. ✓ Graceful shutdown works (SIGTERM/SIGINT)
4. ✓ WhatsApp disconnects properly on shutdown
5. ✓ Environment validation runs on startup
6. ✓ Health check returns detailed info
7. ✓ Logs written to files in production

### Production-Ready:
1. ✓ Max memory limit enforced
2. ✓ Startup script works
3. ✓ Stop script works
4. ✓ Process monitoring available
5. ✓ Error handling for uncaught exceptions
6. ✓ Documentation complete

### Performance:
1. ✓ Restart time < 10 seconds
2. ✓ Memory stable over time
3. ✓ No memory leaks
4. ✓ CPU usage reasonable

---

## 🧪 Testing Scenarios

```bash
# Test 1: Start with PM2
pm2 start ecosystem.config.js
pm2 status
# Expected: App running, status "online"

# Test 2: Check health
curl http://localhost:3000/health
# Expected: Detailed health info

# Test 3: Monitor memory
pm2 monit
# Expected: Memory ~100-150 MB

# Test 4: Graceful shutdown
pm2 stop whatsapp-gateway
# Check logs for "Graceful shutdown complete"
# Expected: Clean shutdown, WhatsApp disconnected

# Test 5: Auto-restart on crash
pm2 start ecosystem.config.js
# Trigger crash (kill process)
pm2 status
# Expected: Auto-restarted

# Test 6: Memory limit
# Trigger memory leak (if possible)
# Expected: PM2 restarts at 512MB

# Test 7: Logs
pm2 logs --lines 50
# Expected: Structured logs visible

# Test 8: Startup persistence
pm2 save
pm2 startup
# Reboot server
# Expected: App auto-starts on boot
```

---

## 🎤 Prompt for Sub-Agent

```
You are tasked with PHASE 6: Production Ready.

Context:
- PHASE 5 completed (security implemented)
- Working directory: D:\working\gatrion\whatsapp
- All features functional, now prepare for production

Your tasks:
1. Create ecosystem.config.js (PM2 config)
2. Create scripts/start.sh (startup script)
3. Create scripts/stop.sh (stop script)
4. Create src/utils/validateEnv.js (environment validation)
5. Update src/index.js (add graceful shutdown)
6. Update src/api/controllers/status.controller.js (enhance health check)
7. Update README.md (add production section)

Requirements:

PM2 Configuration:
- Single instance (NOT cluster)
- Max memory: 512 MB
- Auto-restart on crash
- Log files: ./logs/
- Graceful shutdown timeout: 5s

Graceful Shutdown:
1. Stop accepting new connections (server.close)
2. Disconnect WhatsApp (await disconnectWhatsApp)
3. Close other resources
4. Exit process

Handle:
- SIGTERM
- SIGINT
- uncaughtException
- unhandledRejection

Environment Validation:
Check on startup:
- API_KEY set and >= 32 chars
- WA_SESSION_PATH set
- Node.js version >= 20
- Exit if validation fails in production

Enhanced Health Check:
Return:
- Status (healthy)
- Uptime (seconds)
- Memory usage (heap, RSS, external)
- WhatsApp connection state
- Node version
- Platform
- Process ID

Startup Script (Linux):
1. Check PM2 installed
2. Check .env exists
3. Check Node version
4. Install dependencies
5. Start with PM2
6. Save PM2 list
7. Setup PM2 startup

Documentation:
Add to README.md:
- Production prerequisites
- Deployment steps
- PM2 commands
- Monitoring guide
- Health check URL
- Backup instructions
- Security checklist
- Resource usage info

Key Points:
- Single instance only (WhatsApp limitation)
- Fork mode, NOT cluster
- Graceful shutdown MUST disconnect WhatsApp
- Environment validation on startup
- Comprehensive logging

Output:
- All files created/updated
- Scripts executable (chmod +x)
- Documentation clear and complete
- Production-ready configuration

Ready? Begin Phase 6.
```

---

## 🔍 Orchestrator Review Checklist

After sub-agent completes:
- [ ] ecosystem.config.js created correctly
- [ ] PM2 single instance configured
- [ ] Startup scripts work (Linux + Windows)
- [ ] Graceful shutdown implemented
- [ ] All shutdown signals handled
- [ ] WhatsApp disconnects on shutdown
- [ ] Environment validation works
- [ ] Health check enhanced
- [ ] README.md production section complete
- [ ] Logs directory created
- [ ] Scripts executable
- [ ] No cluster mode (must be fork)

### Critical Points to Verify:
1. **Single Instance:** PM2 must use `instances: 1` and `exec_mode: 'fork'`
2. **Graceful Shutdown:** WhatsApp MUST disconnect cleanly
3. **Memory Limit:** 512 MB max_memory_restart
4. **Environment Validation:** Fails in production if API_KEY not set
5. **Startup Script:** Works on fresh server

### Production Test:
```bash
# Simulate production deployment
1. Fresh directory
2. Run ./scripts/start.sh
3. Check PM2 status
4. Send test message
5. Stop gracefully
6. Check logs for clean shutdown
```

**Approval Required Before Phase 7**

---

**Status:** Ready for Execution  
**Assigned To:** Sub-Agent  
**Orchestrator:** Will verify production readiness & deployment process
