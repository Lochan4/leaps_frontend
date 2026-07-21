import { Router } from 'express';
import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'fs';
import { join, resolve, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKSPACE = resolve(__dirname, '../../workspace');

// Ensure workspace exists
mkdirSync(WORKSPACE, { recursive: true });

const router = Router();

// List files
router.get('/ls', (req, res) => {
  const subpath = req.query.path || '';
  const target = resolve(WORKSPACE, subpath);
  if (!target.startsWith(WORKSPACE)) return res.status(403).json({ error: 'Outside workspace' });

  try {
    const entries = readdirSync(target, { withFileTypes: true }).map(e => ({
      name: e.name,
      type: e.isDirectory() ? 'dir' : 'file',
      size: e.isFile() ? statSync(join(target, e.name)).size : null
    }));
    res.json({ path: subpath || '/', entries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Read file
router.get('/read', (req, res) => {
  const filepath = req.query.path;
  if (!filepath) return res.status(400).json({ error: 'path required' });
  const target = resolve(WORKSPACE, filepath);
  if (!target.startsWith(WORKSPACE)) return res.status(403).json({ error: 'Outside workspace' });

  try {
    const content = readFileSync(target, 'utf8');
    res.json({ path: filepath, content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Write file
router.post('/write', (req, res) => {
  const { path: filepath, content } = req.body;
  if (!filepath || content === undefined) return res.status(400).json({ error: 'path and content required' });
  const target = resolve(WORKSPACE, filepath);
  if (!target.startsWith(WORKSPACE)) return res.status(403).json({ error: 'Outside workspace' });

  try {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content, 'utf8');
    res.json({ ok: true, path: filepath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download file (raw)
router.get('/download', (req, res) => {
  const filepath = req.query.path;
  if (!filepath) return res.status(400).json({ error: 'path required' });
  const target = resolve(WORKSPACE, filepath);
  if (!target.startsWith(WORKSPACE)) return res.status(403).json({ error: 'Outside workspace' });

  try {
    res.download(target);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
