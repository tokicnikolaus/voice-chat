#!/bin/bash
# Generate self-signed SSL certificate for HTTPS
# This is safe for LAN use but browsers will show a security warning

set -e

CERT_DIR="./certs"
DOMAIN="192.168.1.154"

echo "Generating SSL certificate for ${DOMAIN}..."

# Create certs directory if it doesn't exist
mkdir -p "${CERT_DIR}"

# Generate private key
openssl genrsa -out "${CERT_DIR}/server.key" 2048

# Generate certificate signing request
openssl req -new -key "${CERT_DIR}/server.key" -out "${CERT_DIR}/server.csr" \
  -subj "/C=US/ST=State/L=City/O=VoiceChat/CN=${DOMAIN}"

# Generate self-signed certificate (valid for 365 days)
openssl x509 -req -days 365 -in "${CERT_DIR}/server.csr" \
  -signkey "${CERT_DIR}/server.key" \
  -out "${CERT_DIR}/server.crt" \
  -extensions v3_req \
  -extfile <(
    echo "[v3_req]"
    echo "keyUsage = keyEncipherment, dataEncipherment"
    echo "extendedKeyUsage = serverAuth"
    echo "subjectAltName = @alt_names"
    echo "[alt_names]"
    echo "IP.1 = ${DOMAIN}"
    echo "DNS.1 = localhost"
    echo "DNS.2 = ${DOMAIN}"
  )

# Set permissions
chmod 600 "${CERT_DIR}/server.key"
chmod 644 "${CERT_DIR}/server.crt"

# Clean up CSR
rm "${CERT_DIR}/server.csr"

echo "SSL certificate generated successfully!"
echo "Certificate: ${CERT_DIR}/server.crt"
echo "Private key: ${CERT_DIR}/server.key"
echo ""
echo "Note: Browsers will show a security warning for self-signed certificates."
echo "This is normal for LAN deployments. Click 'Advanced' and 'Proceed anyway'."
