import { getPool } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { fmtDate, jstRangeOfMonth, unauthorized, serverError } from '@/lib/utils';

export async function GET(req) {
  try {
    const payload = verifyToken(req);
    if (!payload) return unauthorized();
    const url = new URL(req.url);
    const y = url.searchParams.get('year')  ? parseInt(url.searchParams.get('year'))  : null;
    const m = url.searchParams.get('month') ? parseInt(url.searchParams.get('month')) : null;
    const pool = getPool();
    let q = `SELECT * FROM sales WHERE user_id=$1`, params = [payload.userId];
    if (y && m) {
      const { start, end } = jstRangeOfMonth(y, m);
      q += ` AND created_at>=$2 AND created_at<$3`;
      params = [payload.userId, start, end];
    }
    q += ` ORDER BY created_at`;
    const r = await pool.query(q, params);
    const rows = [['日付', '種別', '金額']];
    r.rows.forEach(row => rows.push([fmtDate(row.created_at), row.type, row.amount]));
    const csv = '﻿' + rows.map(r => r.join(',')).join('\n');
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="sales_${y || 'all'}_${m || 'all'}.csv"`,
      },
    });
  } catch (e) { return serverError(e); }
}

export async function POST(req) {
  try {
    const payload = verifyToken(req);
    if (!payload) return unauthorized();
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file) return Response.json({ success: false, message: 'ファイルが選択されていません' });
    const text = (await file.text()).replace(/^﻿/, '');
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (!lines.length) return Response.json({ success: false, message: 'CSVが空です' });
    const start = lines[0].startsWith('日付') ? 1 : 0;
    const pool = getPool();
    let imported = 0, skipped = 0;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const line of lines.slice(start)) {
        const cols = line.split(',');
        if (cols.length < 3) { skipped++; continue; }
        const [dateStr, type, amountStr] = cols;
        const amount = parseInt(amountStr);
        if (!dateStr || !type || isNaN(amount) || amount <= 0) { skipped++; continue; }
        const [y, m, d] = dateStr.trim().split('/').map(Number);
        if (!y || !m || !d) { skipped++; continue; }
        const ts = new Date(Date.UTC(y, m - 1, d, 12, 0, 0) - 9 * 3600 * 1000);
        await client.query(
          `INSERT INTO sales (user_id, type, amount, input_method, created_at, updated_at) VALUES ($1, $2, $3, 'CSV', $4, $4)`,
          [payload.userId, type.trim(), amount, ts]
        );
        imported++;
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    return Response.json({ success: true, message: `${imported}件インポートしました${skipped > 0 ? `（${skipped}件スキップ）` : ''}`, imported, skipped });
  } catch (e) { return serverError(e); }
}
