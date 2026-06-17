#!/bin/bash

echo "Starting WhatsApp Gateway..."

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "PM2 not found. Installing PM2..."
    npm install -g pm2
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    echo "Please copy .env.example to .env and configure it."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "Error: Node.js version 20 or higher is required!"
    echo "Current version: $(node -v)"
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Start with PM2
echo "Starting application with PM2..."
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

echo ""
echo "WhatsApp Gateway started successfully!"
echo ""
echo "Useful commands:"
echo "  pm2 logs whatsapp-gateway    - View logs"
echo "  pm2 status                   - Check status"
echo "  pm2 restart whatsapp-gateway - Restart app"
echo "  pm2 stop whatsapp-gateway    - Stop app"
echo "  pm2 monit                    - Monitor resources"
