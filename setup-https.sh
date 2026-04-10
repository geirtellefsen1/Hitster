#!/bin/bash
# Setup HTTPS for Hitster Online
# Prerequisites: Docker + docker compose, domain pointed to this server

DOMAIN="hitster.tellefsen.org"
EMAIL="${1:-}"

if [ -z "$EMAIL" ]; then
  echo "Usage: ./setup-https.sh your-email@example.com"
  echo "Email is needed for Let's Encrypt certificate registration."
  exit 1
fi

echo "=== Setting up HTTPS for $DOMAIN ==="

# Step 1: Create directories
mkdir -p nginx/certs nginx/webroot

# Step 2: Start nginx with a temporary HTTP-only config for cert generation
echo "Starting temporary HTTP server for certificate generation..."
cat > nginx/nginx-init.conf << 'INITCONF'
events { worker_connections 1024; }
http {
    server {
        listen 80;
        server_name hitster.tellefsen.org;
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        location / {
            return 200 'Setting up HTTPS...';
            add_header Content-Type text/plain;
        }
    }
}
INITCONF

# Start temporary nginx
docker run -d --name hitster-nginx-init \
  -p 80:80 \
  -v "$(pwd)/nginx/nginx-init.conf:/etc/nginx/nginx.conf:ro" \
  -v "$(pwd)/nginx/webroot:/var/www/certbot" \
  nginx:alpine

echo "Waiting for nginx to start..."
sleep 3

# Step 3: Get certificate
echo "Requesting certificate from Let's Encrypt..."
docker run --rm \
  -v "$(pwd)/nginx/certs:/etc/letsencrypt" \
  -v "$(pwd)/nginx/webroot:/var/www/certbot" \
  certbot/certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN"

# Step 4: Stop temporary nginx
docker stop hitster-nginx-init && docker rm hitster-nginx-init
rm -f nginx/nginx-init.conf

# Step 5: Check if cert was obtained
if [ -f "nginx/certs/live/$DOMAIN/fullchain.pem" ]; then
  echo ""
  echo "=== Certificate obtained successfully! ==="
  echo ""
  echo "Now start the full stack with:"
  echo "  docker compose up -d --build"
  echo ""
  echo "Your app will be available at: https://$DOMAIN"
else
  echo ""
  echo "=== Certificate generation failed ==="
  echo "Make sure:"
  echo "  1. $DOMAIN DNS points to this server's IP"
  echo "  2. Port 80 is open in your firewall"
  echo "  3. No other service is using port 80"
fi
