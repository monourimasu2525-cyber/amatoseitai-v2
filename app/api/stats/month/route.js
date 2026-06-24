import { getPool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { jstRangeOfMonth, calcStats, unauthorized, serverError } from '@/lib/utils';

export async function GET(req) {
  try {
    const payload = verifyToken(req);
    if (!payload) return unauthorized();
    const url = new URL(req.url);
    const year  = parseInt(url.searchParams.get('year'))  || new Date().getFullYear();
    const month = parseInt(url.searchParams.get('month')) || new Date().getMonth() + 1;
    const { start, end } = jstRangeOfMonth(year, month);
    const pool = getPool();
    const res = await pool.query(
      `SELECT type, SUM(amount) as sales, COUNT(*) as cnt FROM sales WHERE user_id=$1 AND created_at>=$2 AND created_at<$3 GROUP BY type`,
      [payload.userId, start, end]
    );
    return Response.json(calcStats(res.rows));
  } catch (e) { return serverError(e); }
}
