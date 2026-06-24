import { getPool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { toJST, fmtDate, fmtTime, jstRangeOfDay, calcStats, unauthorized, serverError } from '@/lib/utils';

async function getTodayStats(pool, userId) {
  const now = new Date(), j = toJST(now);
  const { start, end } = jstRangeOfDay(j.getUTCFullYear(), j.getUTCMonth() + 1, j.getUTCDate());
  const res = await pool.query(
    `SELECT type, SUM(amount) as sales, COUNT(*) as cnt FROM sales WHERE user_id=$1 AND created_at>=$2 AND created_at<$3 GROUP BY type`,
    [userId, start, end]
  );
  const s = calcStats(res.rows);
  return { date: `${j.getUTCFullYear()}年${j.getUTCMonth() + 1}月${j.getUTCDate()}日`, ...s };
}

async function getMonthStats(pool, userId, year, month) {
  const { start, end } = { start: new Date(Date.UTC(year, month - 1, 1) - 9*3600*1000), end: new Date(Date.UTC(year, month, 1) - 9*3600*1000) };
  const res = await pool.query(
    `SELECT type, SUM(amount) as sales, COUNT(*) as cnt FROM sales WHERE user_id=$1 AND created_at>=$2 AND created_at<$3 GROUP BY type`,
    [userId, start, end]
  );
  return calcStats(res.rows);
}

export async function GET(req) {
  try {
    const payload = verifyToken(req);
    if (!payload) return unauthorized();
    const uid = payload.userId;
    const pool = getPool();
    const now = new Date(), j = toJST(now);
    const y = j.getUTCFullYear(), m = j.getUTCMonth() + 1;
    const pm = m === 1 ? 12 : m - 1, py = m === 1 ? y - 1 : y;
    const [today, thisMonth, prevMonth, masterRes, histRes] = await Promise.all([
      getTodayStats(pool, uid),
      getMonthStats(pool, uid, y, m),
      getMonthStats(pool, uid, py, pm),
      pool.query(`SELECT * FROM master_items WHERE user_id=$1 AND is_active=true ORDER BY id`, [uid]),
      pool.query(`SELECT * FROM sales WHERE user_id=$1 AND created_at >= NOW() - INTERVAL '30 days' ORDER BY created_at DESC`, [uid]),
    ]);
    return Response.json({
      todayStats: today, thisMonth, prevMonth,
      master: masterRes.rows,
      history: { records: histRes.rows.map(r => ({ id: r.id, date: fmtDate(r.created_at), time: fmtTime(r.created_at), type: r.type, amount: r.amount })) },
    });
  } catch (e) { return serverError(e); }
}
