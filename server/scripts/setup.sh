#!/bin/bash
set -e

echo "==> laptop-server setup"

# Check for ngrok
if ! command -v ngrok &> /dev/null; then
  echo "ngrok not found. Install via: brew install ngrok/ngrok/ngrok"
  echo "Then auth: ngrok config add-authtoken <YOUR_TOKEN>"
  echo "Get token at: https://dashboard.ngrok.com/get-started/your-authtoken"
  exit 1
fi

# Install Node deps
echo "==> Installing Node.js dependencies..."
npm install

# Create .env if missing
if [ ! -f .env ]; then
  API_KEY=$(openssl rand -hex 24)
  cat > .env <<EOF
# Laptop Server Config
SERVER_NAME=$(hostname)
API_PORT=3001
API_KEY=$API_KEY
EOF
  echo "==> Created .env with API_KEY=$API_KEY"
  echo "    SAVE THIS KEY — you need it to connect from other devices"
fi

# Create workspace
mkdir -p workspace logs

echo ""
echo "==> Setup complete!"
echo "    Run: npm run all   (starts API + ngrok)"
echo "    Or:  npm start     (API only, no tunnel)"
