import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';

import computeRouter from './routes/compute.js';
import filesRouter from './routes/files.js';
import statusRouter from './routes/status.js';
import { authMiddleware } from './middleware/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.API_PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Public health check
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    name: process.env.SERVER_NAME || 'laptop-server',
    time: new Date().toISOString()
  });
});

// Protected routes
app.use('/compute', authMiddleware, computeRouter);
app.use('/files', authMiddleware, filesRouter);
app.use('/status', authMiddleware, statusRouter);

app.listen(PORT, () => {
  console.log(`[server] API running on http://localhost:${PORT}`);
  console.log(`[server] Auth key: ${process.env.API_KEY ? '****' + process.env.API_KEY.slice(-4) : 'NOT SET — set API_KEY in .env'}`);
});
