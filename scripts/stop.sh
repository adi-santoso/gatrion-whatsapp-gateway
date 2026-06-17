#!/bin/bash

echo "Stopping WhatsApp Gateway..."

pm2 stop whatsapp-gateway
pm2 delete whatsapp-gateway

echo "WhatsApp Gateway stopped and removed from PM2."
