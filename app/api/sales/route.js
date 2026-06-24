import { getPool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { fmtDate, fmtTime, unauthorized, serverError } from '@/lib/utils';

export async function POST(req) {
  try {
    const payload = verifyToken(req);
    if (!payload) return unauthorized();
    const { type, amount } = await req.json();
    if (!type) return Response.json({ success: false, message: '種別は必須です' });
    const pool = getPool();
    const r = await pool.query(
      `INSERT INTO sales (user_id, type, amount) VALUES ($1, $2, $3) RETURNING *`,
      [payload.userId, type, parseInt(amount)]
    );
    const row = r.rows[0];
    return Response.json({
      success: true,
      message: `${type} ¥${amount} を登録しました`,
      record: { id: row.id, date: fmtDate(row.created_at), time: fmtTime(row.created_at), type: row.type, amount: row.amount },
    });
  } catch (e) { return serverError(e); }
}
