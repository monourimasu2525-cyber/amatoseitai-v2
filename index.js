const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { Resend } = require('resend');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');

const ALLOWED_ORIGINS = [
  'https://amatoseitai-v2.vercel.app',
  'http://localhost:3000',
];

const app = express();
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json());
app.use(cookieParser());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 20,                   // 最大20回
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'リクエストが多すぎます。しばらくしてから再試行してください。' },
});

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.APP_URL || 'https://amatoseitai-v2.vercel.app';

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS sales (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      type VARCHAR(50) NOT NULL,
      amount INTEGER NOT NULL,
      input_method VARCHAR(30) DEFAULT 'WebApp'
    );
    CREATE TABLE IF NOT EXISTS master_items (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      amount INTEGER NOT NULL,
      description TEXT DEFAULT '',
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_sales_user_created ON sales(user_id, created_at);
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(64) UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS clinics (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      slug VARCHAR(50) UNIQUE NOT NULL,
      owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS memberships (
      id SERIAL PRIMARY KEY,
      clinic_id INTEGER NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role VARCHAR(20) NOT NULL DEFAULT 'owner',
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(clinic_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      clinic_id INTEGER NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      phone VARCHAR(20) DEFAULT '',
      birthday DATE,
      memo TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE sales ADD COLUMN IF NOT EXISTS clinic_id INTEGER REFERENCES clinics(id) ON DELETE SET NULL;
    ALTER TABLE master_items ADD COLUMN IF NOT EXISTS clinic_id INTEGER REFERENCES clinics(id) ON DELETE SET NULL;
  `);
}

// ===== ユーティリティ =====
function toJST(date) { return new Date(date.getTime() + 9 * 60 * 60 * 1000); }
function fmtDate(d) { const j = toJST(d); return `${j.getUTCFullYear()}/${j.getUTCMonth()+1}/${j.getUTCDate()}`; }
function fmtTime(d) { const j = toJST(d); return `${String(j.getUTCHours()).padStart(2,'0')}:${String(j.getUTCMinutes()).padStart(2,'0')}`; }
function jstRangeOfMonth(year, month) {
  return {
    start: new Date(Date.UTC(year, month-1, 1) - 9*3600*1000),
    end:   new Date(Date.UTC(year, month,   1) - 9*3600*1000)
  };
}
function jstRangeOfDay(year, month, day) {
  return {
    start: new Date(Date.UTC(year, month-1, day)   - 9*3600*1000),
    end:   new Date(Date.UTC(year, month-1, day+1) - 9*3600*1000)
  };
}

// ===== 認証ミドルウェア =====
const COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: 'none',
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

function auth(req, res, next) {
  // Cookie優先、次にBearer（移行期間の後方互換）、最後にqueryパラメータ（CSV用）
  const token = req.cookies?.auth_token
    || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null)
    || req.query.token;
  if (!token) return res.status(401).json({ success: false, message: '認証が必要です' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'トークンが無効です。再ログインしてください' });
  }
}

// ===== 集計ヘルパー =====
function calcStats(rows) {
  let shinkiCount=0, shinkiSales=0, jorenCount=0, jorenSales=0, otherCount=0, otherSales=0;
  rows.forEach(r => {
    if (r.type==='新規')      { shinkiCount+=+r.cnt||1; shinkiSales+=+r.sales||+r.amount; }
    else if (r.type==='常連') { jorenCount+=+r.cnt||1;  jorenSales+=+r.sales||+r.amount; }
    else                      { otherCount+=+r.cnt||1;  otherSales+=+r.sales||+r.amount; }
  });
  return { shinkiCount, jorenCount, otherCount, shinkiSales, jorenSales, otherSales,
           totalCount: shinkiCount+jorenCount+otherCount, totalSales: shinkiSales+jorenSales+otherSales };
}

async function getTodayStats(userId) {
  const now = new Date(), j = toJST(now);
  const { start, end } = jstRangeOfDay(j.getUTCFullYear(), j.getUTCMonth()+1, j.getUTCDate());
  const res = await pool.query(
    `SELECT type, SUM(amount) as sales, COUNT(*) as cnt FROM sales WHERE user_id=$1 AND created_at>=$2 AND created_at<$3 GROUP BY type`,
    [userId, start, end]
  );
  const s = calcStats(res.rows);
  const jj = toJST(now);
  return { date:`${jj.getUTCFullYear()}年${jj.getUTCMonth()+1}月${jj.getUTCDate()}日`, ...s };
}

async function getMonthStats(userId, year, month) {
  const { start, end } = jstRangeOfMonth(year, month);
  const res = await pool.query(
    `SELECT type, SUM(amount) as sales, COUNT(*) as cnt FROM sales WHERE user_id=$1 AND created_at>=$2 AND created_at<$3 GROUP BY type`,
    [userId, start, end]
  );
  return calcStats(res.rows);
}

// ===== ヘルスチェック =====
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ===== 認証API =====
app.post('/api/register', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.json({ success: false, message: 'メールアドレスとパスワードは必須です' });
    if (password.length < 6) return res.json({ success: false, message: 'パスワードは6文字以上にしてください' });
    const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email.toLowerCase()]);
    if (exists.rows.length) return res.json({ success: false, message: 'このメールアドレスは既に登録されています' });
    const hash = await bcrypt.hash(password, 10);
    const r = await pool.query('INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email', [email.toLowerCase(), hash]);
    const token = jwt.sign({ userId: r.rows[0].id }, JWT_SECRET, { expiresIn: '30d' });
    res.cookie('auth_token', token, COOKIE_OPTS);
    res.json({ success: true, email: r.rows[0].email });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

app.post('/api/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.json({ success: false, message: 'メールアドレスとパスワードを入力してください' });
    const r = await pool.query('SELECT * FROM users WHERE email=$1', [email.toLowerCase()]);
    if (!r.rows.length) return res.json({ success: false, message: 'メールアドレスまたはパスワードが違います' });
    const ok = await bcrypt.compare(password, r.rows[0].password_hash);
    if (!ok) return res.json({ success: false, message: 'メールアドレスまたはパスワードが違います' });
    const token = jwt.sign({ userId: r.rows[0].id }, JWT_SECRET, { expiresIn: '30d' });
    res.cookie('auth_token', token, COOKIE_OPTS);
    res.json({ success: true, email: r.rows[0].email });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('auth_token', { ...COOKIE_OPTS, maxAge: 0 });
  res.json({ success: true });
});

// ===== 院（クリニック）API =====
// 自分の院を取得
app.get('/api/clinics/me', auth, async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT c.* FROM clinics c JOIN memberships m ON c.id=m.clinic_id WHERE m.user_id=$1 AND m.status=$2 LIMIT 1',
      [req.userId, 'active']
    );
    res.json({ success: true, clinic: r.rows[0] || null });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// 院を作成
app.post('/api/clinics', auth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.json({ success: false, message: '院名を入力してください' });
    // 既に院を持っている場合はエラー
    const existing = await pool.query(
      'SELECT c.id FROM clinics c JOIN memberships m ON c.id=m.clinic_id WHERE m.user_id=$1 LIMIT 1',
      [req.userId]
    );
    if (existing.rows.length) return res.json({ success: false, message: '既に院が登録されています' });
    const slug = 'clinic_' + req.userId + '_' + Date.now();
    const clinic = await pool.query(
      'INSERT INTO clinics (name, slug, owner_user_id) VALUES ($1,$2,$3) RETURNING *',
      [name.trim(), slug, req.userId]
    );
    const clinicId = clinic.rows[0].id;
    await pool.query(
      'INSERT INTO memberships (clinic_id, user_id, role, status) VALUES ($1,$2,$3,$4)',
      [clinicId, req.userId, 'owner', 'active']
    );
    // 既存の売上・マスタデータにclinic_idを紐付け
    await pool.query('UPDATE sales SET clinic_id=$1 WHERE user_id=$2 AND clinic_id IS NULL', [clinicId, req.userId]);
    await pool.query('UPDATE master_items SET clinic_id=$1 WHERE user_id=$2 AND clinic_id IS NULL', [clinicId, req.userId]);
    res.json({ success: true, clinic: clinic.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// 院情報を更新
app.put('/api/clinics/me', auth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.json({ success: false, message: '院名を入力してください' });
    const r = await pool.query(
      'UPDATE clinics SET name=$1 WHERE owner_user_id=$2 RETURNING *',
      [name.trim(), req.userId]
    );
    res.json({ success: true, clinic: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// パスワードリセット申請
app.post('/api/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.json({ success: true }); // 存在有無を漏らさない
    const r = await pool.query('SELECT id FROM users WHERE email=$1', [email.toLowerCase()]);
    if (r.rows.length) {
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1時間
      await pool.query('DELETE FROM password_reset_tokens WHERE user_id=$1', [r.rows[0].id]);
      await pool.query('INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1,$2,$3)', [r.rows[0].id, token, expires]);
      const resetUrl = `${APP_URL}/reset-password?token=${token}`;
      await resend.emails.send({
        from: 'Amato整体院SaaS <noreply@resend.dev>',
        to: email.toLowerCase(),
        subject: 'パスワードリセットのご案内',
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#3D2314">パスワードリセット</h2>
          <p>以下のボタンからパスワードをリセットしてください。リンクは1時間有効です。</p>
          <a href="${resetUrl}" style="display:inline-block;background:#C4622D;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">パスワードをリセットする</a>
          <p style="color:#888;font-size:13px">このメールに心当たりがない場合は無視してください。</p>
        </div>`,
      });
    }
    res.json({ success: true });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// パスワードリセット実行
app.post('/api/reset-password', authLimiter, async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.json({ success: false, message: '無効なリクエストです' });
    if (password.length < 6) return res.json({ success: false, message: 'パスワードは6文字以上にしてください' });
    const r = await pool.query(
      'SELECT * FROM password_reset_tokens WHERE token=$1 AND used=FALSE AND expires_at > NOW()',
      [token]
    );
    if (!r.rows.length) return res.json({ success: false, message: 'リンクが無効または期限切れです' });
    const hash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, r.rows[0].user_id]);
    await pool.query('UPDATE password_reset_tokens SET used=TRUE WHERE id=$1', [r.rows[0].id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ===== 顧客API =====
async function getClinicId(userId) {
  const r = await pool.query(
    'SELECT clinic_id FROM memberships WHERE user_id=$1 AND status=$2 LIMIT 1',
    [userId, 'active']
  );
  return r.rows[0]?.clinic_id || null;
}

app.get('/api/customers', auth, async (req, res) => {
  try {
    const clinicId = await getClinicId(req.userId);
    if (!clinicId) return res.json({ success: true, customers: [] });
    const { search } = req.query;
    let q = 'SELECT * FROM customers WHERE clinic_id=$1';
    const params = [clinicId];
    if (search) { q += ' AND (name ILIKE $2 OR phone ILIKE $2)'; params.push(`%${search}%`); }
    q += ' ORDER BY created_at DESC';
    const r = await pool.query(q, params);
    res.json({ success: true, customers: r.rows });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

app.post('/api/customers', auth, async (req, res) => {
  try {
    const clinicId = await getClinicId(req.userId);
    if (!clinicId) return res.json({ success: false, message: '院が登録されていません' });
    const { name, phone, birthday, memo } = req.body;
    if (!name?.trim()) return res.json({ success: false, message: '名前を入力してください' });
    const r = await pool.query(
      'INSERT INTO customers (clinic_id, name, phone, birthday, memo) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [clinicId, name.trim(), phone||'', birthday||null, memo||'']
    );
    res.json({ success: true, customer: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

app.put('/api/customers/:id', auth, async (req, res) => {
  try {
    const clinicId = await getClinicId(req.userId);
    if (!clinicId) return res.json({ success: false, message: '院が登録されていません' });
    const { name, phone, birthday, memo } = req.body;
    if (!name?.trim()) return res.json({ success: false, message: '名前を入力してください' });
    const r = await pool.query(
      'UPDATE customers SET name=$1, phone=$2, birthday=$3, memo=$4 WHERE id=$5 AND clinic_id=$6 RETURNING *',
      [name.trim(), phone||'', birthday||null, memo||'', req.params.id, clinicId]
    );
    if (!r.rows.length) return res.json({ success: false, message: '顧客が見つかりません' });
    res.json({ success: true, customer: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

app.delete('/api/customers/:id', auth, async (req, res) => {
  try {
    const clinicId = await getClinicId(req.userId);
    if (!clinicId) return res.json({ success: false, message: '院が登録されていません' });
    await pool.query('DELETE FROM customers WHERE id=$1 AND clinic_id=$2', [req.params.id, clinicId]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ===== データAPI（認証必須） =====
app.get('/api/initData', auth, async (req, res) => {
  try {
    const uid = req.userId;
    const now = new Date(), j = toJST(now);
    const y = j.getUTCFullYear(), m = j.getUTCMonth()+1, pm = m===1?12:m-1, py = m===1?y-1:y;
    const { start } = jstRangeOfDay(y, m, j.getUTCDate());
    const [today, thisMonth, prevMonth, masterRes, histRes] = await Promise.all([
      getTodayStats(uid),
      getMonthStats(uid, y, m),
      getMonthStats(uid, py, pm),
      pool.query(`SELECT * FROM master_items WHERE user_id=$1 AND is_active=true ORDER BY id`, [uid]),
      pool.query(`SELECT * FROM sales WHERE user_id=$1 AND created_at >= NOW() - INTERVAL '30 days' ORDER BY created_at DESC`, [uid])
    ]);
    res.json({
      todayStats: today, thisMonth, prevMonth,
      master: masterRes.rows,
      history: { records: histRes.rows.map(r => ({ id:r.id, date:fmtDate(r.created_at), time:fmtTime(r.created_at), type:r.type, amount:r.amount })) }
    });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

app.get('/api/getTodayStats', auth, async (req, res) => {
  try { res.json(await getTodayStats(req.userId)); }
  catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

app.get('/api/getMonthStats', auth, async (req, res) => {
  try {
    const y = parseInt(req.query.year)  || new Date().getFullYear();
    const m = parseInt(req.query.month) || new Date().getMonth()+1;
    res.json(await getMonthStats(req.userId, y, m));
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

app.get('/api/getRecentHistory', auth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const r = await pool.query(
      `SELECT * FROM sales WHERE user_id=$1 AND created_at >= NOW() - INTERVAL '${Math.min(days,365)} days' ORDER BY created_at DESC`,
      [req.userId]
    );
    res.json({ records: r.rows.map(row => ({ id:row.id, date:fmtDate(row.created_at), time:fmtTime(row.created_at), type:row.type, amount:row.amount })) });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

app.get('/api/getDailyBreakdown', auth, async (req, res) => {
  try {
    const y = parseInt(req.query.year)  || new Date().getFullYear();
    const m = parseInt(req.query.month) || new Date().getMonth()+1;
    const { start, end } = jstRangeOfMonth(y, m);
    const r = await pool.query(
      `SELECT created_at, type, amount FROM sales WHERE user_id=$1 AND created_at>=$2 AND created_at<$3 ORDER BY created_at`,
      [req.userId, start, end]
    );
    const daysInMonth = new Date(y, m, 0).getDate();
    const days = Array.from({length: daysInMonth}, (_, i) => ({ day:i+1, total:0, shinki:0, joren:0, other:0, count:0 }));
    r.rows.forEach(row => {
      const i = toJST(row.created_at).getUTCDate() - 1;
      if (i >= 0 && i < daysInMonth) {
        days[i].total += row.amount; days[i].count++;
        if (row.type==='新規') days[i].shinki += row.amount;
        else if (row.type==='常連') days[i].joren += row.amount;
        else days[i].other += row.amount;
      }
    });
    res.json({ year:y, month:m, days });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

app.get('/api/getMonthReport', auth, async (req, res) => {
  try {
    const y = parseInt(req.query.year)  || new Date().getFullYear();
    const m = parseInt(req.query.month) || new Date().getMonth()+1;
    const { start, end } = jstRangeOfMonth(y, m);
    const r = await pool.query(
      `SELECT * FROM sales WHERE user_id=$1 AND created_at>=$2 AND created_at<$3 ORDER BY created_at`,
      [req.userId, start, end]
    );
    const records = r.rows.map(row => ({ id:row.id, date:fmtDate(row.created_at), time:fmtTime(row.created_at), type:row.type, amount:row.amount }));
    const s = calcStats(records.map(r => ({ ...r, cnt:1, sales:r.amount })));
    res.json({ year:y, month:m, records, summary:s });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

app.get('/api/getDayRecords', auth, async (req, res) => {
  try {
    const y = parseInt(req.query.year)  || new Date().getFullYear();
    const m = parseInt(req.query.month) || new Date().getMonth()+1;
    const d = parseInt(req.query.day)   || new Date().getDate();
    const { start, end } = jstRangeOfDay(y, m, d);
    const r = await pool.query(
      `SELECT * FROM sales WHERE user_id=$1 AND created_at>=$2 AND created_at<$3 ORDER BY created_at`,
      [req.userId, start, end]
    );
    const records = r.rows.map(row => ({ id:row.id, date:fmtDate(row.created_at), time:fmtTime(row.created_at), type:row.type, amount:row.amount }));
    const s = calcStats(records.map(r => ({ ...r, cnt:1, sales:r.amount })));
    res.json({ year:y, month:m, day:d, records, summary:s });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

app.get('/api/getMaster', auth, async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM master_items WHERE user_id=$1 AND is_active=true ORDER BY id`, [req.userId]);
    res.json({ items: r.rows });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ===== 売上CRUD =====
app.post('/api/addSale', auth, async (req, res) => {
  try {
    const { type, amount } = req.body;
    if (!type) return res.json({ success:false, message:'種別は必須です' });
    const clinicId = await getClinicId(req.userId);
    const r = await pool.query(
      `INSERT INTO sales (user_id, clinic_id, type, amount) VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.userId, clinicId, type, parseInt(amount)]
    );
    const row = r.rows[0];
    res.json({ success:true, message:`${type} ¥${amount} を登録しました`, record:{ id:row.id, date:fmtDate(row.created_at), time:fmtTime(row.created_at), type:row.type, amount:row.amount } });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

app.put('/api/editSale/:id', auth, async (req, res) => {
  try {
    const { type, amount } = req.body;
    await pool.query(`UPDATE sales SET type=$1, amount=$2, updated_at=NOW() WHERE id=$3 AND user_id=$4`, [type, parseInt(amount), req.params.id, req.userId]);
    res.json({ success:true, message:`修正しました: ${type} ¥${amount}` });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

app.delete('/api/deleteSale/:id', auth, async (req, res) => {
  try {
    await pool.query(`DELETE FROM sales WHERE id=$1 AND user_id=$2`, [req.params.id, req.userId]);
    res.json({ success:true, message:'削除しました' });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ===== マスタCRUD =====
app.post('/api/addMaster', auth, async (req, res) => {
  try {
    const { type, amount, description='' } = req.body;
    const clinicId = await getClinicId(req.userId);
    const r = await pool.query(
      `INSERT INTO master_items (user_id, clinic_id, type, amount, description) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.userId, clinicId, type, parseInt(amount), description]
    );
    res.json({ success:true, message:'マスタを追加しました', item: r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

app.put('/api/updateMaster/:id', auth, async (req, res) => {
  try {
    const { type, amount, description='' } = req.body;
    await pool.query(`UPDATE master_items SET type=$1, amount=$2, description=$3 WHERE id=$4 AND user_id=$5`, [type, parseInt(amount), description, req.params.id, req.userId]);
    res.json({ success:true, message:'マスタを更新しました' });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

app.delete('/api/deleteMaster/:id', auth, async (req, res) => {
  try {
    await pool.query(`UPDATE master_items SET is_active=false WHERE id=$1 AND user_id=$2`, [req.params.id, req.userId]);
    res.json({ success:true, message:'マスタを削除しました' });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ===== CSVエクスポート =====
app.get('/api/getCsv', auth, async (req, res) => {
  try {
    const y = req.query.year  ? parseInt(req.query.year)  : null;
    const m = req.query.month ? parseInt(req.query.month) : null;
    let q = `SELECT * FROM sales WHERE user_id=$1`, params = [req.userId];
    if (y && m) {
      const { start, end } = jstRangeOfMonth(y, m);
      q += ` AND created_at>=$2 AND created_at<$3`;
      params = [req.userId, start, end];
    }
    q += ` ORDER BY created_at`;
    const r = await pool.query(q, params);
    const rows = [['日付','種別','金額']];
    r.rows.forEach(row => rows.push([fmtDate(row.created_at), row.type, row.amount]));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="sales_${y||'all'}_${m||'all'}.csv"`);
    res.send('﻿' + rows.map(r => r.join(',')).join('\n'));
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ===== CSVインポート =====
app.post('/api/importCsv', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.json({ success:false, message:'ファイルが選択されていません' });
    const text = req.file.buffer.toString('utf-8').replace(/^﻿/, ''); // BOM除去
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (!lines.length) return res.json({ success:false, message:'CSVが空です' });

    // ヘッダー行をスキップ
    const start = lines[0].startsWith('日付') ? 1 : 0;
    const dataLines = lines.slice(start);

    let imported = 0, skipped = 0;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const line of dataLines) {
        const cols = line.split(',');
        if (cols.length < 3) { skipped++; continue; }
        // 形式: 日付,種別,金額
        const [dateStr, type, amountStr] = cols;
        const amount = parseInt(amountStr);
        if (!dateStr || !type || isNaN(amount) || amount <= 0) { skipped++; continue; }

        // 日付をJSTとして解釈→UTCに変換（時刻は正午扱い）
        const [y, m, d] = dateStr.trim().split('/').map(Number);
        if (!y || !m || !d) { skipped++; continue; }
        const jstMs = Date.UTC(y, m-1, d, 12, 0, 0) - 9*3600*1000;
        const ts = new Date(jstMs);

        await client.query(
          `INSERT INTO sales (user_id, type, amount, input_method, created_at, updated_at) VALUES ($1, $2, $3, 'CSV', $4, $4)`,
          [req.userId, type.trim(), amount, ts]
        );
        imported++;
      }
      await client.query('COMMIT');
    } catch(e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    res.json({ success:true, message:`${imported}件インポートしました${skipped>0?`（${skipped}件スキップ）`:''}`, imported, skipped });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

const PORT = process.env.PORT || 3000;
initDb().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
