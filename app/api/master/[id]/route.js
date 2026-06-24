import { getPool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { unauthorized, serverError } from '@/lib/utils';

export async function PUT(req, { params }) {
  try {
    const payload = verifyToken(req);
    if (!payload) return unauthorized();
    const { type, amount, description = '' } = await req.json();
    const pool = getPool();
    await pool.query(
      `UPDATE master_items SET type=$1, amount=$2, description=$3 WHERE id=$4 AND user_id=$5`,
      [type, parseInt(amount), description, params.id, payload.userId]
    );
    return Response.json({ success: true, message: 'マスタを更新しました' });
  } catch (e) { return serverError(e); }
}

export async function DELETE(req, { params }) {
  try {
    const payload = verifyToken(req);
    if (!payload) return unauthorized();
    const pool = getPool();
    await pool.query(`UPDATE master_items SET is_active=false WHERE id=$1 AND user_id=$2`, [params.id, payload.userId]);
    return Response.json({ success: true, message: 'マスタを削除しました' });
  } catch (e) { return serverError(e); }
}
