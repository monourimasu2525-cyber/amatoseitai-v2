import { getPool } from '@/lib/db';
import { signToken } from '@/lib/auth';
import { serverError } from '@/lib/utils';
import bcrypt from 'bcryptjs';

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return Response.json({ success: false, message: 'メールアドレスとパスワードを入力してください' });
    const pool = getPool();
    const r = await pool.query('SELECT * FROM users WHERE email=$1', [email.toLowerCase()]);
    if (!r.rows.length) return Response.json({ success: false, message: 'メールアドレスまたはパスワードが違います' });
    const ok = await bcrypt.compare(password, r.rows[0].password_hash);
    if (!ok) return Response.json({ success: false, message: 'メールアドレスまたはパスワードが違います' });
    return Response.json({ success: true, token: signToken(r.rows[0].id), email: r.rows[0].email });
  } catch (e) { return serverError(e); }
}
