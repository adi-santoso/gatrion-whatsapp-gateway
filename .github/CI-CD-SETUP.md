# CI/CD Setup Guide

## 🚀 Automatic Deployment

This project uses GitHub Actions for CI/CD. Every push to `main` branch will automatically:

1. ✅ Run tests (if available)
2. 🏗️ Build dashboard
3. 🚀 Deploy to production server via SSH
4. 🔄 Restart PM2

---

## 🔐 Required GitHub Secrets

Go to: **Repository → Settings → Secrets and variables → Actions**

Add these secrets:

### Required:
| Secret | Description | Example |
|--------|-------------|---------|
| `SSH_HOST` | Server IP or domain | `123.45.67.89` or `chat.gatrion.my.id` |
| `SSH_USERNAME` | SSH username | `ubuntu` or `root` |
| `SSH_PRIVATE_KEY` | SSH private key (entire content) | `-----BEGIN OPENSSH PRIVATE KEY-----` |

### Optional:
| Secret | Description | Default |
|--------|-------------|---------|
| `SSH_PORT` | SSH port | `22` |
| `DEPLOY_PATH` | Project directory on server | `~/gatrion-whatsapp-gateway` |

---

## 🔑 Generate SSH Key for Deployment

On your **local machine** (not server):

```bash
# Generate new SSH key for deployment
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy

# Copy public key
cat ~/.ssh/github_deploy.pub
```

On your **server**:

```bash
# Add public key to authorized_keys
echo "YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys

# Set correct permissions
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
```

On **GitHub** (Repository Settings → Secrets):

```bash
# Copy private key content
cat ~/.ssh/github_deploy

# Paste entire output (including -----BEGIN/END-----) to SSH_PRIVATE_KEY secret
```

---

## 📋 Server Prerequisites

Ensure these are installed on your server:

```bash
# Node.js 20+
node --version

# npm
npm --version

# PM2
pm2 --version

# Git
git --version
```

---

## 🧪 Test SSH Connection

Test if GitHub Actions can connect:

```bash
# On local machine, test with deployment key
ssh -i ~/.ssh/github_deploy username@your-server

# Should connect without password
```

---

## 🚀 How to Deploy

### Automatic (Recommended):

```bash
# Just push to main branch
git push origin main

# GitHub Actions will automatically:
# 1. Build dashboard
# 2. Deploy to server
# 3. Restart PM2
```

### Manual Deploy:

```bash
# SSH to server
ssh user@server

# Navigate to project
cd ~/gatrion-whatsapp-gateway

# Pull latest
git pull origin main

# Install dependencies
npm ci --production

# Build dashboard
cd dashboard
npm ci
npm run build
cd ..

# Restart PM2
pm2 restart whatsapp-gateway
pm2 save
```

---

## 📊 Check Deployment Status

### On GitHub:
1. Go to **Actions** tab
2. View latest workflow run
3. Check logs for each step

### On Server:
```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs whatsapp-gateway --lines 50

# Check git status
cd ~/gatrion-whatsapp-gateway
git log --oneline -5
```

---

## 🐛 Troubleshooting

### Deployment fails with "Permission denied"

```bash
# On server, check SSH key permissions
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh

# Check if public key is added
cat ~/.ssh/authorized_keys | grep github-actions
```

### Deployment fails with "pm2 command not found"

```bash
# On server, install PM2 globally
npm install -g pm2

# Or add PM2 to PATH in deployment script
# Update .github/workflows/ci-cd.yml:
export PATH=$PATH:~/.npm-global/bin
pm2 restart whatsapp-gateway
```

### Deployment fails with "git pull" error

```bash
# On server, reset any local changes
cd ~/gatrion-whatsapp-gateway
git reset --hard origin/main
git pull origin main
```

### Build fails on dashboard

```bash
# Check if dashboard dependencies are installed
cd ~/gatrion-whatsapp-gateway/dashboard
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## 🔒 Security Best Practices

1. ✅ Use **separate SSH key** for deployment (not your personal key)
2. ✅ Limit SSH key to **specific IP** if possible (GitHub Actions IPs)
3. ✅ Use **least privilege** - deploy user shouldn't have sudo access
4. ✅ Keep secrets in **GitHub Secrets** (never commit)
5. ✅ Enable **branch protection** on main branch
6. ✅ Review **deployment logs** after each push

---

## 📈 Workflow Triggers

| Event | Trigger | Action |
|-------|---------|--------|
| Push to `main` | Automatic | Test + Deploy |
| Pull Request | Automatic | Test only (no deploy) |
| Manual | Workflow dispatch | Test + Deploy |

---

## 🎯 Next Steps

1. Add GitHub Secrets (SSH credentials)
2. Push to main branch
3. Check GitHub Actions tab
4. Verify deployment on server
5. Monitor PM2 logs

**Deployment time: ~2-3 minutes** ⚡
