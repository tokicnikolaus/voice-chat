#!/bin/bash
# Rsync script to sync voice-group-poc to remote server
# Usage: ./sync-to-server.sh [user@]hostname [remote-path]

set -e

# Configuration
REMOTE_USER="${1%%@*}"
REMOTE_HOST="${1#*@}"
REMOTE_PATH="${2:-~/voice-group-poc}"
LOCAL_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if hostname is provided
if [ -z "$REMOTE_HOST" ] || [ "$REMOTE_HOST" = "$REMOTE_USER" ]; then
    echo "Usage: $0 [user@]hostname [remote-path]"
    echo "Example: $0 user@192.168.1.154 ~/voice-group-poc"
    exit 1
fi

echo -e "${YELLOW}Syncing to ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}${NC}"

# Rsync with exclusions
rsync -avz --progress \
    --exclude='.git' \
    --exclude='.gitignore' \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='build' \
    --exclude='.next' \
    --exclude='.cache' \
    --exclude='coverage' \
    --exclude='*.log' \
    --exclude='.DS_Store' \
    --exclude='*.swp' \
    --exclude='*.swo' \
    --exclude='*~' \
    --exclude='.env.local' \
    --exclude='.env.*.local' \
    --exclude='.claude' \
    --exclude='claude-plan.md' \
    --exclude='certs' \
    --exclude='*.key' \
    --exclude='*.crt' \
    --delete \
    "$LOCAL_PATH/" "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/"

echo -e "${GREEN}Sync complete!${NC}"
echo ""
echo "To restart services on the server, SSH in and run:"
echo "  cd ${REMOTE_PATH}"
echo "  docker compose down"
echo "  docker compose build"
echo "  docker compose up -d"
