import { getPool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { fmtDate, fmtTime, jstRangeOfDay, calcStats, unauthorized, serverError } from '@/lib/utils';

export async function GET(req) {
  try {
    const payload = verifyToken(req);
    if (!payload) return unauthorized();
    const url = new URL(req.url);
    const year  = parseInt(url.searchParams.get('year'))  || new Date().getFullYear();
    const month = parseInt(url.searchParams.get('month')) || new Date().getMonth() + 1;
    const day   = parseInt(url.searchParams.get('day'))   || new Date().getDate();
    const { start, end } = jstRangeOfDay(year, month, day);
    const pool = getPool();
    const r = await pool.query(
      `SELECT * FROM sales WHERE user_id=$1 AND created_at>=$2 AND created_at<$3 ORDER BY created_at`,
      [payload.userId, start, end]
    );
    const records = r.rows.map(row => ({ id: row.id, date: fmtDate(row.created_at), time: fmtTime(row.created_at), type: row.type, amount: row.amount }));
    return Response.json({ year, month, day, records, summary: calcStats(records.map(r => ({ ...r, cnt: 1, sales: r.amount }))) });
  } catch (e) { return serverError(e); }
}
