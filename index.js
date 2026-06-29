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
    CREATE TABLE IF NOT EXISTS visits (
      id SERIAL PRIMARY KEY,
      clinic_id INTEGER NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      sale_id INTEGER REFERENCES sales(id) ON DELETE SET NULL,
      memo TEXT DEFAULT '',
      visited_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_visits_customer ON visits(customer_id, visited_at DESC);
    ALTER TABLE clinics ADD COLUMN IF NOT EXISTS daily_capacity INTEGER DEFAULT 11;
    CREATE TABLE IF NOT EXISTS advertising_channels (
      id SERIAL PRIMARY KEY,
      clinic_id INTEGER NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
      name VARCHAR(50) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS monthly_ad_spend (
      id SERIAL PRIMARY KEY,
      clinic_id INTEGER NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
      channel_id INTEGER NOT NULL REFERENCES advertising_channels(id) ON DELETE CASCADE,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      amount INTEGER NOT NULL DEFAULT 0,
      UNIQUE(clinic_id, channel_id, year, month)
    );
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS source_id INTEGER REFERENCES advertising_channels(id) ON DELETE SET NULL;
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
    `SELECT s.type, SUM(s.amount) as sales, COUNT(*) as cnt FROM sales s LEFT JOIN visits v ON v.sale_id=s.id WHERE s.user_id=$1 AND COALESCE(v.visited_at,s.created_at)>=$2 AND COALESCE(v.visited_at,s.created_at)<$3 GROUP BY s.type`,
    [userId, start, end]
  );
  const s = calcStats(res.rows);
  const jj = toJST(now);
  return { date:`${jj.getUTCFullYear()}年${jj.getUTCMonth()+1}月${jj.getUTCDate()}日`, ...s };
}

async function getMonthStats(userId, year, month) {
  const { start, end } = jstRangeOfMonth(year, month);
  const res = await pool.query(
    `SELECT s.type, SUM(s.amount) as sales, COUNT(*) as cnt FROM sales s LEFT JOIN visits v ON v.sale_id=s.id WHERE s.user_id=$1 AND COALESCE(v.visited_at,s.created_at)>=$2 AND COALESCE(v.visited_at,s.created_at)<$3 GROUP BY s.type`,
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
    const { name, daily_capacity } = req.body;
    if (!name?.trim()) return res.json({ success: false, message: '院名を入力してください' });
    const cap = daily_capacity ? parseInt(daily_capacity) : null;
    const r = await pool.query(
      'UPDATE clinics SET name=$1' + (cap ? ', daily_capacity=$3' : '') + ' WHERE owner_user_id=$2 RETURNING *',
      cap ? [name.trim(), req.userId, cap] : [name.trim(), req.userId]
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
    const { name, phone, birthday, memo, source_id } = req.body;
    if (!name?.trim()) return res.json({ success: false, message: '名前を入力してください' });
    const r = await pool.query(
      'INSERT INTO customers (clinic_id, name, phone, birthday, memo, source_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [clinicId, name.trim(), phone||'', birthday||null, memo||'', source_id||null]
    );
    res.json({ success: true, customer: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

app.put('/api/customers/:id', auth, async (req, res) => {
  try {
    const clinicId = await getClinicId(req.userId);
    if (!clinicId) return res.json({ success: false, message: '院が登録されていません' });
    const { name, phone, birthday, memo, source_id } = req.body;
    if (!name?.trim()) return res.json({ success: false, message: '名前を入力してください' });
    const r = await pool.query(
      'UPDATE customers SET name=$1, phone=$2, birthday=$3, memo=$4, source_id=$5 WHERE id=$6 AND clinic_id=$7 RETURNING *',
      [name.trim(), phone||'', birthday||null, memo||'', source_id||null, req.params.id, clinicId]
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

// ===== 来院履歴API =====
// 顧客の来院履歴取得
app.get('/api/visits', auth, async (req, res) => {
  try {
    const clinicId = await getClinicId(req.userId);
    if (!clinicId) return res.json({ success: true, visits: [] });
    const { customer_id } = req.query;
    let q = `SELECT v.*, s.type, s.amount FROM visits v LEFT JOIN sales s ON v.sale_id=s.id WHERE v.clinic_id=$1`;
    const params = [clinicId];
    if (customer_id) { q += ' AND v.customer_id=$2'; params.push(customer_id); }
    q += ' ORDER BY v.visited_at DESC LIMIT 100';
    const r = await pool.query(q, params);
    res.json({ success: true, visits: r.rows });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// 来院登録（売上作成 + 来院記録を同時に）
app.post('/api/visits', auth, async (req, res) => {
  try {
    const clinicId = await getClinicId(req.userId);
    if (!clinicId) return res.json({ success: false, message: '院が登録されていません' });
    const { customer_id, type, amount, memo = '' } = req.body;
    if (!customer_id) return res.json({ success: false, message: '顧客を指定してください' });
    if (!type) return res.json({ success: false, message: '種別を入力してください' });

    // トランザクションで売上 + 来院記録を同時作成
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const sale = await client.query(
        'INSERT INTO sales (user_id, clinic_id, type, amount) VALUES ($1,$2,$3,$4) RETURNING *',
        [req.userId, clinicId, type, parseInt(amount) || 0]
      );
      const visit = await client.query(
        'INSERT INTO visits (clinic_id, customer_id, sale_id, memo) VALUES ($1,$2,$3,$4) RETURNING *',
        [clinicId, customer_id, sale.rows[0].id, memo]
      );
      await client.query('COMMIT');
      res.json({ success: true, visit: visit.rows[0], sale: sale.rows[0] });
    } catch(e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// カルテ更新
app.put('/api/visits/:id', auth, async (req, res) => {
  try {
    const clinicId = await getClinicId(req.userId);
    if (!clinicId) return res.json({ success: false, message: '院が登録されていません' });
    const { memo } = req.body;
    const r = await pool.query(
      'UPDATE visits SET memo=$1 WHERE id=$2 AND clinic_id=$3 RETURNING *',
      [memo||'', req.params.id, clinicId]
    );
    if (!r.rows.length) return res.json({ success: false, message: '来院記録が見つかりません' });
    res.json({ success: true, visit: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// 来院記録削除（関連売上も削除）
app.delete('/api/visits/:id', auth, async (req, res) => {
  try {
    const clinicId = await getClinicId(req.userId);
    if (!clinicId) return res.json({ success: false, message: '院が登録されていません' });
    const v = await pool.query('SELECT * FROM visits WHERE id=$1 AND clinic_id=$2', [req.params.id, clinicId]);
    if (!v.rows.length) return res.json({ success: false, message: '来院記録が見つかりません' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (v.rows[0].sale_id) await client.query('DELETE FROM sales WHERE id=$1', [v.rows[0].sale_id]);
      await client.query('DELETE FROM visits WHERE id=$1', [req.params.id]);
      await client.query('COMMIT');
    } catch(e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
    res.json({ success: true });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// 顧客ごとの来院統計（一覧表示用）
app.get('/api/customers/stats', auth, async (req, res) => {
  try {
    const clinicId = await getClinicId(req.userId);
    if (!clinicId) return res.json({ success: true, stats: {} });
    const r = await pool.query(
      `SELECT customer_id, COUNT(*) as visit_count, MAX(visited_at) as last_visit, SUM(s.amount) as total_amount
       FROM visits v LEFT JOIN sales s ON v.sale_id=s.id
       WHERE v.clinic_id=$1
       GROUP BY customer_id`,
      [clinicId]
    );
    const stats = {};
    r.rows.forEach(row => { stats[row.customer_id] = row; });
    res.json({ success: true, stats });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// 顧客分析API
app.get('/api/analytics/customers', auth, async (req, res) => {
  try {
    const clinicId = await getClinicId(req.userId);
    if (!clinicId) return res.json({ success: false, message: '院が登録されていません' });

    // リピート率・平均LTV・平均来院回数
    const kpiR = await pool.query(`
      SELECT
        COUNT(DISTINCT c.id) as total_customers,
        COUNT(DISTINCT CASE WHEN vc.visit_count >= 2 THEN c.id END) as repeat_customers,
        COALESCE(AVG(vc.visit_count), 0) as avg_visits,
        COALESCE(AVG(vc.total_amount), 0) as avg_ltv
      FROM customers c
      LEFT JOIN (
        SELECT v.customer_id, COUNT(*) as visit_count, COALESCE(SUM(s.amount), 0) as total_amount
        FROM visits v LEFT JOIN sales s ON v.sale_id = s.id
        WHERE v.clinic_id = $1
        GROUP BY v.customer_id
      ) vc ON vc.customer_id = c.id
      WHERE c.clinic_id = $1
    `, [clinicId]);

    // 休眠顧客（60日以上来院なし、または来院記録なし）
    const dormantR = await pool.query(`
      SELECT c.id, c.name, c.phone,
        MAX(v.visited_at) as last_visit,
        COALESCE(EXTRACT(DAY FROM NOW() - MAX(v.visited_at))::int, NULL) as days_since,
        COUNT(v.id) as visit_count
      FROM customers c
      LEFT JOIN visits v ON v.customer_id = c.id AND v.clinic_id = $1
      WHERE c.clinic_id = $1
      GROUP BY c.id, c.name, c.phone
      HAVING MAX(v.visited_at) IS NULL OR MAX(v.visited_at) < NOW() - INTERVAL '60 days'
      ORDER BY COALESCE(MAX(v.visited_at), c.created_at) ASC
      LIMIT 10
    `, [clinicId]);

    // 優良顧客TOP5（累計売上順）
    const topR = await pool.query(`
      SELECT c.id, c.name, COUNT(v.id) as visit_count, COALESCE(SUM(s.amount), 0) as total_amount
      FROM customers c
      LEFT JOIN visits v ON v.customer_id = c.id AND v.clinic_id = $1
      LEFT JOIN sales s ON s.id = v.sale_id
      WHERE c.clinic_id = $1
      GROUP BY c.id, c.name
      ORDER BY total_amount DESC
      LIMIT 5
    `, [clinicId]);

    // 月別新規顧客数（過去6ヶ月）
    const monthlyR = await pool.query(`
      SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as month, COUNT(*)::int as count
      FROM customers
      WHERE clinic_id = $1 AND created_at >= NOW() - INTERVAL '6 months'
      GROUP BY month ORDER BY month
    `, [clinicId]);

    const kpi = kpiR.rows[0];
    const total = parseInt(kpi.total_customers) || 0;
    const repeat = parseInt(kpi.repeat_customers) || 0;
    const dormantCount = dormantR.rows.length;

    res.json({
      success: true,
      total_customers: total,
      repeat_customers: repeat,
      repeat_rate: total > 0 ? Math.round(repeat / total * 100) : 0,
      churn_count: dormantCount,
      churn_rate: total > 0 ? Math.round(dormantCount / total * 100) : 0,
      avg_visits: Math.round(parseFloat(kpi.avg_visits) * 10) / 10,
      avg_ltv: Math.round(parseFloat(kpi.avg_ltv)),
      dormant: dormantR.rows,
      top_customers: topR.rows,
      monthly_new: monthlyR.rows,
    });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ===== 広告媒体マスターAPI =====
app.get('/api/advertising-channels', auth, async (req, res) => {
  try {
    const clinicId = await getClinicId(req.userId);
    if (!clinicId) return res.json({ success: true, channels: [] });
    const r = await pool.query('SELECT * FROM advertising_channels WHERE clinic_id=$1 ORDER BY created_at', [clinicId]);
    res.json({ success: true, channels: r.rows });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

app.post('/api/advertising-channels', auth, async (req, res) => {
  try {
    const clinicId = await getClinicId(req.userId);
    if (!clinicId) return res.json({ success: false, message: '院が登録されていません' });
    const { name } = req.body;
    if (!name?.trim()) return res.json({ success: false, message: '媒体名を入力してください' });
    const r = await pool.query(
      'INSERT INTO advertising_channels (clinic_id, name) VALUES ($1,$2) RETURNING *',
      [clinicId, name.trim()]
    );
    res.json({ success: true, channel: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

app.delete('/api/advertising-channels/:id', auth, async (req, res) => {
  try {
    const clinicId = await getClinicId(req.userId);
    if (!clinicId) return res.json({ success: false, message: '院が登録されていません' });
    await pool.query('DELETE FROM advertising_channels WHERE id=$1 AND clinic_id=$2', [req.params.id, clinicId]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ===== 月次広告費API =====
app.get('/api/monthly-ad-spend', auth, async (req, res) => {
  try {
    const clinicId = await getClinicId(req.userId);
    if (!clinicId) return res.json({ success: true, spends: [] });
    const { year, month } = req.query;
    const r = await pool.query(
      `SELECT m.*, c.name as channel_name FROM monthly_ad_spend m
       JOIN advertising_channels c ON c.id = m.channel_id
       WHERE m.clinic_id=$1 AND m.year=$2 AND m.month=$3`,
      [clinicId, parseInt(year), parseInt(month)]
    );
    res.json({ success: true, spends: r.rows });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

app.put('/api/monthly-ad-spend', auth, async (req, res) => {
  try {
    const clinicId = await getClinicId(req.userId);
    if (!clinicId) return res.json({ success: false, message: '院が登録されていません' });
    const { channel_id, year, month, amount } = req.body;
    await pool.query(
      `INSERT INTO monthly_ad_spend (clinic_id, channel_id, year, month, amount)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (clinic_id, channel_id, year, month) DO UPDATE SET amount=$5`,
      [clinicId, channel_id, parseInt(year), parseInt(month), parseInt(amount)||0]
    );
    res.json({ success: true });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ===== 高度分析API =====
app.get('/api/analytics/advanced', auth, async (req, res) => {
  try {
    const clinicId = await getClinicId(req.userId);
    if (!clinicId) return res.json({ success: false, message: '院が登録されていません' });

    const now = new Date(), j = toJST(now);
    const year = parseInt(req.query.year) || j.getUTCFullYear();
    const month = parseInt(req.query.month) || (j.getUTCMonth() + 1);
    const { start, end } = jstRangeOfMonth(year, month);
    const pm = month === 1 ? 12 : month - 1;
    const py = month === 1 ? year - 1 : year;
    const { start: prevStart, end: prevEnd } = jstRangeOfMonth(py, pm);

    // 今月の来院数・稼働率
    const visitR = await pool.query(
      `SELECT COUNT(*) as count, COUNT(DISTINCT DATE(visited_at AT TIME ZONE 'Asia/Tokyo')) as active_days
       FROM visits WHERE clinic_id=$1 AND visited_at>=$2 AND visited_at<$3`,
      [clinicId, start, end]
    );
    const clinicR = await pool.query('SELECT daily_capacity FROM clinics WHERE id=$1', [clinicId]);
    const capacity = clinicR.rows[0]?.daily_capacity || 11;
    const activeDays = parseInt(visitR.rows[0].active_days) || 0;
    const visitCount = parseInt(visitR.rows[0].count) || 0;
    const utilization = activeDays > 0 ? Math.round(visitCount / (capacity * activeDays) * 100) : 0;

    // 継続率（前月来院→今月来院）
    const retentionR = await pool.query(
      `SELECT
        COUNT(DISTINCT prev.customer_id) as prev_count,
        COUNT(DISTINCT curr.customer_id) as retained_count
       FROM (SELECT DISTINCT customer_id FROM visits WHERE clinic_id=$1 AND visited_at>=$2 AND visited_at<$3) prev
       LEFT JOIN (SELECT DISTINCT customer_id FROM visits WHERE clinic_id=$1 AND visited_at>=$4 AND visited_at<$5) curr
         ON prev.customer_id = curr.customer_id`,
      [clinicId, prevStart, prevEnd, start, end]
    );
    const prevCount = parseInt(retentionR.rows[0].prev_count) || 0;
    const retainedCount = parseInt(retentionR.rows[0].retained_count) || 0;
    const retention_rate = prevCount > 0 ? Math.round(retainedCount / prevCount * 100) : null;

    // リピート率 2〜5回目（全期間の新規顧客コホート）
    const repeatR = await pool.query(
      `SELECT
        COUNT(DISTINCT customer_id) as total,
        COUNT(DISTINCT CASE WHEN visit_num >= 2 THEN customer_id END) as v2,
        COUNT(DISTINCT CASE WHEN visit_num >= 3 THEN customer_id END) as v3,
        COUNT(DISTINCT CASE WHEN visit_num >= 4 THEN customer_id END) as v4,
        COUNT(DISTINCT CASE WHEN visit_num >= 5 THEN customer_id END) as v5
       FROM (
         SELECT customer_id, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY visited_at) as visit_num
         FROM visits WHERE clinic_id=$1
       ) ranked`,
      [clinicId]
    );
    const rep = repeatR.rows[0];
    const repTotal = parseInt(rep.total) || 0;
    const repeat_rates = repTotal > 0 ? {
      v2: Math.round(parseInt(rep.v2) / repTotal * 100),
      v3: Math.round(parseInt(rep.v3) / repTotal * 100),
      v4: Math.round(parseInt(rep.v4) / repTotal * 100),
      v5: Math.round(parseInt(rep.v5) / repTotal * 100),
    } : null;

    // 媒体別新規顧客数（今月登録）
    const sourceR = await pool.query(
      `SELECT ac.id as channel_id, ac.name as channel_name, COUNT(c.id)::int as count
       FROM advertising_channels ac
       LEFT JOIN customers c ON c.source_id = ac.id AND c.clinic_id = $1
         AND c.created_at >= $2 AND c.created_at < $3
       WHERE ac.clinic_id = $1
       GROUP BY ac.id, ac.name ORDER BY ac.created_at`,
      [clinicId, start, end]
    );

    // 媒体別CPA（今月）
    const spendR = await pool.query(
      `SELECT m.channel_id, m.amount, c.name as channel_name
       FROM monthly_ad_spend m JOIN advertising_channels c ON c.id = m.channel_id
       WHERE m.clinic_id=$1 AND m.year=$2 AND m.month=$3`,
      [clinicId, year, month]
    );
    const cpaList = spendR.rows.map(s => {
      const src = sourceR.rows.find(r => r.channel_id === s.channel_id);
      const newCount = src?.count || 0;
      return {
        channel_id: s.channel_id,
        channel_name: s.channel_name,
        spend: s.amount,
        new_customers: newCount,
        cpa: newCount > 0 ? Math.round(s.amount / newCount) : null,
      };
    });

    // 年間LTV = 直近12ヶ月の総売上 ÷ 直近12ヶ月に来院した全顧客数
    const ltvR = await pool.query(
      `SELECT COALESCE(SUM(s.amount), 0) as revenue, COUNT(DISTINCT v.customer_id) as customers
       FROM visits v JOIN sales s ON s.id = v.sale_id
       WHERE v.clinic_id=$1 AND v.visited_at >= NOW() - INTERVAL '12 months'`,
      [clinicId]
    );
    const ltvRevenue = parseInt(ltvR.rows[0].revenue) || 0;
    const ltvCustomers = parseInt(ltvR.rows[0].customers) || 0;
    const annual_ltv = ltvCustomers > 0 ? Math.round(ltvRevenue / ltvCustomers) : null;

    // 月別来院数（過去12ヶ月）
    const monthlyVisitsR = await pool.query(
      `SELECT TO_CHAR(visited_at AT TIME ZONE 'Asia/Tokyo', 'YYYY-MM') as month, COUNT(*)::int as count
       FROM visits WHERE clinic_id=$1 AND visited_at >= NOW() - INTERVAL '12 months'
       GROUP BY 1 ORDER BY 1`,
      [clinicId]
    );

    res.json({
      success: true,
      year, month,
      visit_count: visitCount,
      active_days: activeDays,
      daily_capacity: capacity,
      utilization_rate: utilization,
      prev_month_visitors: prevCount,
      retained_visitors: retainedCount,
      retention_rate,
      repeat_total: repTotal,
      repeat_rates,
      source_breakdown: sourceR.rows,
      cpa_list: cpaList,
      annual_ltv,
      monthly_visits: monthlyVisitsR.rows,
    });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// 顧客CSVインポート
app.post('/api/import/customers', auth, async (req, res) => {
  try {
    const clinicId = await getClinicId(req.userId);
    if (!clinicId) return res.json({ success: false, message: '院が登録されていません' });
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) return res.json({ success: false, message: 'データがありません' });
    const chR = await pool.query('SELECT id, name FROM advertising_channels WHERE clinic_id=$1', [clinicId]);
    const channelMap = {};
    for (const ch of chR.rows) channelMap[ch.name] = ch.id;
    let created = 0, skipped = 0;
    const errors = [];
    for (const row of rows) {
      try {
        const name = (row['名前'] || row['name'] || '').trim();
        if (!name) { skipped++; continue; }
        const phone = (row['電話番号'] || row['phone'] || '').trim();
        const birthday = (row['生年月日'] || row['birthday'] || '').trim() || null;
        const channelName = (row['集客媒体'] || row['channel'] || '').trim();
        const memo = (row['メモ'] || row['memo'] || '').trim();
        const dup = await pool.query('SELECT id FROM customers WHERE clinic_id=$1 AND name=$2 AND phone=$3', [clinicId, name, phone]);
        if (dup.rows.length > 0) { skipped++; continue; }
        const sourceId = channelName && channelMap[channelName] ? channelMap[channelName] : null;
        await pool.query('INSERT INTO customers (clinic_id, name, phone, birthday, memo, source_id) VALUES ($1,$2,$3,$4,$5,$6)', [clinicId, name, phone, birthday, memo, sourceId]);
        created++;
      } catch(e) { errors.push(`${row['名前'] || '?'}: ${e.message}`); }
    }
    res.json({ success: true, created, skipped, errors });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// 来院履歴CSVインポート
app.post('/api/import/visits', auth, async (req, res) => {
  try {
    const clinicId = await getClinicId(req.userId);
    if (!clinicId) return res.json({ success: false, message: '院が登録されていません' });
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) return res.json({ success: false, message: 'データがありません' });
    const custR = await pool.query('SELECT id, name FROM customers WHERE clinic_id=$1', [clinicId]);
    const customerMap = {};
    for (const c of custR.rows) customerMap[c.name] = c.id;
    let created = 0, skipped = 0;
    const errors = [];
    for (const row of rows) {
      const customerName = (row['顧客名'] || row['customer_name'] || '').trim();
      const visitedAt = (row['来院日'] || row['visited_at'] || '').trim();
      const type = (row['種別'] || row['type'] || '').trim();
      const amount = parseInt(row['金額'] || row['amount'] || '0') || 0;
      const memo = (row['カルテ'] || row['memo'] || '').trim();
      if (!customerName || !visitedAt || !type) { skipped++; continue; }
      const customerId = customerMap[customerName];
      if (!customerId) { errors.push(`「${customerName}」が見つかりません`); continue; }
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const sale = await client.query('INSERT INTO sales (user_id, clinic_id, type, amount, created_at) VALUES ($1,$2,$3,$4,$5) RETURNING *', [req.userId, clinicId, type, amount, new Date(visitedAt)]);
        await client.query('INSERT INTO visits (clinic_id, customer_id, sale_id, memo, visited_at) VALUES ($1,$2,$3,$4,$5)', [clinicId, customerId, sale.rows[0].id, memo, new Date(visitedAt)]);
        await client.query('COMMIT');
        created++;
      } catch(e) {
        await client.query('ROLLBACK');
        errors.push(`${customerName} ${visitedAt}: ${e.message}`);
      } finally { client.release(); }
    }
    res.json({ success: true, created, skipped, errors });
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
      `SELECT COALESCE(v.visited_at,s.created_at) as effective_date, s.type, s.amount FROM sales s LEFT JOIN visits v ON v.sale_id=s.id WHERE s.user_id=$1 AND COALESCE(v.visited_at,s.created_at)>=$2 AND COALESCE(v.visited_at,s.created_at)<$3 ORDER BY effective_date`,
      [req.userId, start, end]
    );
    const daysInMonth = new Date(y, m, 0).getDate();
    const days = Array.from({length: daysInMonth}, (_, i) => ({ day:i+1, total:0, shinki:0, joren:0, other:0, count:0 }));
    r.rows.forEach(row => {
      const i = toJST(row.effective_date).getUTCDate() - 1;
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
      `SELECT s.*, COALESCE(v.visited_at,s.created_at) as effective_date FROM sales s LEFT JOIN visits v ON v.sale_id=s.id WHERE s.user_id=$1 AND COALESCE(v.visited_at,s.created_at)>=$2 AND COALESCE(v.visited_at,s.created_at)<$3 ORDER BY effective_date`,
      [req.userId, start, end]
    );
    const records = r.rows.map(row => ({ id:row.id, date:fmtDate(row.effective_date), time:fmtTime(row.effective_date), type:row.type, amount:row.amount }));
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
      `SELECT s.*, COALESCE(v.visited_at,s.created_at) as effective_date FROM sales s LEFT JOIN visits v ON v.sale_id=s.id WHERE s.user_id=$1 AND COALESCE(v.visited_at,s.created_at)>=$2 AND COALESCE(v.visited_at,s.created_at)<$3 ORDER BY effective_date`,
      [req.userId, start, end]
    );
    const records = r.rows.map(row => ({ id:row.id, date:fmtDate(row.effective_date), time:fmtTime(row.effective_date), type:row.type, amount:row.amount }));
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
