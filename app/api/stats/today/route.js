import { getPool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { toJST, jstRangeOfDay, calcStats, unauthorized, serverError } from '@/lib/utils';

export async function GET(req) {
  try {
    const payload = verifyToken(req);
    if (!payload) return unauthorized();
    const pool = getPool();
    const now = new Date(), j = toJST(now);
    const { start, end } = jstRangeOfDay(j.getUTCFullYear(), j.getUTCMonth() + 1, j.getUTCDate());
    const res = await pool.query(
      `SELECT type, SUM(amount) as sales, COUNT(*) as cnt FROM sales WHERE user_id=$1 AND created_at>=$2 AND created_at<$3 GROUP BY type`,
      [payload.userId, start, end]
    );
    const s = calcStats(res.rows);
    return Response.json({ date: `${j.getUTCFullYear()}年${j.getUTCMonth() + 1}月${j.getUTCDate()}日`, ...s });
  } catch (e) { return serverError(e); }
}
