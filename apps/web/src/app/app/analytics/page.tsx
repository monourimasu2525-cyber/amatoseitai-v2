'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { GET } from '@/lib/api'
import type { MonthStats } from '@/types'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const fmt = (n: number) => '¥' + Number(n).toLocaleString()
const fmtS = (n: number) => n >= 10000 ? (n / 10000).toFixed(1).replace('.0', '') + '万' : '¥' + Number(n).toLocaleString()

interface DayBreakdown { day: number; total: number; shinki: number; joren: number; other: number; count: number }
interface CustomerAnalytics {
  total_customers: number; repeat_customers: number; repeat_rate: number
  churn_count: number; churn_rate: number; avg_visits: number; avg_ltv: number
  dormant: { id: number; name: string; phone: string; last_visit: string | null; days_since: number | null; visit_count: number }[]
  top_customers: { id: number; name: string; visit_count: number; total_amount: number }[]
  monthly_new: { month: string; count: number }[]
}

export default function AnalyticsPage() {
  const router = useRouter()
  const now = new Date()
  const [view, setView] = useState<'year' | 'month' | 'day' | 'customer'>('month')
  const [statsYear, setStatsYear] = useState(now.getFullYear())
  const [statsMonth, setStatsMonth] = useState(now.getMonth() + 1)
  const [dayYear, setDayYear] = useState(now.getFullYear())
  const [dayMonth, setDayMonth] = useState(now.getMonth() + 1)
  const [selYear, setSelYear] = useState(now.getFullYear())

  // データ
  const [yearResults, setYearResults] = useState<MonthStats[]>([])
  const [monthCur, setMonthCur] = useState<MonthStats | null>(null)
  const [monthPrev, setMonthPrev] = useState<MonthStats | null>(null)
  const [monthDays, setMonthDays] = useState<DayBreakdown[]>([])
  const [dayDays, setDayDays] = useState<DayBreakdown[]>([])

  const [customerData, setCustomerData] = useState<CustomerAnalytics | null>(null)
  const [customerLoading, setCustomerLoading] = useState(false)

  // 月ピッカー
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(now.getFullYear())
  const [pickerTarget, setPickerTarget] = useState<'month' | 'day'>('month')

  // チャートref
  const yearChartRef = useRef<HTMLCanvasElement>(null)
  const dailyChartRef = useRef<HTMLCanvasElement>(null)
  const compareChartRef = useRef<HTMLCanvasElement>(null)
  const dayChartRef = useRef<HTMLCanvasElement>(null)
  const yearChart = useRef<Chart | null>(null)
  const dailyChart = useRef<Chart | null>(null)
  const compareChart = useRef<Chart | null>(null)
  const dayChart = useRef<Chart | null>(null)

  const loadYear = useCallback(async () => {
    const results = await Promise.all(
      Array.from({ length: 12 }, (_, i) => GET<MonthStats>('/api/getMonthStats', { year: selYear, month: i + 1 }))
    )
    setYearResults(results)
  }, [selYear])

  const loadMonth = useCallback(async () => {
    const pm = statsMonth === 1 ? 12 : statsMonth - 1
    const py = statsMonth === 1 ? statsYear - 1 : statsYear
    const [cur, prev, daily] = await Promise.all([
      GET<MonthStats>('/api/getMonthStats', { year: statsYear, month: statsMonth }),
      GET<MonthStats>('/api/getMonthStats', { year: py, month: pm }),
      GET<{ days: DayBreakdown[] }>('/api/getDailyBreakdown', { year: statsYear, month: statsMonth }),
    ])
    setMonthCur(cur); setMonthPrev(prev); setMonthDays(daily.days)
  }, [statsYear, statsMonth])

  const loadDay = useCallback(async () => {
    const data = await GET<{ days: DayBreakdown[] }>('/api/getDailyBreakdown', { year: dayYear, month: dayMonth })
    setDayDays(data.days)
  }, [dayYear, dayMonth])

  useEffect(() => { if (view === 'year') loadYear() }, [view, loadYear])
  useEffect(() => { if (view === 'month') loadMonth() }, [view, loadMonth])
  useEffect(() => { if (view === 'day') loadDay() }, [view, loadDay])
  useEffect(() => {
    if (view !== 'customer' || customerLoading) return
    setCustomerLoading(true)
    GET<CustomerAnalytics & { success: boolean }>('/api/analytics/customers').then(d => {
      if (d.success) setCustomerData(d)
      setCustomerLoading(false)
    }).catch(() => setCustomerLoading(false))
  }, [view]) // eslint-disable-line react-hooks/exhaustive-deps

  // 年別チャート
  useEffect(() => {
    if (view !== 'year' || !yearChartRef.current || yearResults.length === 0) return
    if (yearChart.current) yearChart.current.destroy()
    const ctx = yearChartRef.current.getContext('2d')!
    yearChart.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Array.from({ length: 12 }, (_, i) => `${i + 1}月`),
        datasets: [
          { label: '新規', data: yearResults.map(r => r.shinkiSales), backgroundColor: '#C4622D', borderRadius: 3, borderSkipped: false, stack: 's' },
          { label: '常連', data: yearResults.map(r => r.jorenSales), backgroundColor: '#DDB89A', borderRadius: 3, borderSkipped: false, stack: 's' },
          { label: 'その他', data: yearResults.map(r => r.otherSales), backgroundColor: '#EAD9C8', borderRadius: 3, borderSkipped: false, stack: 's' },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, usePointStyle: true, boxWidth: 8, padding: 14 } }, tooltip: { backgroundColor: '#3D2314', callbacks: { label: c => `${c.dataset.label}: ¥${Number(c.raw).toLocaleString()}` } } },
        scales: { x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 }, color: '#8B5A3A' } }, y: { stacked: true, beginAtZero: true, grid: { color: 'rgba(61,35,20,0.04)' }, ticks: { font: { size: 9 }, color: '#B8967A', callback: v => v === 0 ? '0' : fmtS(Number(v)) } } },
      },
    })
  }, [view, yearResults])

  // 月別チャート
  useEffect(() => {
    if (view !== 'month' || !dailyChartRef.current || monthDays.length === 0) return
    const now2 = new Date()
    if (dailyChart.current) dailyChart.current.destroy()
    const ctx = dailyChartRef.current.getContext('2d')!
    dailyChart.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: monthDays.map(d => `${d.day}`),
        datasets: [{ data: monthDays.map(d => d.total), backgroundColor: monthDays.map(d => d.day === now2.getDate() && statsMonth === now2.getMonth() + 1 ? '#C4622D' : d.total > 0 ? '#DDB89A' : '#EAD9C8'), borderRadius: 5, borderSkipped: false, barPercentage: 0.72, categoryPercentage: 0.9 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#3D2314', callbacks: { title: t => `${statsMonth}月${t[0].label}日`, label: c => c.raw ? ' ¥' + Number(c.raw).toLocaleString() : ' データなし' } } },
        scales: { x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#B8967A', callback: (_, i) => { const d = monthDays[i]; return d.day === 1 || d.day % 5 === 0 || d.day === monthDays.length ? `${d.day}` : '' } } }, y: { beginAtZero: true, grid: { color: 'rgba(61,35,20,0.05)' }, ticks: { font: { size: 10 }, color: '#B8967A', maxTicksLimit: 5, callback: v => v === 0 ? '0' : fmtS(Number(v)) } } },
      },
    })
  }, [view, monthDays, statsMonth])

  // 3ヶ月比較チャート
  useEffect(() => {
    if (view !== 'month' || !compareChartRef.current) return
    const loadCompare = async () => {
      const months: { y: number; m: number }[] = []
      for (let i = 2; i >= 0; i--) { let m = statsMonth - i, y = statsYear; if (m <= 0) { m += 12; y-- } months.push({ y, m }) }
      const results = await Promise.all(months.map(({ y, m }) => GET<MonthStats>('/api/getMonthStats', { year: y, month: m })))
      if (compareChart.current) compareChart.current.destroy()
      const ctx = compareChartRef.current!.getContext('2d')!
      compareChart.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: months.map(({ m }, i) => i === months.length - 1 ? `${m}月\n（今月）` : `${m}月`),
          datasets: [{ data: results.map(r => r.totalSales), backgroundColor: months.map((_, i) => i === months.length - 1 ? '#C4622D' : '#DDB89A'), borderRadius: 10, borderSkipped: false, barPercentage: 0.55 }],
        },
        options: {
          responsive: true, maintainAspectRatio: false, layout: { padding: { top: 20 } },
          plugins: { legend: { display: false }, tooltip: { backgroundColor: '#3D2314', callbacks: { title: t => `${months[t[0].dataIndex].m}月`, label: c => ' ¥' + Number(c.raw).toLocaleString() + '（' + results[c.dataIndex]?.totalCount + '件）' } } },
          scales: { x: { grid: { display: false }, ticks: { font: { size: 13, weight: 700 }, color: '#5C3520' } }, y: { beginAtZero: true, grid: { color: 'rgba(61,35,20,0.05)' }, ticks: { font: { size: 10 }, color: '#B8967A', maxTicksLimit: 4, callback: v => v === 0 ? '0' : fmtS(Number(v)) } } },
        },
      })
    }
    loadCompare()
  }, [view, statsMonth, statsYear])

  // 日別チャート
  useEffect(() => {
    if (view !== 'day' || !dayChartRef.current || dayDays.length === 0) return
    if (dayChart.current) dayChart.current.destroy()
    const ctx = dayChartRef.current.getContext('2d')!
    dayChart.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: dayDays.map(d => `${d.day}`),
        datasets: [{ data: dayDays.map(d => d.total), backgroundColor: dayDays.map(d => d.total > 0 ? '#DDB89A' : '#EAD9C8'), borderRadius: 5, borderSkipped: false, barPercentage: 0.72, categoryPercentage: 0.9 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#3D2314', callbacks: { title: t => `${dayMonth}月${t[0].label}日`, label: c => c.raw ? ' ¥' + Number(c.raw).toLocaleString() : ' データなし' } } },
        scales: { x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#B8967A' } }, y: { beginAtZero: true, grid: { color: 'rgba(61,35,20,0.05)' }, ticks: { font: { size: 10 }, color: '#B8967A', maxTicksLimit: 5, callback: v => v === 0 ? '0' : fmtS(Number(v)) } } },
      },
    })
  }, [view, dayDays, dayMonth])

  function changeStatsMonth(d: number) {
    let m = statsMonth + d, y = statsYear
    if (m > 12) { m = 1; y++ }
    if (m < 1) { m = 12; y-- }
    setStatsYear(y); setStatsMonth(m)
  }

  function changeDayMonth(d: number) {
    let m = dayMonth + d, y = dayYear
    if (m > 12) { m = 1; y++ }
    if (m < 1) { m = 12; y-- }
    setDayYear(y); setDayMonth(m)
  }

  function openPicker(target: 'month' | 'day') {
    setPickerTarget(target)
    setPickerYear(target === 'month' ? statsYear : dayYear)
    setPickerOpen(true)
  }

  function selectPickerMonth(m: number) {
    if (pickerTarget === 'month') { setStatsYear(pickerYear); setStatsMonth(m) }
    else { setDayYear(pickerYear); setDayMonth(m) }
    setPickerOpen(false)
  }

  const yearTotal = yearResults.reduce((a, r) => a + r.totalSales, 0)
  const yearCount = yearResults.reduce((a, r) => a + r.totalCount, 0)
  const unit = monthCur && monthCur.totalCount > 0 ? Math.round(monthCur.totalSales / monthCur.totalCount) : 0
  const prevPct = monthCur && monthPrev && monthPrev.totalSales > 0 ? Math.round((monthCur.totalSales - monthPrev.totalSales) / monthPrev.totalSales * 100) : null
  const dayActive = dayDays.filter(d => d.total > 0)

  return (
    <div className="page">
      <div className="ph"><h1>集計</h1></div>
      <div className="wrap">
        <div className="vtabs">
          {(['year', 'month', 'day', 'customer'] as const).map((v, i) => (
            <button key={v} className={`vtab ${view === v ? 'active' : ''}`} onClick={() => setView(v)}>{['年別', '月別', '日別', '顧客'][i]}</button>
          ))}
        </div>

        {/* 年別 */}
        {view === 'year' && (
          <>
            <div className="yg">
              {Array.from({ length: 4 }, (_, i) => now.getFullYear() - i).map(y => (
                <button key={y} className={`yb ${y === selYear ? 'active' : ''}`} onClick={() => setSelYear(y)}>{y}年</button>
              ))}
            </div>
            <div className="kpi-main gap">
              <div className="lbl">年間売上</div>
              <div className="val">{fmt(yearTotal)}</div>
              <div className="sub">{yearCount}件 ／ 客単価 {fmt(yearCount > 0 ? Math.round(yearTotal / yearCount) : 0)}</div>
            </div>
            <div className="kpi2">
              <div className="kc"><div className="lbl">新規</div><div className="val">{fmt(yearResults.reduce((a, r) => a + r.shinkiSales, 0))}</div><div className="sub">{yearResults.reduce((a, r) => a + r.shinkiCount, 0)}件</div></div>
              <div className="kc"><div className="lbl">常連</div><div className="val">{fmt(yearResults.reduce((a, r) => a + r.jorenSales, 0))}</div><div className="sub">{yearResults.reduce((a, r) => a + r.jorenCount, 0)}件</div></div>
            </div>
            <div className="card cp gap"><div className="stitle">月別推移</div><div className="cw"><canvas ref={yearChartRef} /></div></div>
            <div className="card gap">
              <div style={{ padding: '16px 16px 0' }}><div className="stitle">月別内訳</div></div>
              <table className="tbl">
                <thead><tr><th>月</th><th className="r">件数</th><th className="r">新規</th><th className="r">常連</th><th className="r">合計</th></tr></thead>
                <tbody>
                  {yearResults.map((r, i) => r.totalCount > 0 && (
                    <tr key={i}><td style={{ fontWeight: 700 }}>{i + 1}月</td><td className="r" style={{ color: 'var(--sub)' }}>{r.totalCount}件</td><td className="r">{r.shinkiSales > 0 ? fmt(r.shinkiSales) : '—'}</td><td className="r">{r.jorenSales > 0 ? fmt(r.jorenSales) : '—'}</td><td className="num">{fmt(r.totalSales)}</td></tr>
                  ))}
                  <tr className="tr-t"><td>合計</td><td className="r">{yearCount}件</td><td className="r">{fmt(yearResults.reduce((a, r) => a + r.shinkiSales, 0))}</td><td className="r">{fmt(yearResults.reduce((a, r) => a + r.jorenSales, 0))}</td><td className="num">{fmt(yearTotal)}</td></tr>
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* 月別 */}
        {view === 'month' && (
          <>
            <div className="mnav">
              <button className="mnav-btn" onClick={() => changeStatsMonth(-1)}>◀ 前月</button>
              <span className="mnav-label" onClick={() => openPicker('month')}>{statsYear}年{statsMonth}月</span>
              <button className="mnav-btn" onClick={() => changeStatsMonth(1)}>翌月 ▶</button>
            </div>
            <div className="kpi-main gap">
              <div className="lbl">月間売上</div>
              <div className="val">{monthCur ? fmt(monthCur.totalSales) : '—'}</div>
              <div className="sub">{monthCur?.totalCount ?? '—'}件 ／ 客単価 {fmt(unit)}</div>
            </div>
            <div className="kpi2">
              <div className="kc"><div className="lbl">新規</div><div className="val">{monthCur ? fmt(monthCur.shinkiSales) : '—'}</div><div className="sub">{monthCur?.shinkiCount}件</div></div>
              <div className="kc"><div className="lbl">常連</div><div className="val">{monthCur ? fmt(monthCur.jorenSales) : '—'}</div><div className="sub">{monthCur?.jorenCount}件</div></div>
            </div>
            <div className="sg">
              <div className="sc"><div className="sv">{monthDays.filter(d => d.total > 0).length}日</div><div className="sl">営業日数</div></div>
              <div className="sc"><div className="sv">{fmt(unit)}</div><div className="sl">客単価</div></div>
              <div className="sc"><div className="sv" style={{ fontSize: 15, color: prevPct !== null ? (prevPct >= 0 ? 'var(--pos)' : 'var(--neg)') : undefined, fontWeight: 900 }}>{prevPct !== null ? `${prevPct >= 0 ? '▲' : '▼'}${Math.abs(prevPct)}%` : '—'}</div><div className="sl">先月比</div></div>
            </div>
            <div className="card cp gap"><div className="stitle">日別売上</div><div className="cw" style={{ height: 250 }}><canvas ref={dailyChartRef} /></div></div>
            <div className="card cp gap"><div className="stitle">3ヶ月比較</div><div className="cw" style={{ height: 170 }}><canvas ref={compareChartRef} /></div></div>
            <div className="card gap">
              <div style={{ padding: '16px 16px 0' }}><div className="stitle">種別内訳</div></div>
              <table className="tbl">
                <thead><tr><th>種別</th><th>件数</th><th className="r">売上金額</th></tr></thead>
                <tbody>
                  {monthCur && (<>
                    <tr><td><span className="badge bs">新規</span></td><td>{monthCur.shinkiCount}件</td><td className="num">{fmt(monthCur.shinkiSales)}</td></tr>
                    <tr><td><span className="badge bj">常連</span></td><td>{monthCur.jorenCount}件</td><td className="num">{fmt(monthCur.jorenSales)}</td></tr>
                    {monthCur.otherCount > 0 && <tr><td><span className="badge bo">その他</span></td><td>{monthCur.otherCount}件</td><td className="num">{fmt(monthCur.otherSales)}</td></tr>}
                    <tr className="tr-t"><td>合計</td><td>{monthCur.totalCount}件</td><td className="num">{fmt(monthCur.totalSales)}</td></tr>
                  </>)}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* 日別 */}
        {view === 'day' && (
          <>
            <div className="mnav">
              <button className="mnav-btn" onClick={() => changeDayMonth(-1)}>◀ 前月</button>
              <span className="mnav-label" onClick={() => openPicker('day')}>{dayYear}年{dayMonth}月</span>
              <button className="mnav-btn" onClick={() => changeDayMonth(1)}>翌月 ▶</button>
            </div>
            <div className="card cp gap"><div className="stitle">日別売上</div><div className="cw" style={{ height: 250 }}><canvas ref={dayChartRef} /></div></div>
            <div className="card gap">
              <div style={{ padding: '16px 16px 0' }}><div className="stitle">日別実績</div></div>
              {dayActive.length === 0 ? (
                <div style={{ padding: 18, textAlign: 'center', color: 'var(--sub2)' }}>この月の記録はありません</div>
              ) : (
                <table className="tbl">
                  <thead><tr><th>日付</th><th className="r">件数</th><th className="r">新規</th><th className="r">常連</th><th className="r">合計</th></tr></thead>
                  <tbody>
                    {dayActive.map(d => (
                      <tr key={d.day}><td style={{ fontWeight: 700 }}>{dayMonth}/{d.day}</td><td className="r" style={{ color: 'var(--sub)' }}>{d.count}件</td><td className="r">{d.shinki > 0 ? fmt(d.shinki) : '—'}</td><td className="r">{d.joren > 0 ? fmt(d.joren) : '—'}</td><td className="num">{fmt(d.total)}</td></tr>
                    ))}
                    <tr className="tr-t"><td>合計</td><td className="r">{dayActive.reduce((a, d) => a + d.count, 0)}件</td><td></td><td></td><td className="num">{fmt(dayActive.reduce((a, d) => a + d.total, 0))}</td></tr>
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>

        {/* 顧客分析 */}
        {view === 'customer' && (
          <>
            {customerLoading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--sub2)' }}>読み込み中...</div>}
            {!customerLoading && customerData && (
              <>
                {/* KPI */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '10px 16px' }}>
                  {[
                    { label: 'リピート率', value: `${customerData.repeat_rate}%`, sub: `${customerData.repeat_customers}人が2回以上来院` },
                    { label: '平均LTV', value: fmt(customerData.avg_ltv), sub: '顧客1人あたりの累計売上' },
                    { label: '平均来院回数', value: `${customerData.avg_visits}回`, sub: '顧客1人あたり' },
                    { label: '離脱率', value: `${customerData.churn_rate}%`, sub: '60日以上来院なし', neg: true },
                  ].map(k => (
                    <div key={k.label} className="kc">
                      <div className="lbl">{k.label}</div>
                      <div className="val" style={k.neg ? { color: 'var(--neg)' } : {}}>{k.value}</div>
                      <div className="sub">{k.sub}</div>
                    </div>
                  ))}
                </div>

                {/* 累計売上ランキング */}
                <div className="card gap">
                  <div style={{ padding: '16px 16px 0' }}><div className="stitle">累計売上ランキング</div></div>
                  {customerData.top_customers.length === 0 ? (
                    <div style={{ padding: 18, textAlign: 'center', color: 'var(--sub2)' }}>来院記録がありません</div>
                  ) : (
                    <table className="tbl">
                      <thead><tr><th>顧客名</th><th className="r">来院回数</th><th className="r">累計売上</th></tr></thead>
                      <tbody>
                        {customerData.top_customers.map((c, i) => (
                          <tr key={c.id} onClick={() => router.push('/app/customers/' + c.id)} style={{ cursor: 'pointer' }}>
                            <td style={{ fontWeight: 700 }}>
                              <span style={{ color: 'var(--sub2)', fontSize: 11, marginRight: 6 }}>#{i + 1}</span>{c.name}
                            </td>
                            <td className="r" style={{ color: 'var(--sub)' }}>{c.visit_count}回</td>
                            <td className="num">{fmt(Number(c.total_amount))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* 要フォロー顧客 */}
                <div className="card gap">
                  <div style={{ padding: '16px 16px 8px' }}>
                    <div className="stitle">要フォロー顧客（60日以上来院なし）</div>
                  </div>
                  {customerData.dormant.length === 0 ? (
                    <div style={{ padding: 18, textAlign: 'center', color: 'var(--sub2)' }}>休眠顧客はいません 🎉</div>
                  ) : (
                    <div style={{ padding: '0 16px 8px' }}>
                      {customerData.dormant.map((d, idx) => (
                        <div key={d.id} onClick={() => router.push('/app/customers/' + d.id)}
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: idx < customerData.dormant.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--primary)' }}>{d.name}</div>
                            {d.phone && <div style={{ fontSize: 12, color: 'var(--sub2)' }}>{d.phone}</div>}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--neg)' }}>
                              {d.last_visit ? `${d.days_since}日前` : '来院記録なし'}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--sub2)' }}>{d.visit_count}回来院</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 月別新規顧客 */}
                <div className="card gap">
                  <div style={{ padding: '16px 16px 12px' }}><div className="stitle">月別新規顧客数</div></div>
                  <div style={{ padding: '0 16px 16px' }}>
                    {customerData.monthly_new.length === 0 ? (
                      <div style={{ textAlign: 'center', color: 'var(--sub2)', padding: 12 }}>データがありません</div>
                    ) : (() => {
                      const maxCount = Math.max(...customerData.monthly_new.map(x => Number(x.count)), 1)
                      return customerData.monthly_new.map(m => (
                        <div key={m.month} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                          <div style={{ width: 36, fontSize: 12, color: 'var(--sub)', flexShrink: 0, textAlign: 'right' }}>{m.month.slice(5)}月</div>
                          <div style={{ flex: 1, background: 'var(--border)', borderRadius: 4, height: 18 }}>
                            <div style={{ width: `${(Number(m.count) / maxCount) * 100}%`, background: '#C4622D', borderRadius: 4, height: '100%', minWidth: 4 }} />
                          </div>
                          <div style={{ width: 28, fontSize: 13, fontWeight: 700, color: 'var(--primary)', textAlign: 'right', flexShrink: 0 }}>{m.count}</div>
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              </>
            )}
          </>
        )}

      {pickerOpen && (
        <div className="modal" onClick={() => setPickerOpen(false)}>
          <div className="mbox" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <button className="mnav-btn" onClick={() => setPickerYear(y => y - 1)}>◀</button>
              <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--primary)' }}>{pickerYear}年</div>
              <button className="mnav-btn" onClick={() => setPickerYear(y => y + 1)}>▶</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                const cur = pickerTarget === 'month' ? statsMonth : dayMonth
                const curY = pickerTarget === 'month' ? statsYear : dayYear
                const isActive = m === cur && pickerYear === curY
                return (
                  <button key={m} onClick={() => selectPickerMonth(m)}
                    style={{ padding: '12px 0', borderRadius: 10, fontSize: 14, fontWeight: 700, border: `1.5px solid ${isActive ? 'var(--primary)' : 'var(--border)'}`, background: isActive ? 'var(--primary)' : '#fff', color: isActive ? '#fff' : 'var(--text)' }}>
                    {m}月
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
