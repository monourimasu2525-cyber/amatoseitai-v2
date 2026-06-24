import { getPool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { toJST, jstRangeOfMonth, unauthorized, serverError } from '@/lib/utils';

export async function GET(req) {
  try {
    const payload = verifyToken(req);
    if (!payload) return unauthorized();
    const url = new URL(req.url);
    const year  = parseInt(url.searchParams.get('year'))  || new Date().getFullYear();
    const month = parseInt(url.searchParams.get('month')) || new Date().getMonth() + 1;
    const { start, end } = jstRangeOfMonth(year, month);
    const pool = getPool();
    const r = await pool.query(
      `SELECT created_at, type, amount FROM sales WHERE user_id=$1 AND created_at>=$2 AND created_at<$3 ORDER BY created_at`,
      [payload.userId, start, end]
    );
    const daysInMonth = new Date(year, month, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, total: 0, shinki: 0, joren: 0, other: 0, count: 0 }));
    r.rows.forEach(row => {
      const i = toJST(new Date(row.created_at)).getUTCDate() - 1;
      if (i >= 0 && i < daysInMonth) {
        days[i].total += row.amount; days[i].count++;
        if (row.type === '新規') days[i].shinki += row.amount;
        else if (row.type === '常連') days[i].joren += row.amount;
        else days[i].other += row.amount;
      }
    });
    return Response.json({ year, month, days });
  } catch (e) { return serverError(e); }
}
