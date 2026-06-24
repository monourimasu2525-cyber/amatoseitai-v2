import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(req) {
  const header = req.headers.get('authorization');
  const url = new URL(req.url);
  const token = (header?.startsWith('Bearer ') ? header.slice(7) : null)
    || url.searchParams.get('token');
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}
