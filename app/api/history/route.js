import { getPool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { fmtDate, fmtTime, unauthorized, serverError } from '@/lib/utils';

export async function GET(req) {
  try {
    const payload = verifyToken(req);
    if (!payload) return unauthorized();
    const url = new URL(req.url);
    const days = Math.min(parseInt(url.searchParams.get('days')) || 30, 365);
    const pool = getPool();
    const r = await pool.query(
      `SELECT * FROM sales WHERE user_id=$1 AND created_at >= NOW() - INTERVAL '${days} days' ORDER BY created_at DESC`,
      [payload.userId]
    );
    return Response.json({ records: r.rows.map(row => ({ id: row.id, date: fmtDate(row.created_at), time: fmtTime(row.created_at), type: row.type, amount: row.amount })) });
  } catch (e) { return serverError(e); }
}
