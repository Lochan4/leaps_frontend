import { Router } from 'express';
import { execSync } from 'child_process';
import os from 'os';

const router = Router();

router.get('/', (req, res) => {
  const uptime = execSync('uptime').toString().trim();
  const diskRaw = execSync('df -h /').toString().trim().split('\n')[1].split(/\s+/);

  res.json({
    hostname: os.hostname(),
    platform: process.platform,
    arch: os.arch(),
    uptime: os.uptime(),
    uptimeHuman: uptime,
    cpu: os.cpus()[0]?.model,
    cpuCores: os.cpus().length,
    memTotal: `${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB`,
    memFree: `${Math.round(os.freemem() / 1024 / 1024 / 1024)}GB`,
    disk: {
      total: diskRaw[1],
      used: diskRaw[2],
      available: diskRaw[3],
      percent: diskRaw[4]
    },
    nodeVersion: process.version,
    time: new Date().toISOString()
  });
});

export default router;
