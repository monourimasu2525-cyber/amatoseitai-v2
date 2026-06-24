'use client';
import { useState } from 'react';

function fmt(n) { return '¥' + Number(n || 0).toLocaleString(); }

export default function AccountingTab({ api }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  async function loadReport() {
    setLoading(true);
    try {
      const data = await api.get('/api/report', { year, month });
      setReport(data);
    } catch {}
    setLoading(false);
  }

  function downloadCsv() {
    window.open(api.csvUrl({ year, month }));
  }

  function downloadAllCsv() {
    window.open(api.csvUrl({}));
  }

  const years = Array.from({length:4},(_,i)=>now.getFullYear()-i);
  const months = Array.from({length:12},(_,i)=>i+1);

  return (
    <div id="page-accounting" className="page active">
      <div className="ph"><h1>経理</h1><div className="sub">月次レポート・CSV出力</div></div>
      <div className="wrap">
        <div className="card cp gap">
          <div className="stitle">対象月を選択</div>
          <div style={{display:'flex',gap:'10px',marginBottom:'14px'}}>
            <select className="fc" style={{flex:1}} value={year} onChange={e=>setYear(parseInt(e.target.value))}>
              {years.map(y=><option key={y} value={y}>{y}年</option>)}
            </select>
            <select className="fc" style={{flex:1}} value={month} onChange={e=>setMonth(parseInt(e.target.value))}>
              {months.map(m=><option key={m} value={m}>{m}月</option>)}
            </select>
          </div>
          <div style={{display:'flex',gap:'10px'}}>
            <button className="btn btn-p" style={{flex:1}} onClick={loadReport} disabled={loading}>
              {loading ? '...' : 'レポート表示'}
            </button>
            <button className="btn btn-s" style={{flex:1}} onClick={downloadCsv}>CSV出力</button>
          </div>
        </div>

        {report && (
          <div>
            <div className="kpi-main">
              <div className="lbl">{report.year}年{report.month}月 売上合計</div>
              <div className="val">{fmt(report.summary.totalSales)}</div>
              <div className="sub">{report.summary.totalCount}件</div>
            </div>
            <div className="card cp gap">
              <div className="stitle">種別集計</div>
              <table className="tbl">
                <thead><tr><th>種別</th><th>件数</th><th>売上金額</th></tr></thead>
                <tbody>
                  <tr><td><span className="badge bs">新規</span></td><td>{report.summary.shinkiCount}件</td><td className="num">{fmt(report.summary.shinkiSales)}</td></tr>
                  <tr><td><span className="badge bj">常連</span></td><td>{report.summary.jorenCount}件</td><td className="num">{fmt(report.summary.jorenSales)}</td></tr>
                  {report.summary.otherCount>0&&<tr><td><span className="badge bo">その他</span></td><td>{report.summary.otherCount}件</td><td className="num">{fmt(report.summary.otherSales)}</td></tr>}
                  <tr className="tr-t"><td>合計</td><td>{report.summary.totalCount}件</td><td className="num">{fmt(report.summary.totalSales)}</td></tr>
                </tbody>
              </table>
            </div>
            <div className="card cp gap no-print">
              <div className="stitle">明細</div>
              <table className="tbl">
                <thead><tr><th>日付</th><th>種別</th><th>金額</th></tr></thead>
                <tbody>
                  {report.records.map(r=>(
                    <tr key={r.id}><td>{r.date}</td><td><span className={`badge ${r.type==='新規'?'bs':r.type==='常連'?'bj':'bo'}`}>{r.type}</span></td><td className="num">{fmt(r.amount)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="no-print" style={{display:'flex',gap:'10px',marginBottom:'12px'}}>
              <button className="btn btn-s" style={{flex:1}} onClick={()=>window.print()}>印刷</button>
              <button className="btn btn-s" style={{flex:1}} onClick={downloadCsv}>CSV保存</button>
            </div>
          </div>
        )}

        <div className="card cp">
          <div className="stitle" style={{marginBottom:'10px'}}>全データCSV</div>
          <p style={{fontSize:'13px',color:'var(--sub)',marginBottom:'12px'}}>全期間の売上データをCSVで書き出します。</p>
          <button className="btn btn-s btn-w" onClick={downloadAllCsv}>全データをCSV出力</button>
        </div>
      </div>
    </div>
  );
}
