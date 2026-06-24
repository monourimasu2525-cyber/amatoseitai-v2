import { getPool } from '@/lib/db';
import { signToken } from '@/lib/auth';
import { serverError } from '@/lib/utils';
import bcrypt from 'bcryptjs';

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return Response.json({ success: false, message: 'メールアドレスとパスワードは必須です' });
    if (password.length < 6) return Response.json({ success: false, message: 'パスワードは6文字以上にしてください' });
    const pool = getPool();
    const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email.toLowerCase()]);
    if (exists.rows.length) return Response.json({ success: false, message: 'このメールアドレスは既に登録されています' });
    const hash = await bcrypt.hash(password, 10);
    const r = await pool.query('INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email', [email.toLowerCase(), hash]);
    return Response.json({ success: true, token: signToken(r.rows[0].id), email: r.rows[0].email });
  } catch (e) { return serverError(e); }
}
