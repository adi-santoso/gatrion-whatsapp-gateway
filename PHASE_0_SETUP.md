# PHASE 0: Project Setup

**Objective:** Initialize project structure, dependencies, and configuration files

**Estimated Time:** 15 minutes  
**Dependencies:** None  
**Next Phase:** PHASE_1_BAILEYS.md

---

## 📋 Tasks Checklist

- [ ] Create project directory structure
- [ ] Initialize package.json with dependencies
- [ ] Create .gitignore
- [ ] Create .env.example
- [ ] Create README.md with basic instructions
- [ ] Verify Node.js version compatibility

---

## 🎯 Deliverables

### 1. package.json

**Requirements:**
- Project name: `whatsapp-gateway`
- Node version: `>=20.0.0`
- Type: `module` (ES Modules)
- Scripts:
  - `dev`: Development mode dengan auto-reload
  - `start`: Production mode
  - `test`: Test runner

**Dependencies:**
```json
{
  "@whiskeysockets/baileys": "^7.0.0-rc13",
  "express": "^4.21.2",
  "qrcode": "^1.5.4",
  "qrcode-terminal": "^0.12.0",
  "multer": "^1.4.5-lts.1",
  "pino": "^9.6.0",
  "pino-pretty": "^13.0.0",
  "dotenv": "^16.4.7",
  "cors": "^2.8.5"
}
```

**DevDependencies:**
```json
{
  "nodemon": "^3.1.9"
}
```

### 2. Folder Structure

Create the following directories:
```
whatsapp-gateway/
├── src/
│   ├── config/
│   ├── whatsapp/
│   ├── api/
│   │   └── controllers/
│   └── middleware/
├── auth_info_baileys/
├── logs/
└── tests/
```

### 3. .gitignore

**Must include:**
```
# Dependencies
node_modules/

# Session & Auth
auth_info_baileys/

# Environment
.env
.env.local

# Logs
logs/
*.log

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# PM2
.pm2/
```

### 4. .env.example

**Required variables:**
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# API Security
API_KEY=your-secret-api-key-here

# WhatsApp Configuration
WA_SESSION_PATH=./auth_info_baileys
WA_PHONE_NUMBER=

# Logging
LOG_LEVEL=info
```

### 5. README.md (Basic)

**Must include:**
- Project title & description
- Requirements (Node.js 20+)
- Installation steps
- Environment setup
- How to run development mode
- Basic API endpoints list (preview)

---

## ✅ Acceptance Criteria

1. ✓ `npm install` runs without errors
2. ✓ All directories created successfully
3. ✓ .gitignore covers all sensitive files
4. ✓ .env.example has all required variables
5. ✓ README.md is clear and actionable
6. ✓ Node.js version check passes (>=20)

---

## 🎤 Prompt for Sub-Agent

```
You are tasked with PHASE 0: Project Setup for the WhatsApp Gateway Service.

Context:
- We're building a WhatsApp Gateway using Baileys v7
- Single instance, minimal features
- File-based session storage
- Express REST API

Your tasks:
1. Create package.json with exact dependencies listed above (use ES modules)
2. Create all folder structure as specified
3. Create .gitignore with all items listed
4. Create .env.example with all variables
5. Create basic README.md with installation & run instructions

Requirements:
- Use exact dependency versions specified
- Create ONLY the files listed (no extra implementation yet)
- Keep README concise but complete
- Ensure all paths are relative and correct

Output format:
- Provide each file content clearly
- Confirm folder structure creation commands
- No code implementation yet (that's next phase)

Ready? Begin Phase 0.
```

---

## 🔍 Orchestrator Review Checklist

After sub-agent completes:
- [ ] All files created correctly
- [ ] Dependencies versions match spec
- [ ] .gitignore comprehensive
- [ ] No sensitive data in repo
- [ ] README clear for new developers
- [ ] Structure matches master plan

**Approval Required Before Phase 1**

---

**Status:** Ready for Execution  
**Assigned To:** Sub-Agent  
**Orchestrator:** Standing by for review
