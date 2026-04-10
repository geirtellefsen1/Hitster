# Hitster Online — Deployment Instructions

Deploy this app to server `45.55.44.133` with HTTPS on domain `hitster.tellefsen.org`.

## Requirements

- Docker and Docker Compose must be installed on the server
- Ports 80 and 443 must be open
- DNS A record for `hitster.tellefsen.org` → `45.55.44.133` (already configured)

## Deploy Steps

Run these commands on the server in order:

```bash
# 1. Clone and checkout the correct branch
cd /opt
git clone https://github.com/geirtellefsen1/Hitster.git hitster
cd hitster
git checkout claude/hitster-online-game-NjdRv

# 2. Create .env file
cat > .env << 'EOF'
PORT=3001
NODE_ENV=production
CLIENT_URL=https://hitster.tellefsen.org
SPOTIFY_CLIENT_ID=dcb32d7980ea45269f16ec8c83318f51
SPOTIFY_CLIENT_SECRET=b81b115eca85408b977ea26e671a4af9
VITE_SPOTIFY_CLIENT_ID=dcb32d7980ea45269f16ec8c83318f51
EOF

# 3. Free up ports 80/443 if anything is using them
systemctl stop nginx 2>/dev/null
systemctl stop apache2 2>/dev/null

# 4. Get SSL certificate
chmod +x setup-https.sh
./setup-https.sh geir@tellefsen.org

# 5. Build and start all containers
docker compose up -d --build

# 6. Verify
docker compose ps
```

The app will be live at: **https://hitster.tellefsen.org**

## Updating

```bash
cd /opt/hitster
git pull
docker compose up -d --build
```

## Troubleshooting

```bash
# View logs
docker compose logs app
docker compose logs nginx

# Restart everything
docker compose down
docker compose up -d --build

# Renew SSL cert manually
docker compose run --rm certbot renew
docker compose restart nginx
```

## Spotify Dashboard

The following redirect URIs must be configured at https://developer.spotify.com/dashboard:
- `https://hitster.tellefsen.org/callback`
- `https://45.55.44.133/callback`

These are already set up.
