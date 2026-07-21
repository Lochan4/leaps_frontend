import { Router } from 'express';
import { execSync } from 'child_process';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKSPACE = resolve(__dirname, '../../workspace');

// Commands allowed to run remotely (extend as needed)
const ALLOWED_PREFIXES = [
  'ls', 'cat', 'echo', 'pwd', 'node', 'npm', 'python3', 'git',
  'df', 'du', 'free', 'uptime', 'ps', 'curl', 'mkdir', 'touch', 'cp', 'mv'
];

const router = Router();

router.post('/run', (req, res) => {
  const { cmd } = req.body;
  if (!cmd) return res.status(400).json({ error: 'cmd required' });

  const base = cmd.trim().split(' ')[0];
  if (!ALLOWED_PREFIXES.includes(base)) {
    return res.status(403).json({
      error: `Command '${base}' not in allowlist`,
      allowed: ALLOWED_PREFIXES
    });
  }

  try {
    const output = execSync(cmd, {
      cwd: WORKSPACE,
      timeout: 30000,
      encoding: 'utf8',
      maxBuffer: 5 * 1024 * 1024
    });
    res.json({ output, cmd, cwd: WORKSPACE });
  } catch (err) {
    res.status(500).json({ error: err.message, stderr: err.stderr });
  }
});

export default router;
