# HTTPS Setup Guide

This guide explains how to set up HTTPS for the voice chat application.

## Quick Setup

1. **Generate SSL Certificate**
   ```bash
   ./generate-ssl-cert.sh
   ```
   
   This creates a self-signed certificate in the `certs/` directory.

2. **Rebuild and Start Containers**
   ```bash
   docker compose build client
   docker compose up -d
   ```

3. **Access the Application**
   - HTTPS: `https://192.168.1.154:3443`
   - HTTP (redirects to HTTPS): `http://192.168.1.154:3000`

## Browser Security Warning

Since we're using a self-signed certificate, browsers will show a security warning. This is normal and safe for LAN use:

1. Click **"Advanced"** or **"Show Details"**
2. Click **"Proceed to 192.168.1.154 (unsafe)"** or **"Accept the Risk and Continue"**

After accepting, the application will work normally with full microphone access.

## Port Configuration

- **Port 3000**: HTTP (automatically redirects to HTTPS)
- **Port 3443**: HTTPS (main access point)

## Updating the Certificate Domain

If your server IP changes, update the `DOMAIN` variable in `generate-ssl-cert.sh` and regenerate:

```bash
# Edit generate-ssl-cert.sh and change DOMAIN="192.168.1.154" to your new IP
./generate-ssl-cert.sh
docker compose build client
docker compose restart client
```

## Troubleshooting

### Certificate not found error
Make sure you've run `./generate-ssl-cert.sh` before building the client container.

### Still getting microphone errors
- Ensure you're accessing via HTTPS (`https://192.168.1.154:3443`)
- Accept the browser security warning
- Check browser console for any errors

### Port already in use
If port 3443 is already in use, change it in `docker-compose.yml`:
```yaml
ports:
  - "3443:443"  # Change 3443 to another port
```
