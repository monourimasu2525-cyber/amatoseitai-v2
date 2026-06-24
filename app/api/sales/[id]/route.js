import { getPool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { unauthorized, serverError } from '@/lib/utils';

export async function PUT(req, { params }) {
  try {
    const payload = verifyToken(req);
    if (!payload) return unauthorized();
    const { type, amount } = await req.json();
    const pool = getPool();
    await pool.query(
      `UPDATE sales SET type=$1, amount=$2, updated_at=NOW() WHERE id=$3 AND user_id=$4`,
      [type, parseInt(amount), params.id, payload.userId]
    );
    return Response.json({ success: true, message: `修正しました: ${type} ¥${amount}` });
  } catch (e) { return serverError(e); }
}

export async function DELETE(req, { params }) {
  try {
    const payload = verifyToken(req);
    if (!payload) return unauthorized();
    const pool = getPool();
    await pool.query(`DELETE FROM sales WHERE id=$1 AND user_id=$2`, [params.id, payload.userId]);
    return Response.json({ success: true, message: '削除しました' });
  } catch (e) { return serverError(e); }
}
