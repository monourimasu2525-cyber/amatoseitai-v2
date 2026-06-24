'use client';
import { useState, useEffect, useRef } from 'react';

function fmt(n) { return '¥' + Number(n || 0).toLocaleString(); }
function fmtS(n) { return n >= 10000 ? (Math.floor(n/1000)/10)+'万' : fmt(n); }

function BarChart({ canvasRef }) {
  return <div className="cw"><canvas ref={canvasRef} /></div>;
}

function makeBarChart(ctx, days, month) {
  if (!ctx || !window.Chart) return null;
  const now = new Date(), todayD = now.getDate(), todayM = now.getMonth()+1;
  const maxVal = Math.max(...days.map(d=>d.total), 1);
  return new window.Chart(ctx, {
    type: 'bar',
    data: {
      labels: days.map(d=>`${d.day}`),
      datasets: [{ data: days.map(d=>d.total), backgroundColor: days.map(d=>(d.day===todayD&&month===todayM)?'#C4622D':d.total>0?'#DDB89A':'#EAD9C8'), borderRadius:5, borderSkipped:false, barPercentage:0.72, categoryPercentage:0.9 }],
    },
    options: {
      responsive:true, maintainAspectRatio:false, layout:{padding:{top:18,right:4,left:4,bottom:0}},
      plugins:{ legend:{display:false}, tooltip:{backgroundColor:'#3D2314',padding:12,cornerRadius:10,titleFont:{size:12,weight:'700'},bodyFont:{size:15,weight:'800'},callbacks:{title:t=>`${month}月${t[0].label}日（${days[t[0].dataIndex]?.count||0}件）`,label:c=>c.raw>0?' ¥'+Number(c.raw).toLocaleString():' データなし'}}},
      scales:{ x:{grid:{display:false},border:{display:false},ticks:{font:{size:10,weight:'500'},color:'#B8967A',maxRotation:0,callback:(v,i)=>{const d=days[i];if(!d)return'';if(d.day===1||d.day%5===0||d.day===days.length)return`${d.day}`;return '';}}}, y:{beginAtZero:true,suggestedMax:maxVal*1.18,grid:{color:'rgba(61,35,20,0.05)'},border:{display:false},ticks:{font:{size:10},color:'#B8967A',maxTicksLimit:5,callback:v=>v===0?'0':fmtS(v)}} },
    },
  });
}

export default function StatsTab({ api }) {
  const now = new Date();
  const [view, setView] = useState('month');
  const [statsYear, setStatsYear] = useState(now.getFullYear());
  const [statsMonth, setStatsMonth] = useState(now.getMonth()+1);
  const [dayYear, setDayYear] = useState(now.getFullYear());
  const [dayMonth, setDayMonth] = useState(now.getMonth()+1);
  const [selYear, setSelYear] = useState(now.getFullYear());
  const [monthData, setMonthData] = useState(null);
  const [dayData, setDayData] = useState(null);
  const [yearData, setYearData] = useState(null);
  const [loading, setLoading] = useState(false);
  const dailyRef = useRef(null), compareRef = useRef(null), dayRef = useRef(null), yearRef = useRef(null);
  const charts = useRef({});

  useEffect(() => { loadCurrent(); }, [view, statsYear, statsMonth, dayYear, dayMonth, selYear]);

  function destroyChart(key) { if (charts.current[key]) { charts.current[key].destroy(); charts.current[key] = null; } }

  async function loadCurrent() {
    setLoading(true);
    try {
      if (view === 'month') await loadMonth();
      if (view === 'day')   await loadDay();
      if (view === 'year')  await loadYear();
    } catch {}
    setLoading(false);
  }

  async function loadMonth() {
    const y = statsYear, m = statsMonth, pm = m===1?12:m-1, py = m===1?y-1:y;
    const [cur, prev, daily, c3m] = await Promise.all([
      api.get('/api/stats/month', {year:y,month:m}),
      api.get('/api/stats/month', {year:py,month:pm}),
      api.get('/api/stats/daily', {year:y,month:m}),
      Promise.all([{y:py,m:pm},{y,m:pm===12?1:pm+1}===undefined,{y,m}].map(()=>{
        const months = [];
        for (let i=2;i>=0;i--) { let mm=m-i,yy=y; if(mm<=0){mm+=12;yy--;} months.push({y:yy,m:mm}); }
        return Promise.all(months.map(({y,m})=>api.get('/api/stats/month',{year:y,month:m}))).then(r=>({results:r,months}));
      })[0]),
    ]);
    setMonthData({ cur, prev, daily, compare: c3m });
    setTimeout(() => {
      destroyChart('daily');
      if (dailyRef.current) charts.current.daily = makeBarChart(dailyRef.current.getContext('2d'), daily.days, m);
      destroyChart('compare');
      if (compareRef.current && c3m) {
        charts.current.compare = new window.Chart(compareRef.current.getContext('2d'), {
          type:'bar', data:{ labels:c3m.months.map(({m},i)=>i===c3m.months.length-1?`${m}月\n（今月）`:`${m}月`), datasets:[{data:c3m.results.map(r=>r.totalSales),backgroundColor:c3m.months.map((_,i)=>i===c3m.months.length-1?'#C4622D':'#DDB89A'),borderRadius:10,borderSkipped:false,barPercentage:0.55}]},
          options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:20}},plugins:{legend:{display:false},tooltip:{backgroundColor:'#3D2314',padding:12,cornerRadius:10,callbacks:{title:t=>`${c3m.months[t[0].dataIndex].m}月`,label:c=>' ¥'+Number(c.raw).toLocaleString()}}},scales:{x:{grid:{display:false},border:{display:false},ticks:{font:{size:13,weight:'700'},color:'#5C3520'}},y:{beginAtZero:true,grid:{color:'rgba(61,35,20,0.05)'},border:{display:false},ticks:{font:{size:10},color:'#B8967A',maxTicksLimit:4,callback:v=>v===0?'0':fmtS(v)}}}},
        });
      }
    }, 50);
  }

  async function loadDay() {
    const data = await api.get('/api/stats/daily', {year:dayYear,month:dayMonth});
    setDayData(data);
    setTimeout(() => { destroyChart('day'); if (dayRef.current) charts.current.day = makeBarChart(dayRef.current.getContext('2d'), data.days, dayMonth); }, 50);
  }

  async function loadYear() {
    const results = await Promise.all(Array.from({length:12},(_,i)=>api.get('/api/stats/month',{year:selYear,month:i+1})));
    setYearData(results);
    setTimeout(() => {
      destroyChart('year');
      if (yearRef.current) {
        charts.current.year = new window.Chart(yearRef.current.getContext('2d'), {
          type:'bar', data:{labels:results.map((_,i)=>`${i+1}月`),datasets:[{data:results.map(r=>r.totalSales),backgroundColor:'#DDB89A',borderRadius:5,borderSkipped:false,barPercentage:0.7}]},
          options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:'#3D2314',callbacks:{title:t=>`${t[0].label}`,label:c=>' ¥'+Number(c.raw).toLocaleString()}}},scales:{x:{grid:{display:false},ticks:{font:{size:10},color:'#B8967A'}},y:{beginAtZero:true,grid:{color:'rgba(61,35,20,0.05)'},ticks:{font:{size:9},color:'#B8967A',callback:v=>v===0?'0':fmtS(v)}}}},
        });
      }
    }, 50);
  }

  function changeStatsMonth(d) { let m=statsMonth+d,y=statsYear; if(m>12){m=1;y++;} if(m<1){m=12;y--;} setStatsYear(y);setStatsMonth(m); }
  function changeDayMonth(d)   { let m=dayMonth+d,y=dayYear;     if(m>12){m=1;y++;} if(m<1){m=12;y--;} setDayYear(y);setDayMonth(m);   }

  const yearList = Array.from({length:4},(_,i)=>now.getFullYear()-i);

  return (
    <div id="page-stats" className="page active">
      <div className="ph"><h1>集計</h1></div>
      <div className="wrap">
        <div className="vtabs">
          {['year','month','day'].map(v=>(
            <button key={v} className={`vtab${view===v?' active':''}`} onClick={()=>setView(v)}>
              {v==='year'?'年別':v==='month'?'月別':'日別'}
            </button>
          ))}
        </div>

        {/* 年別 */}
        {view==='year' && (
          <div id="view-year">
            <div className="yg">{yearList.map(y=><button key={y} className={`yb${y===selYear?' active':''}`} onClick={()=>setSelYear(y)}>{y}年</button>)}</div>
            {yearData && (() => {
              const total=yearData.reduce((a,r)=>a+r.totalSales,0), count=yearData.reduce((a,r)=>a+r.totalCount,0);
              return (
                <>
                  <div className="sg" style={{marginBottom:'14px'}}>
                    <div className="sc"><div className="sv">{fmt(total)}</div><div className="sl">年間売上</div></div>
                    <div className="sc"><div className="sv">{count}件</div><div className="sl">総件数</div></div>
                    <div className="sc"><div className="sv">{fmt(count>0?Math.round(total/count):0)}</div><div className="sl">客単価</div></div>
                  </div>
                  <div className="card cp gap"><div className="cw"><canvas ref={yearRef} /></div></div>
                  <div className="card"><div className="ledger-wrap">
                    <table className="tbl">
                      <thead><tr><th>月</th><th>件数</th><th>売上</th></tr></thead>
                      <tbody>
                        {yearData.map((r,i)=><tr key={i}><td style={{fontWeight:700}}>{i+1}月</td><td>{r.totalCount>0?r.totalCount+'件':'—'}</td><td className="num">{r.totalSales>0?fmt(r.totalSales):'—'}</td></tr>)}
                        <tr className="tr-t"><td>合計</td><td>{count}件</td><td className="num">{fmt(total)}</td></tr>
                      </tbody>
                    </table>
                  </div></div>
                </>
              );
            })()}
            {loading && <span className="spin" />}
          </div>
        )}

        {/* 月別 */}
        {view==='month' && (
          <div id="view-month">
            <div className="mnav">
              <button className="mnav-btn" onClick={()=>changeStatsMonth(-1)}>◀ 前月</button>
              <span className="mnav-label">{statsYear}年{statsMonth}月</span>
              <button className="mnav-btn" onClick={()=>changeStatsMonth(1)}>翌月 ▶</button>
            </div>
            {monthData && (() => {
              const { cur, prev, daily } = monthData;
              const unit = cur.totalCount>0?Math.round(cur.totalSales/cur.totalCount):0;
              const pct = prev.totalSales>0?Math.round((cur.totalSales-prev.totalSales)/prev.totalSales*100):null;
              const daysWithSale = (daily.days||[]).filter(d=>d.total>0).length;
              return (
                <>
                  <div className="kpi-main">
                    <div className="lbl">月間売上</div>
                    <div className="val">{fmt(cur.totalSales)}</div>
                    <div className="sub">{cur.totalCount}件 / {daysWithSale}日 稼働{pct!==null&&<> · <span style={{color:pct>=0?'#86efac':'#fca5a5'}}>{pct>=0?'▲':'▼'}{Math.abs(pct)}% 先月比</span></>}</div>
                  </div>
                  <div className="sg">
                    <div className="sc"><div className="sv">{fmt(cur.shinkiSales)}</div><div className="sl">新規 {cur.shinkiCount}件</div></div>
                    <div className="sc"><div className="sv">{fmt(cur.jorenSales)}</div><div className="sl">常連 {cur.jorenCount}件</div></div>
                    <div className="sc"><div className="sv">{fmt(unit)}</div><div className="sl">客単価</div></div>
                  </div>
                  <div className="card cp gap"><div className="stitle">日別売上</div><div className="cw"><canvas ref={dailyRef} /></div></div>
                  <div className="card cp gap"><div className="stitle">3ヶ月比較</div><div className="cw"><canvas ref={compareRef} /></div></div>
                  <div className="card"><div className="ledger-wrap" id="month-table">
                    <table className="tbl">
                      <thead><tr><th>種別</th><th>件数</th><th>売上金額</th></tr></thead>
                      <tbody>
                        <tr><td><span className="badge bs">新規</span></td><td>{cur.shinkiCount}件</td><td className="num">{fmt(cur.shinkiSales)}</td></tr>
                        <tr><td><span className="badge bj">常連</span></td><td>{cur.jorenCount}件</td><td className="num">{fmt(cur.jorenSales)}</td></tr>
                        {cur.otherCount>0&&<tr><td><span className="badge bo">その他</span></td><td>{cur.otherCount}件</td><td className="num">{fmt(cur.otherSales)}</td></tr>}
                        <tr className="tr-t"><td>合計</td><td>{cur.totalCount}件</td><td className="num">{fmt(cur.totalSales)}</td></tr>
                      </tbody>
                    </table>
                  </div></div>
                </>
              );
            })()}
            {loading && <span className="spin" />}
          </div>
        )}

        {/* 日別 */}
        {view==='day' && (
          <div id="view-day">
            <div className="mnav">
              <button className="mnav-btn" onClick={()=>changeDayMonth(-1)}>◀ 前月</button>
              <span className="mnav-label">{dayYear}年{dayMonth}月</span>
              <button className="mnav-btn" onClick={()=>changeDayMonth(1)}>翌月 ▶</button>
            </div>
            {dayData && (() => {
              const active = (dayData.days||[]).filter(d=>d.total>0);
              const total = active.reduce((a,d)=>a+d.total,0), count = active.reduce((a,d)=>a+d.count,0);
              return (
                <>
                  <div className="card cp gap"><div className="cw"><canvas ref={dayRef} /></div></div>
                  {!active.length
                    ? <div className="card" style={{padding:'20px',textAlign:'center',color:'var(--sub2)'}}>この月の記録はありません</div>
                    : <div className="card"><div className="ledger-wrap">
                        <table className="tbl">
                          <thead><tr><th>日付</th><th className="r">件数</th><th className="r">新規</th><th className="r">常連</th><th className="r">合計</th></tr></thead>
                          <tbody>
                            {active.map(d=><tr key={d.day}><td style={{fontWeight:700}}>{dayMonth}/{d.day}</td><td className="r" style={{color:'var(--sub)'}}>{d.count}件</td><td className="r">{d.shinki>0?fmt(d.shinki):'—'}</td><td className="r">{d.joren>0?fmt(d.joren):'—'}</td><td className="num">{fmt(d.total)}</td></tr>)}
                            <tr className="tr-t"><td>合計</td><td className="r">{count}件</td><td></td><td></td><td className="num">{fmt(total)}</td></tr>
                          </tbody>
                        </table>
                      </div></div>
                  }
                </>
              );
            })()}
            {loading && <span className="spin" />}
          </div>
        )}
      </div>
    </div>
  );
}
