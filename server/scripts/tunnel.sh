#!/bin/bash

# Start ngrok tunnels from config file
# Requires ngrok.yml in project root

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."
CONFIG="$ROOT/ngrok.yml"

echo "==> Starting ngrok tunnels..."
echo "    Config: $CONFIG"
echo "    Dashboard: http://localhost:4040"
echo ""

ngrok start --all --config "$CONFIG" 2>&1 | tee "$ROOT/logs/ngrok.log"
