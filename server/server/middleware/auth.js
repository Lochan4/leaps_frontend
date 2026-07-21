export function authMiddleware(req, res, next) {
  const key = req.headers['x-api-key'] || req.query.key;
  if (!process.env.API_KEY) {
    return res.status(500).json({ error: 'Server not configured — API_KEY missing in .env' });
  }
  if (key !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
