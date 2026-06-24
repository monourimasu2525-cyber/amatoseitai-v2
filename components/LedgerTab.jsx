'use client';
import { useState, useEffect } from 'react';

function fmt(n) { return '¥' + Number(n || 0).toLocaleString(); }
function badge(type) { return type === '新規' ? 'bs' : type === '常連' ? 'bj' : 'bo'; }
const DW = ['日','月','火','水','木','金','土'];

export default function LedgerTab({ api, master, refreshSignal }) {
  const now = new Date();
  const [view, setView] = useState('month');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selYear, setSelYear] = useState(now.getFullYear());
  const [dayDate, setDayDate] = useState(now);
  const [monthData, setMonthData] = useState(null);
  const [yearData, setYearData] = useState(null);
  const [dayData, setDayData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [editType, setEditType] = useState('');
  const [editAmount, setEditAmount] = useState('');

  useEffect(() => { loadCurrent(); }, [view, year, month, selYear, dayDate, refreshSignal]);

  async function loadCurrent() {
    setLoading(true);
    try {
      if (view === 'month') await loadMonth();
      if (view === 'year')  await loadYear();
      if (view === 'day')   await loadDay();
    } catch {}
    setLoading(false);
  }

  async function loadMonth() {
    const [breakdown, stats] = await Promise.all([
      api.get('/api/stats/daily', { year, month }),
      api.get('/api/stats/month', { year, month }),
    ]);
    setMonthData({ breakdown, stats });
  }

  async function loadYear() {
    const results = await Promise.all(Array.from({length:12},(_,i) => api.get('/api/stats/month', {year:selYear,month:i+1})));
    setYearData(results);
  }

  async function loadDay() {
    const y = dayDate.getFullYear(), m = dayDate.getMonth()+1, d = dayDate.getDate();
    const data = await api.get('/api/stats/day', { year:y, month:m, day:d });
    setDayData(data);
  }

  function changeMonth(d) {
    let m = month + d, y = year;
    if (m > 12) { m = 1; y++; } if (m < 1) { m = 12; y--; }
    setYear(y); setMonth(m);
  }

  function changeDay(d) { setDayDate(new Date(dayDate.getTime() + d * 86400000)); }

  async function deleteSale(id) {
    if (!confirm('この記録を削除しますか？')) return;
    await api.delete(`/api/sales/${id}`);
    loadCurrent();
  }

  async function confirmEdit() {
    if (!editType || !editAmount) return;
    await api.put(`/api/sales/${editModal}`, { type: editType, amount: parseInt(editAmount) });
    setEditModal(null); loadCurrent();
  }

  const yearList = Array.from({length:4}, (_,i) => now.getFullYear() - i);

  return (
    <div id="page-ledger" className="page active">
      <div className="ph"><h1>台帳</h1></div>
      <div className="wrap">
        <div className="vtabs">
          {['year','month','day'].map(v => (
            <button key={v} className={`vtab${view===v?' active':''}`} onClick={() => setView(v)}>
              {v==='year'?'年別':v==='month'?'月別':'日別'}
            </button>
          ))}
        </div>

        {/* 年別 */}
        {view === 'year' && (
          <div>
            <div className="yg">{yearList.map(y => <button key={y} className={`yb${y===selYear?' active':''}`} onClick={() => setSelYear(y)}>{y}年</button>)}</div>
            {yearData && (() => {
              const total = yearData.reduce((a,r)=>a+r.totalSales,0), count = yearData.reduce((a,r)=>a+r.totalCount,0);
              return (
                <>
                  <div className="card gap">
                    <div style={{padding:'14px 16px 0'}}><div className="stitle">年間サマリー</div></div>
                    <div style={{padding:'0 16px 14px',display:'flex',gap:'20px',flexWrap:'wrap'}}>
                      <div><div className="stitle" style={{marginBottom:'4px'}}>売上合計</div><div style={{fontSize:'22px',fontWeight:900,color:'var(--primary)'}}>{fmt(total)}</div></div>
                      <div><div className="stitle" style={{marginBottom:'4px'}}>件数</div><div style={{fontSize:'22px',fontWeight:900}}>{count}件</div></div>
                      <div><div className="stitle" style={{marginBottom:'4px'}}>客単価</div><div style={{fontSize:'22px',fontWeight:900}}>{fmt(count>0?Math.round(total/count):0)}</div></div>
                    </div>
                  </div>
                  <div className="card">
                    <div className="ledger-wrap">
                      <table className="ltbl">
                        <thead><tr><th>月</th><th className="r">件数</th><th className="r">新規</th><th className="r">常連</th><th className="r">合計</th></tr></thead>
                        <tbody>
                          {yearData.map((r,i) => (
                            <tr key={i} className={i%2===0?'row-even':'row-odd'}>
                              <td style={{fontWeight:700}}>{i+1}月</td>
                              <td className="r" style={{color:'var(--sub)'}}>{r.totalCount>0?r.totalCount+'件':'—'}</td>
                              <td className="r">{r.shinkiSales>0?fmt(r.shinkiSales):'—'}</td>
                              <td className="r">{r.jorenSales>0?fmt(r.jorenSales):'—'}</td>
                              <td className="num">{r.totalSales>0?fmt(r.totalSales):'—'}</td>
                            </tr>
                          ))}
                          <tr className="row-total">
                            <td colSpan={2}>合計 {count}件</td>
                            <td className="r">{fmt(yearData.reduce((a,r)=>a+r.shinkiSales,0))}</td>
                            <td className="r">{fmt(yearData.reduce((a,r)=>a+r.jorenSales,0))}</td>
                            <td className="num">{fmt(total)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              );
            })()}
            {loading && <span className="spin" />}
          </div>
        )}

        {/* 月別 */}
        {view === 'month' && (
          <div>
            <div className="mnav">
              <button className="mnav-btn" onClick={() => changeMonth(-1)}>◀ 前月</button>
              <span className="mnav-label">{year}年{month}月</span>
              <button className="mnav-btn" onClick={() => changeMonth(1)}>翌月 ▶</button>
            </div>
            {monthData && (() => {
              const s = monthData.stats;
              return (
                <>
                  <div className="card gap">
                    <div style={{padding:'14px 16px 0'}}><div className="stitle">月間合計</div></div>
                    <div style={{padding:'0 16px 14px',display:'flex',gap:'20px',flexWrap:'wrap'}}>
                      <div><div className="stitle" style={{marginBottom:'4px'}}>売上合計</div><div style={{fontSize:'22px',fontWeight:900,color:'var(--primary)'}}>{fmt(s.totalSales)}</div></div>
                      <div><div className="stitle" style={{marginBottom:'4px'}}>件数</div><div style={{fontSize:'22px',fontWeight:900}}>{s.totalCount}件</div></div>
                      <div><div className="stitle" style={{marginBottom:'4px'}}>客単価</div><div style={{fontSize:'22px',fontWeight:900}}>{fmt(s.totalCount>0?Math.round(s.totalSales/s.totalCount):0)}</div></div>
                    </div>
                  </div>
                  <div className="card" id="ledger-table">
                    {monthData.breakdown.days.map(d => {
                      const date = new Date(year, month-1, d.day);
                      const dow = DW[date.getDay()];
                      const isToday = year===now.getFullYear()&&month===now.getMonth()+1&&d.day===now.getDate();
                      const isSun = date.getDay()===0, isSat = date.getDay()===6;
                      return (
                        <div key={d.day} onClick={() => d.total>0 && (setDayDate(new Date(year,month-1,d.day)), setView('day'))}
                          style={{display:'flex',alignItems:'center',padding:'11px 16px',borderBottom:'1px solid var(--border)',cursor:d.total>0?'pointer':'default',background:isToday?'var(--primary-l)':''}}>
                          <div style={{width:'46px',flexShrink:0}}>
                            <span style={{fontSize:'15px',fontWeight:d.total>0?900:600,color:isToday?'var(--primary)':d.total>0?'var(--text)':'var(--sub2)'}}>{d.day}</span>
                            <span style={{fontSize:'11px',fontWeight:700,marginLeft:'3px',color:isSun?'#e53e3e':isSat?'#3182ce':'var(--sub2)'}}>{dow}</span>
                          </div>
                          {d.total > 0
                            ? <><div style={{flex:1}}><div style={{fontSize:'16px',fontWeight:900,color:'var(--accent)'}}>{fmt(d.total)}</div><div style={{fontSize:'11px',color:'var(--sub2)',marginTop:'1px'}}>{d.count}件{d.shinki>0?` · 新規${fmt(d.shinki)}`:''}{d.joren>0?` · 常連${fmt(d.joren)}`:''}</div></div><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--sub2)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg></>
                            : <div style={{flex:1,color:'var(--sub2)',fontSize:'13px'}}>—</div>
                          }
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
            {loading && <span className="spin" />}
          </div>
        )}

        {/* 日別 */}
        {view === 'day' && (
          <div>
            <div className="mnav">
              <button className="mnav-btn" onClick={() => changeDay(-1)}>◀ 前日</button>
              <span className="mnav-label">{dayDate.getFullYear()}年{dayDate.getMonth()+1}月{dayDate.getDate()}日（{DW[dayDate.getDay()]}）</span>
              <button className="mnav-btn" onClick={() => changeDay(1)}>翌日 ▶</button>
            </div>
            {dayData && (() => {
              const s = dayData.summary;
              return (
                <>
                  <div className="card gap">
                    <div style={{padding:'14px 16px 0'}}><div className="stitle">日計</div></div>
                    <div style={{padding:'0 16px 14px',display:'flex',gap:'20px',flexWrap:'wrap'}}>
                      <div><div className="stitle" style={{marginBottom:'4px'}}>売上合計</div><div style={{fontSize:'22px',fontWeight:900,color:'var(--primary)'}}>{fmt(s.totalSales)}</div></div>
                      <div><div className="stitle" style={{marginBottom:'4px'}}>件数</div><div style={{fontSize:'22px',fontWeight:900}}>{s.totalCount}件</div></div>
                    </div>
                    <div style={{padding:'0 16px 14px',display:'flex',gap:'20px',flexWrap:'wrap'}}>
                      <div><div className="stitle" style={{marginBottom:'4px'}}>新規</div><div style={{fontSize:'16px',fontWeight:900}}>{fmt(s.shinkiSales)}<span style={{fontSize:'12px',color:'var(--sub2)',marginLeft:'4px'}}>({s.shinkiCount}件)</span></div></div>
                      <div><div className="stitle" style={{marginBottom:'4px'}}>常連</div><div style={{fontSize:'16px',fontWeight:900}}>{fmt(s.jorenSales)}<span style={{fontSize:'12px',color:'var(--sub2)',marginLeft:'4px'}}>({s.jorenCount}件)</span></div></div>
                    </div>
                  </div>
                  <div className="card" id="ledger-day-table">
                    {!dayData.records.length
                      ? <div style={{padding:'20px',textAlign:'center',color:'var(--sub2)'}}>この日の記録はありません</div>
                      : <table className="ltbl">
                          <thead><tr><th>時刻</th><th>種別</th><th style={{textAlign:'right'}}>金額</th><th style={{textAlign:'right'}}></th></tr></thead>
                          <tbody>
                            {dayData.records.map((r, i) => (
                              <tr key={r.id} className={i%2===0?'row-even':'row-odd'}>
                                <td style={{color:'var(--sub2)',fontSize:'13px'}}>{r.time}</td>
                                <td><span className={`badge ${badge(r.type)}`}>{r.type}</span></td>
                                <td className="num">{fmt(r.amount)}</td>
                                <td style={{textAlign:'right'}}>
                                  <button className="ib" style={{marginRight:'4px'}} onClick={() => { setEditModal(r.id); setEditType(r.type); setEditAmount(String(r.amount)); }}>編集</button>
                                  <button className="db" onClick={() => deleteSale(r.id)}>✕</button>
                                </td>
                              </tr>
                            ))}
                            <tr className="row-total"><td colSpan={2}>合計</td><td className="num">{fmt(s.totalSales)}</td><td></td></tr>
                          </tbody>
                        </table>
                    }
                  </div>
                </>
              );
            })()}
            {loading && <span className="spin" />}
          </div>
        )}
      </div>

      {editModal && (
        <div className="modal open" onClick={e => e.currentTarget===e.target && setEditModal(null)}>
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
