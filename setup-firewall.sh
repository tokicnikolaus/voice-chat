#!/bin/bash
# Ubuntu Firewall Setup Script for Voice Group POC
# Run with: sudo bash setup-firewall.sh

# Enable UFW if not already enabled
sudo ufw --force enable

# Frontend (HTTP)
sudo ufw allow 3000/tcp comment 'Voice Group POC - Frontend'

# Backend API (HTTP)
sudo ufw allow 8080/tcp comment 'Voice Group POC - Backend API'

# LiveKit HTTP API
sudo ufw allow 7880/tcp comment 'LiveKit - HTTP API'

# LiveKit WebRTC TCP
sudo ufw allow 7881/tcp comment 'LiveKit - WebRTC TCP'

# LiveKit WebRTC UDP range (7882-7892)
sudo ufw allow 7882:7892/udp comment 'LiveKit - WebRTC UDP range'

# Show status
echo ""
echo "Firewall rules added. Current status:"
sudo ufw status numbered
