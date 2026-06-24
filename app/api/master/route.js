import { getPool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { unauthorized, serverError } from '@/lib/utils';

export async function GET(req) {
  try {
    const payload = verifyToken(req);
    if (!payload) return unauthorized();
    const pool = getPool();
    const r = await pool.query(`SELECT * FROM master_items WHERE user_id=$1 AND is_active=true ORDER BY id`, [payload.userId]);
    return Response.json({ items: r.rows });
  } catch (e) { return serverError(e); }
}

export async function POST(req) {
  try {
    const payload = verifyToken(req);
    if (!payload) return unauthorized();
    const { type, amount, description = '' } = await req.json();
    const pool = getPool();
    const r = await pool.query(
      `INSERT INTO master_items (user_id, type, amount, description) VALUES ($1, $2, $3, $4) RETURNING *`,
      [payload.userId, type, parseInt(amount), description]
    );
    return Response.json({ success: true, message: 'マスタを追加しました', item: r.rows[0] });
  } catch (e) { return serverError(e); }
}
