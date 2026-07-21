#!/bin/bash
echo "==> Stopping laptop-server..."
pkill -f "node server/index.js" 2>/dev/null && echo "   API stopped" || echo "   API not running"
pkill -f "ngrok" 2>/dev/null && echo "   ngrok stopped" || echo "   ngrok not running"
echo "Done."
