const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sales (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      type VARCHAR(20) NOT NULL,
      amount INTEGER NOT NULL,
      input_method VARCHAR(30) DEFAULT 'WebApp'
    );
    CREATE TABLE IF NOT EXISTS master_items (
      id SERIAL PRIMARY KEY,
      type VARCHAR(50) NOT NULL,
      amount INTEGER NOT NULL,
      description TEXT DEFAULT '',
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

function toJST(date) {
  return new Date(date.getTime() + 9 * 60 * 60 * 1000);
}
function fmtDate(d) {
  const j = toJST(d);
  return `${j.getUTCFullYear()}/${j.getUTCMonth()+1}/${j.getUTCDate()}`;
}
function fmtTime(d) {
  const j = toJST(d);
  return `${String(j.getUTCHours()).padStart(2,'0')}:${String(j.getUTCMinutes()).padStart(2,'0')}`;
}
function jstRangeOfMonth(year, month) {
  const start = new Date(Date.UTC(year, month-1, 1) - 9*3600*1000);
  const end   = new Date(Date.UTC(year, month,   1) - 9*3600*1000);
  return { start, end };
}
function jstRangeOfDay(year, month, day) {
  const start = new Date(Date.UTC(year, month-1, day)   - 9*3600*1000);
  const end   = new Date(Date.UTC(year, month-1, day+1) - 9*3600*1000);
  return { start, end };
}

async function getTodayStats() {
  const now = new Date();
  const j = toJST(now);
  const y = j.getUTCFullYear(), m = j.getUTCMonth()+1, d = j.getUTCDate();
  const { start, end } = jstRangeOfDay(y, m, d);
  const res = await pool.query(
    `SELECT type, SUM(amount) as sales, COUNT(*) as cnt FROM sales WHERE created_at >= $1 AND created_at < $2 GROUP BY type`,
    [start, end]
  );
  let shinkiCount=0, shinkiSales=0, jorenCount=0, jorenSales=0, otherCount=0, otherSales=0;
  res.rows.forEach(r => {
    if (r.type==='新規')      { shinkiCount=+r.cnt; shinkiSales=+r.sales; }
    else if (r.type==='常連') { jorenCount=+r.cnt;  jorenSales=+r.sales; }
    else                      { otherCount+=+r.cnt; otherSales+=+r.sales; }
  });
  return { date:`${y}年${m}月${d}日`, shinkiCount, jorenCount, totalCount:shinkiCount+jorenCount+otherCount, shinkiSales, jorenSales, otherCount, otherSales, totalSales:shinkiSales+jorenSales+otherSales };
}

async function getMonthStats(year, month) {
  const { start, end } = jstRangeOfMonth(year, month);
  const res = await pool.query(
    `SELECT type, SUM(amount) as sales, COUNT(*) as cnt FROM sales WHERE created_at >= $1 AND created_at < $2 GROUP BY type`,
    [start, end]
  );
  let shinkiCount=0, shinkiSales=0, jorenCount=0, jorenSales=0, otherCount=0, otherSales=0;
  res.rows.forEach(r => {
    if (r.type==='新規')      { shinkiCount=+r.cnt; shinkiSales=+r.sales; }
    else if (r.type==='常連') { jorenCount=+r.cnt;  jorenSales=+r.sales; }
    else                      { otherCount+=+r.cnt; otherSales+=+r.sales; }
  });
  return { shinkiCount, jorenCount, totalCount:shinkiCount+jorenCount+otherCount, shinkiSales, jorenSales, otherCount, otherSales, totalSales:shinkiSales+jorenSales+otherSales };
}

// ヘルスチェック
app.get('/health', (req, res) => res.json({ status:'ok' }));

// 初期データ一括
app.get('/api/initData', async (req, res) => {
  try {
    const now = new Date();
    const j = toJST(now);
    const y = j.getUTCFullYear(), m = j.getUTCMonth()+1;
    const pm = m===1?12:m-1, py = m===1?y-1:y;
    const [today, thisMonth, prevMonth, masterRes, histRes] = await Promise.all([
      getTodayStats(),
      getMonthStats(y, m),
      getMonthStats(py, pm),
      pool.query(`SELECT * FROM master_items WHERE is_active=true ORDER BY id`),
      pool.query(`SELECT * FROM sales WHERE created_at >= NOW() - INTERVAL '30 days' ORDER BY created_at DESC`)
    ]);
    res.json({
      todayStats: today,
      thisMonth,
      prevMonth,
      master: masterRes.rows,
      history: {
        records: histRes.rows.map(r => ({ id:r.id, date:fmtDate(r.created_at), time:fmtTime(r.created_at), type:r.type, amount:r.amount }))
      }
    });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

app.get('/api/getTodayStats', async (req, res) => {
  try { res.json(await getTodayStats()); }
  catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

app.get('/api/getMonthStats', async (req, res) => {
  try {
    const y = parseInt(req.query.year)  || new Date().getFullYear();
    const m = parseInt(req.query.month) || new Date().getMonth()+1;
    res.json(await getMonthStats(y, m));
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

app.get('/api/getRecentHistory', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const r = await pool.query(
      `SELECT * FROM sales WHERE created_at >= NOW() - INTERVAL '${Math.min(days,365)} days' ORDER BY created_at DESC`
    );
    res.json({ records: r.rows.map(row => ({ id:row.id, date:fmtDate(row.created_at), time:fmtTime(row.created_at), type:row.type, amount:row.amount })) });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// 日別内訳（グラフ用）
app.get('/api/getDailyBreakdown', async (req, res) => {
  try {
    const y = parseInt(req.query.year)  || new Date().getFullYear();
    const m = parseInt(req.query.month) || new Date().getMonth()+1;
    const { start, end } = jstRangeOfMonth(y, m);
    const r = await pool.query(
      `SELECT created_at, type, amount FROM sales WHERE created_at >= $1 AND created_at < $2 ORDER BY created_at`,
      [start, end]
    );
    const daysInMonth = new Date(y, m, 0).getDate();
    const days = Array.from({length: daysInMonth}, (_, i) => ({
      day: i+1, total:0, shinki:0, joren:0, other:0, count:0
    }));
    r.rows.forEach(row => {
      const dayIdx = toJST(row.created_at).getUTCDate() - 1;
      if (dayIdx >= 0 && dayIdx < daysInMonth) {
        days[dayIdx].total += row.amount;
        days[dayIdx].count++;
        if (row.type==='新規')      days[dayIdx].shinki += row.amount;
        else if (row.type==='常連') days[dayIdx].joren  += row.amount;
        else                        days[dayIdx].other  += row.amount;
      }
    });
    res.json({ year:y, month:m, days });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// 月次レポート（経理用）
app.get('/api/getMonthReport', async (req, res) => {
  try {
    const y = parseInt(req.query.year)  || new Date().getFullYear();
    const m = parseInt(req.query.month) || new Date().getMonth()+1;
    const { start, end } = jstRangeOfMonth(y, m);
    const r = await pool.query(
      `SELECT * FROM sales WHERE created_at >= $1 AND created_at < $2 ORDER BY created_at`,
      [start, end]
    );
    const records = r.rows.map(row => ({ id:row.id, date:fmtDate(row.created_at), time:fmtTime(row.created_at), type:row.type, amount:row.amount }));
    let shinkiCount=0, shinkiSales=0, jorenCount=0, jorenSales=0, otherCount=0, otherSales=0;
    records.forEach(r => {
      if (r.type==='新規')      { shinkiCount++; shinkiSales+=r.amount; }
      else if (r.type==='常連') { jorenCount++;  jorenSales+=r.amount; }
      else                      { otherCount++;  otherSales+=r.amount; }
    });
    res.json({
      year:y, month:m, records,
      summary: { shinkiCount, shinkiSales, jorenCount, jorenSales, otherCount, otherSales, totalCount:shinkiCount+jorenCount+otherCount, totalSales:shinkiSales+jorenSales+otherSales }
    });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

app.get('/api/getMaster', async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM master_items WHERE is_active=true ORDER BY id`);
    res.json({ items: r.rows });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// 売上CRUD
app.post('/api/addSale', async (req, res) => {
  try {
    const { type, amount } = req.body;
    if (!type) return res.json({ success:false, message:'種別は必須です' });
    const r = await pool.query(`INSERT INTO sales (type, amount) VALUES ($1, $2) RETURNING *`, [type, parseInt(amount)]);
    const row = r.rows[0];
    res.json({ success:true, message:`${type} ¥${amount} を登録しました`, record:{ id:row.id, date:fmtDate(row.created_at), time:fmtTime(row.created_at), type:row.type, amount:row.amount } });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

app.put('/api/editSale/:id', async (req, res) => {
  try {
    const { type, amount } = req.body;
    await pool.query(`UPDATE sales SET type=$1, amount=$2, updated_at=NOW() WHERE id=$3`, [type, parseInt(amount), req.params.id]);
    res.json({ success:true, message:`修正しました: ${type} ¥${amount}` });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

app.delete('/api/deleteSale/:id', async (req, res) => {
  try {
    await pool.query(`DELETE FROM sales WHERE id=$1`, [req.params.id]);
    res.json({ success:true, message:'削除しました' });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// マスタCRUD
app.post('/api/addMaster', async (req, res) => {
  try {
    const { type, amount, description='' } = req.body;
    const r = await pool.query(`INSERT INTO master_items (type, amount, description) VALUES ($1, $2, $3) RETURNING *`, [type, parseInt(amount), description]);
    res.json({ success:true, message:'マスタを追加しました', item: r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

app.put('/api/updateMaster/:id', async (req, res) => {
  try {
    const { type, amount, description='' } = req.body;
    await pool.query(`UPDATE master_items SET type=$1, amount=$2, description=$3 WHERE id=$4`, [type, parseInt(amount), description, req.params.id]);
    res.json({ success:true, message:'マスタを更新しました' });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

app.delete('/api/deleteMaster/:id', async (req, res) => {
  try {
    await pool.query(`UPDATE master_items SET is_active=false WHERE id=$1`, [req.params.id]);
    res.json({ success:true, message:'マスタを削除しました' });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// CSVエクスポート
app.get('/api/getCsv', async (req, res) => {
  try {
    const y = req.query.year  ? parseInt(req.query.year)  : null;
    const m = req.query.month ? parseInt(req.query.month) : null;
    let q = `SELECT * FROM sales`, params = [];
    if (y && m) {
      const { start, end } = jstRangeOfMonth(y, m);
      q += ` WHERE created_at >= $1 AND created_at < $2`;
      params = [start, end];
    }
    q += ` ORDER BY created_at`;
    const r = await pool.query(q, params);
    const rows = [['日付','時刻','種別','金額','入力方法']];
    r.rows.forEach(row => rows.push([fmtDate(row.created_at), fmtTime(row.created_at), row.type, row.amount, row.input_method]));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="sales_${y||'all'}_${m||'all'}.csv"`);
    res.send('﻿' + rows.map(r => r.join(',')).join('\n'));
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

const PORT = process.env.PORT || 3000;
initDb().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
