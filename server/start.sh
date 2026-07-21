#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Load env
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

mkdir -p logs

# Start API server in background
echo "==> Starting API server on port ${API_PORT:-3001}..."
node server/index.js > logs/api.log 2>&1 &
API_PID=$!
echo "    PID: $API_PID"

# Give server a moment to start
sleep 1

# Start ngrok
echo "==> Starting ngrok tunnels..."
echo "    Tunnel dashboard: http://localhost:4040"
ngrok start --all --config ngrok.yml 2>&1 | tee logs/ngrok.log &
NGROK_PID=$!

echo ""
echo "==> Both services running"
echo "    API log:   logs/api.log"
echo "    ngrok log: logs/ngrok.log"
echo ""
echo "    Fetching tunnel URLs (wait ~3s)..."
sleep 3

# Print tunnel URLs
curl -s http://localhost:4040/api/tunnels 2>/dev/null | \
  node -e "
const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
const t = d.tunnels || [];
t.forEach(t => console.log('   ' + t.name + ': ' + t.public_url));
" 2>/dev/null || echo "   (ngrok API not ready yet — check http://localhost:4040)"

echo ""
echo "Press Ctrl+C to stop both services"

# Wait and cleanup on exit
trap "kill $API_PID $NGROK_PID 2>/dev/null; echo 'Stopped.'" EXIT
wait
