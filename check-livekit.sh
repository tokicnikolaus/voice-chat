#!/bin/bash

# Script to check LiveKit server connectivity and configuration

echo "=== LiveKit Server Diagnostics ==="
echo ""

# Check if LiveKit container is running
echo "1. Checking LiveKit container status..."
if docker compose ps livekit | grep -q "Up"; then
    echo "   ✅ LiveKit container is running"
else
    echo "   ❌ LiveKit container is NOT running"
    exit 1
fi

# Check LiveKit logs for errors
echo ""
echo "2. Checking recent LiveKit logs for errors..."
docker compose logs --tail=50 livekit | grep -i "error\|fail\|warn" || echo "   ✅ No errors found in recent logs"

# Check if LiveKit HTTP port is accessible
echo ""
echo "3. Testing LiveKit HTTP API (port 7880)..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:7880/ | grep -q "200\|404\|405"; then
    echo "   ✅ LiveKit HTTP API is responding"
else
    echo "   ⚠️  LiveKit HTTP API may not be accessible (this is normal if it only accepts WebSocket)"
fi

# Check LiveKit configuration
echo ""
echo "4. Checking LiveKit configuration..."
echo "   LiveKit URL from docker-compose: ws://livekit:7880"
echo "   Node IP flag: --node-ip 192.168.1.154"
echo "   Port mappings:"
echo "     - 7880:7880 (HTTP API)"
echo "     - 7881:7881 (WebRTC TCP)"
echo "     - 7882-7892:7882-7892/udp (WebRTC UDP)"

# Check if ports are listening
echo ""
echo "5. Checking if ports are listening..."
if netstat -tuln 2>/dev/null | grep -q ":7880"; then
    echo "   ✅ Port 7880 is listening"
else
    echo "   ⚠️  Port 7880 may not be listening (check firewall)"
fi

# Check server logs for token generation
echo ""
echo "6. Checking server logs for token generation..."
docker compose logs --tail=20 server | grep -i "livekit\|token" || echo "   (No recent token logs)"

# Test WebSocket connection to LiveKit (basic check)
echo ""
echo "7. Testing WebSocket connection to LiveKit..."
if command -v websocat &> /dev/null; then
    echo "   (websocat found, but skipping WebSocket test - requires valid token)"
else
    echo "   (websocat not installed, skipping WebSocket test)"
fi

echo ""
echo "=== Diagnostics Complete ==="
echo ""
echo "To check LiveKit logs in real-time:"
echo "  docker compose logs -f livekit"
echo ""
echo "To check server logs:"
echo "  docker compose logs -f server"
echo ""
echo "To test from browser console:"
echo "  const ws = new WebSocket('ws://192.168.1.154:7880/');"
echo "  ws.onopen = () => console.log('Connected');"
echo "  ws.onerror = (e) => console.error('Error:', e);"
