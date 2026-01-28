#!/bin/bash
# Build script that ensures SSL certificates exist before building

set -e

CERT_DIR="./certs"
CLIENT_CERT_DIR="./client/certs"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Checking for SSL certificates..."

# Check if certificates exist
if [ ! -f "${CERT_DIR}/server.crt" ] || [ ! -f "${CERT_DIR}/server.key" ]; then
    echo "SSL certificates not found. Generating..."
    cd "${SCRIPT_DIR}"
    ./generate-ssl-cert.sh
else
    echo "SSL certificates found."
fi

# Copy certificates to client directory for Docker build context
echo "Copying certificates to client directory..."
mkdir -p "${CLIENT_CERT_DIR}"
cp "${CERT_DIR}/server.crt" "${CLIENT_CERT_DIR}/server.crt"
cp "${CERT_DIR}/server.key" "${CLIENT_CERT_DIR}/server.key"

# Verify certificates were copied
echo "Verifying certificates in client directory..."
if [ ! -f "${CLIENT_CERT_DIR}/server.crt" ] || [ ! -f "${CLIENT_CERT_DIR}/server.key" ]; then
    echo "ERROR: Failed to copy certificates to ${CLIENT_CERT_DIR}"
    exit 1
fi
ls -lh "${CLIENT_CERT_DIR}/"

echo "Building Docker containers..."
docker compose build

echo "Build complete!"
