#!/usr/bin/env node
/**
 * laptop-server client — connect from any machine
 * Usage:
 *   node connect.js <NGROK_URL> <API_KEY> status
 *   node connect.js <NGROK_URL> <API_KEY> run "ls -la"
 *   node connect.js <NGROK_URL> <API_KEY> ls
 *   node connect.js <NGROK_URL> <API_KEY> read path/to/file.txt
 *   node connect.js <NGROK_URL> <API_KEY> write path/to/file.txt "content here"
 */

const [,, BASE_URL, API_KEY, command, ...args] = process.argv;

if (!BASE_URL || !API_KEY || !command) {
  console.log('Usage: node connect.js <NGROK_URL> <API_KEY> <command> [args]');
  console.log('Commands: status | run "<cmd>" | ls [path] | read <path> | write <path> <content>');
  process.exit(1);
}

const headers = { 'x-api-key': API_KEY, 'Content-Type': 'application/json' };

async function req(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, { headers, ...options });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

(async () => {
  try {
    switch (command) {
      case 'status': {
        const s = await req('/status');
        console.log(`Host:    ${s.hostname} (${s.platform}/${s.arch})`);
        console.log(`CPU:     ${s.cpu} (${s.cpuCores} cores)`);
        console.log(`Memory:  ${s.memFree} free / ${s.memTotal} total`);
        console.log(`Disk:    ${s.disk.available} free / ${s.disk.total} (${s.disk.percent} used)`);
        console.log(`Uptime:  ${s.uptimeHuman}`);
        console.log(`Time:    ${s.time}`);
        break;
      }
      case 'run': {
        const cmd = args.join(' ');
        console.log(`$ ${cmd}`);
        const r = await req('/compute/run', {
          method: 'POST',
          body: JSON.stringify({ cmd })
        });
        console.log(r.output);
        break;
      }
      case 'ls': {
        const r = await req(`/files/ls${args[0] ? '?path=' + args[0] : ''}`);
        r.entries.forEach(e => {
          const icon = e.type === 'dir' ? '📁' : '📄';
          const size = e.size != null ? ` (${(e.size/1024).toFixed(1)}KB)` : '';
          console.log(`${icon} ${e.name}${size}`);
        });
        break;
      }
      case 'read': {
        const r = await req(`/files/read?path=${encodeURIComponent(args[0])}`);
        console.log(r.content);
        break;
      }
      case 'write': {
        await req('/files/write', {
          method: 'POST',
          body: JSON.stringify({ path: args[0], content: args.slice(1).join(' ') })
        });
        console.log(`Written: ${args[0]}`);
        break;
      }
      default:
        console.log(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
