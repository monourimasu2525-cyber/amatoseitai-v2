'use client';
import { useState, useEffect, useRef } from 'react';

function fmt(n)  { return '¥' + Number(n || 0).toLocaleString(); }
function fmtS(n) { return n >= 10000 ? (Math.floor(n / 1000) / 10) + '万' : fmt(n); }
function badge(type) { return type === '新規' ? 'bs' : type === '常連' ? 'bj' : 'bo'; }
function todayKey() { const d = new Date(); return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`; }

export default function HomeTab({ api, master, onOpenQuick, onNeedRefresh, refreshSignal }) {
  const [today, setToday] = useState(null);
  const [thisM, setThisM] = useState(null);
  const [prevM, setPrevM] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(null);
  const [editType, setEditType] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => { load(); }, [refreshSignal]);

  async function load() {
    setLoading(true);
    try {
      const d = new Date(), y = d.getFullYear(), m = d.getMonth()+1;
      const pm = m===1?12:m-1, py = m===1?y-1:y;
      const [td, tm, prm, hist, daily] = await Promise.all([
        api.get('/api/stats/today'),
        api.get('/api/stats/month', { year: y, month: m }),
        api.get('/api/stats/month', { year: py, month: pm }),
        api.get('/api/history', { days: 1 }),
        api.get('/api/stats/daily', { year: y, month: m }),
      ]);
      setToday(td); setThisM(tm); setPrevM(prm);
      setRecords((hist.records || []).filter(r => r.date === todayKey()));
      renderChart(daily, m);
    } catch {}
    setLoading(false);
  }

  function renderChart(daily, m) {
    const Script = typeof window !== 'undefined' && window.Chart;
    if (!chartRef.current || !Script) return;
    if (chartInstance.current) chartInstance.current.destroy();
    const today = new Date().getDate();
    chartInstance.current = new window.Chart(chartRef.current.getContext('2d'), {
      type: 'bar',
      data: {
        labels: daily.days.map(d => `${d.day}`),
        datasets: [{ data: daily.days.map(d => d.total), backgroundColor: daily.days.map(d => d.day === today ? '#C4622D' : '#DDB89A'), borderRadius: 3, borderSkipped: false, barPercentage: 0.7, categoryPercentage: 0.85 }],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: '#3D2314', callbacks: { title: t => `${m}/${t[0].label}`, label: c => c.raw > 0 ? '¥'+Number(c.raw).toLocaleString() : '' } } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 8 }, color: '#B8967A', maxTicksLimit: 16 } }, y: { beginAtZero: true, grid: { color: 'rgba(61,35,20,.05)' }, ticks: { font: { size: 8 }, color: '#B8967A', callback: v => v===0?'':fmtS(v) } } } },
    });
  }

  async function deleteSale(id) {
    if (!confirm('この記録を削除しますか？')) return;
    const r = await api.delete(`/api/sales/${id}`);
    if (r.success) { load(); onNeedRefresh?.(); } else alert(r.message);
  }

  async function confirmEdit() {
    if (!editType || !editAmount) return;
    const r = await api.put(`/api/sales/${editModal}`, { type: editType, amount: parseInt(editAmount) });
    if (r.success) { setEditModal(null); load(); } else alert(r.message);
  }

  const now = new Date(), m = now.getMonth()+1;
  const pct = prevM?.totalSales > 0 ? Math.round((thisM?.totalSales - prevM.totalSales) / prevM.totalSales * 100) : null;
  const ratioItems = thisM?.totalSales > 0 ? [
    thisM.shinkiSales > 0 && { lbl:'新規', val:thisM.shinkiSales, count:thisM.shinkiCount, color:'#C4622D' },
    thisM.jorenSales > 0  && { lbl:'常連', val:thisM.jorenSales,  count:thisM.jorenCount,  color:'#8B5A3A' },
    thisM.otherSales > 0  && { lbl:'他',   val:thisM.otherSales,  count:thisM.otherCount,  color:'#B8967A' },
  ].filter(Boolean) : [];

  return (
    <div id="page-home" className="page active">
      <div className="home-header">
        <div className="home-header-lbl">今日の売上</div>
        <div className="home-today-val">{loading ? '—' : fmt(today?.totalSales)}</div>
        <div className="home-today-sub">{loading ? '読み込み中…' : `合計 ${today?.totalCount || 0}件`}</div>
        <div className="home-mini-grid">
          <div className="hmc"><div className="hmc-lbl">今月合計</div><div className="hmc-val">{fmtS(thisM?.totalSales)}</div></div>
          <div className="hmc"><div className="hmc-lbl">新規</div><div className="hmc-val">{fmt(today?.shinkiSales)}</div><div className="hmc-sub">{today?.shinkiCount || 0}件</div></div>
          <div className="hmc"><div className="hmc-lbl">常連</div><div className="hmc-val">{fmt(today?.jorenSales)}</div><div className="hmc-sub">{today?.jorenCount || 0}件</div></div>
        </div>
      </div>

      <div className="plans-wrap">
        <div className="plans-lbl">クイック入力</div>
        <div className="plans-scroll">
          {loading ? <span className="spin" style={{margin:'8px 14px'}} /> :
            !master.length ? <div style={{padding:'4px 14px',color:'var(--sub2)',fontSize:'13px'}}>設定からマスタを追加してください</div> :
            master.map((item, i) => (
              <button key={item.id} className={`plan-card${i > 0 ? ' sec' : ''}`} onClick={() => onOpenQuick(item.type, item.amount)}>
                <div className="pc-name">{item.type}</div>
                <div className="pc-amt">{fmt(item.amount)}</div>
                <div className="pc-hint">タップして入力</div>
              </button>
            ))
          }
        </div>
      </div>

      <div className="home-content">
        <div className="mcard gap">
          <div className="lbl">今月の売上</div>
          <div className="mcard-row">
            <div className="val">{fmt(thisM?.totalSales)}</div>
            <span className={`tag ${pct === null ? 't-fl' : pct >= 0 ? 't-up' : 't-dn'}`}>
              {pct === null ? '先月比なし' : `${pct >= 0 ? '▲' : '▼'}${Math.abs(pct)}% 先月比`}
            </span>
          </div>
          <div className="cnt">{thisM?.totalCount || 0}件</div>
          <div className="pb"><div className="pf" style={{ width: prevM?.totalSales > 0 ? Math.min(Math.round((thisM?.totalSales||0)/prevM.totalSales*100),130)+'%' : '0%' }} /></div>
        </div>

        <div className="card cp gap">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'4px'}}>
            <div className="stitle" style={{margin:0}}>今月の日別売上</div>
            <span style={{fontSize:'11px',color:'var(--sub2)',fontWeight:600}}>{m}月</span>
          </div>
          <div className="cw" style={{height:'150px'}}><canvas ref={chartRef} id="home-chart" /></div>
        </div>

        {ratioItems.length > 0 && (
          <div className="ratio-card gap">
            <div className="stitle" style={{marginBottom:'10px'}}>プラン比率</div>
            {ratioItems.map(it => {
              const p = Math.round(it.val / thisM.totalSales * 100);
              return (
                <div key={it.lbl} className="ratio-row">
                  <span className="ratio-lbl">{it.lbl}</span>
                  <div className="ratio-bar-wrap"><div className="ratio-bar-fill" style={{width:`${p}%`,background:it.color}} /></div>
                  <span className="ratio-info">{p}% ({it.count}件)</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="stitle">今日の記録</div>
        <div className="card">
          {loading ? <span className="spin" /> :
            !records.length ? <div style={{padding:'18px',textAlign:'center',color:'var(--sub2)',fontSize:'14px'}}>まだ記録がありません</div> :
            records.map(r => (
              <div key={r.id} className="li">
                <span className={`badge ${badge(r.type)}`}>{r.type}</span>
                <span className="la">{fmt(r.amount)}</span>
                <span className="lt">{r.time}</span>
                <button className="ib" style={{marginRight:'4px'}} onClick={() => { setEditModal(r.id); setEditType(r.type); setEditAmount(String(r.amount)); }}>編集</button>
                <button className="db" onClick={() => deleteSale(r.id)}>✕</button>
              </div>
            ))
          }
        </div>
      </div>

      {editModal && (
        <div className="modal open" onClick={e => e.currentTarget === e.target && setEditModal(null)}>
          <div className="mbox">
            <div className="mtitle">記録を編集</div>
            <div className="fg">
              <label className="fl">種別</label>
              <select className="fc" value={editType} onChange={e => setEditType(e.target.value)}>
                {master.map(m => <option key={m.id} value={m.type}>{m.type} ({fmt(m.amount)})</option>)}
              </select>
            </div>
            <div className="fg">
              <label className="fl">金額</label>
              <input type="number" className="fc" value={editAmount} onChange={e => setEditAmount(e.target.value)} />
            </div>
            <div className="mfoot">
              <button className="btn btn-s" style={{flex:1}} onClick={() => setEditModal(null)}>キャンセル</button>
              <button className="btn btn-p" style={{flex:1}} onClick={confirmEdit}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
