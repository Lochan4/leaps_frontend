# laptop-server

Turn any laptop into a remote server with Claude Code + ngrok.

## Architecture

```
Laptop (this machine)
  ├── Claude Code          ← AI agent (reads this repo, executes tasks)
  ├── API Server :3001     ← compute + file endpoints
  └── ngrok tunnels        ← expose to internet
          ↓
      Internet
          ↓
  Phone / Other laptop     ← access via ngrok URL + API key
```

## Quick Start

### 1. Install ngrok
```bash
brew install ngrok/ngrok/ngrok
ngrok config add-authtoken <YOUR_TOKEN>
# Get token at: https://dashboard.ngrok.com/get-started/your-authtoken
```

### 2. Setup
```bash
npm run setup
```
This creates `.env` with a random API key. **Save the API key** — you need it on other devices.

### 3. Start
```bash
bash start.sh
```
After ~3 seconds, your tunnel URLs will print. They look like:
```
api: https://abc123.ngrok-free.app
ssh: tcp://0.tcp.ngrok.io:12345
```

### 4. Connect from another device

**Option A — CLI client (any machine with Node.js):**
```bash
# Copy client/connect.js to the remote machine, then:
node connect.js https://abc123.ngrok-free.app YOUR_API_KEY status
node connect.js https://abc123.ngrok-free.app YOUR_API_KEY run "df -h"
node connect.js https://abc123.ngrok-free.app YOUR_API_KEY ls
```

**Option B — curl (any machine):**
```bash
BASE="https://abc123.ngrok-free.app"
KEY="your-api-key"

# System status
curl -H "x-api-key: $KEY" $BASE/status

# Run a command
curl -X POST -H "x-api-key: $KEY" -H "Content-Type: application/json" \
  -d '{"cmd":"ls -la"}' $BASE/compute/run

# List workspace files
curl -H "x-api-key: $KEY" $BASE/files/ls
```

**Option C — SSH (requires SSH enabled on this Mac):**
```bash
ssh -p <NGROK_PORT> your-username@0.tcp.ngrok.io
```
Enable SSH: System Settings → Sharing → Remote Login

**Option D — iPhone (Shortcuts app):**
Create a shortcut with HTTP Request action:
- URL: `https://abc123.ngrok-free.app/status`
- Headers: `x-api-key: YOUR_KEY`

## GitHub Integration (Claude Code Remote)

Push this repo to GitHub. Claude Code monitors it and can:
- Pull new tasks from the repo
- Execute them on the laptop
- Push results back

```bash
git remote add origin https://github.com/YOUR_USER/laptop-server.git
git push -u origin main
```

Then from any device, push a task file to `workspace/tasks/` and Claude Code will pick it up.

## API Reference

All endpoints require header: `x-api-key: YOUR_KEY`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /` | — | Health check (no auth) |
| `GET /status` | — | System info (CPU, RAM, disk) |
| `POST /compute/run` | `{"cmd":"..."}` | Run allowlisted command |
| `GET /files/ls?path=` | — | List workspace directory |
| `GET /files/read?path=` | — | Read file content |
| `POST /files/write` | `{"path":"...","content":"..."}` | Write file |
| `GET /files/download?path=` | — | Download file |

## Security

- All routes (except `GET /`) require `x-api-key` header
- Commands are allowlisted (edit `server/routes/compute.js` to add more)
- All file operations are sandboxed to `workspace/` directory
- ngrok provides HTTPS automatically

## Logs

```bash
tail -f logs/api.log     # API server logs
tail -f logs/ngrok.log   # ngrok tunnel logs
```
