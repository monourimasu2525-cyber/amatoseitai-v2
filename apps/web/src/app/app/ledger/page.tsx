'use client'

import { useState, useEffect, useCallback } from 'react'
import { GET, PUT, DEL } from '@/lib/api'
import type { MasterItem, MonthStats, Sale } from '@/types'

const fmt = (n: number) => '¥' + Number(n).toLocaleString()
const DOW = ['日', '月', '火', '水', '木', '金', '土']

interface DayBreakdown { day: number; total: number; shinki: number; joren: number; count: number }

export default function LedgerPage() {
  const now = new Date()
  const [view, setView] = useState<'year' | 'month' | 'day'>('month')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [dayDate, setDayDate] = useState(now)
  const [selYear, setSelYear] = useState(now.getFullYear())

  // データ
  const [yearData, setYearData] = useState<MonthStats[]>([])
  const [monthDays, setMonthDays] = useState<DayBreakdown[]>([])
  const [monthStats, setMonthStats] = useState<MonthStats | null>(null)
  const [dayRecords, setDayRecords] = useState<Sale[]>([])
  const [dayStats, setDayStats] = useState<MonthStats | null>(null)
  const [master, setMaster] = useState<MasterItem[]>([])
  const [loading, setLoading] = useState(false)

  // 月ピッカー
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(now.getFullYear())

  // 編集
  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState(0)
  const [editType, setEditType] = useState('')
  const [editAmount, setEditAmount] = useState(0)
  const [toastMsg, setToastMsg] = useState('')
  const [toastErr, setToastErr] = useState(false)

  function toast(msg: string, err = false) {
    setToastMsg(msg); setToastErr(err)
    setTimeout(() => setToastMsg(''), 3000)
  }

  const loadYear = useCallback(async () => {
    setLoading(true)
    const results = await Promise.all(
      Array.from({ length: 12 }, (_, i) => GET<MonthStats>('/api/getMonthStats', { year: selYear, month: i + 1 }))
    )
    setYearData(results)
    setLoading(false)
  }, [selYear])

  const loadMonth = useCallback(async () => {
    setLoading(true)
    const [bd, st] = await Promise.all([
      GET<{ days: DayBreakdown[] }>('/api/getDailyBreakdown', { year, month }),
      GET<MonthStats>('/api/getMonthStats', { year, month }),
    ])
    setMonthDays(bd.days)
    setMonthStats(st)
    setLoading(false)
  }, [year, month])

  const loadDay = useCallback(async () => {
    setLoading(true)
    const y = dayDate.getFullYear(), m = dayDate.getMonth() + 1, d = dayDate.getDate()
    const data = await GET<{ records: Sale[]; summary: MonthStats }>('/api/getDayRecords', { year: y, month: m, day: d })
    setDayRecords(data.records)
    setDayStats(data.summary)
    setLoading(false)
  }, [dayDate])

  useEffect(() => {
    GET<{ items: MasterItem[] }>('/api/getMaster').then(d => setMaster(d.items || []))
  }, [])

  useEffect(() => { if (view === 'year') loadYear() }, [view, loadYear])
  useEffect(() => { if (view === 'month') loadMonth() }, [view, loadMonth])
  useEffect(() => { if (view === 'day') loadDay() }, [view, loadDay])

  function changeMonth(delta: number) {
    let m = month + delta, y = year
    if (m > 12) { m = 1; y++ }
    if (m < 1) { m = 12; y-- }
    setYear(y); setMonth(m)
  }

  function changeDay(delta: number) {
    setDayDate(new Date(dayDate.getTime() + delta * 86400000))
  }

  function jumpToDay(y: number, m: number, d: number) {
    setDayDate(new Date(y, m - 1, d))
    setView('day')
  }

  function openMonthPicker() {
    setPickerYear(year)
    setPickerOpen(true)
  }

  function selectPickerMonth(m: number) {
    setYear(pickerYear); setMonth(m)
    setPickerOpen(false)
  }

  async function saveEdit() {
    if (!editType || !editAmount) { toast('全項目を入力してください', true); return }
    const r = await PUT<{ success: boolean; message: string }>('/api/editSale/' + editId, { type: editType, amount: editAmount })
    if (r.success) { toast('修正しました'); setEditOpen(false); loadDay() } else toast(r.message, true)
  }

  async function deleteSale(id: number) {
    if (!confirm('この売上を削除しますか？')) return
    const r = await DEL<{ success: boolean; message: string }>('/api/deleteSale/' + id)
    if (r.success) { toast('削除しました'); loadDay() } else toast(r.message, true)
  }

  const todayY = now.getFullYear(), todayM = now.getMonth() + 1, todayD = now.getDate()

  // 年別テーブル
  const yearTotal = yearData.reduce((a, r) => a + r.totalSales, 0)
  const yearCount = yearData.reduce((a, r) => a + r.totalCount, 0)

  return (
    <div className="page">
      <div className="ph"><h1>台帳</h1></div>
      <div className="wrap">
        <div className="vtabs">
          {(['year', 'month', 'day'] as const).map((v, i) => (
            <button key={v} className={`vtab ${view === v ? 'active' : ''}`} onClick={() => setView(v)}>
              {['年別', '月別', '日別'][i]}
            </button>
          ))}
        </div>

        {/* 年別 */}
        {view === 'year' && (
          <>
            <div className="yg">
              {Array.from({ length: 4 }, (_, i) => now.getFullYear() - i).map(y => (
                <button key={y} className={`yb ${y === selYear ? 'active' : ''}`}
                  onClick={() => { setSelYear(y) }}>
                  {y}年
                </button>
              ))}
            </div>
            <div className="card cp gap">
              <div className="stitle">年間サマリー</div>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                <div><div className="stitle" style={{ marginBottom: 4 }}>売上合計</div><div style={{ fontSize: 22, fontWeight: 900, color: 'var(--primary)' }}>{fmt(yearTotal)}</div></div>
                <div><div className="stitle" style={{ marginBottom: 4 }}>件数</div><div style={{ fontSize: 22, fontWeight: 900 }}>{yearCount}件</div></div>
                <div><div className="stitle" style={{ marginBottom: 4 }}>客単価</div><div style={{ fontSize: 22, fontWeight: 900 }}>{fmt(yearCount > 0 ? Math.round(yearTotal / yearCount) : 0)}</div></div>
              </div>
            </div>
            <div className="card">
              {loading ? <span className="spin" /> : (
                <div className="ledger-wrap">
                  <table className="ltbl">
                    <thead><tr><th>月</th><th style={{ textAlign: 'right' }}>件数</th><th style={{ textAlign: 'right' }}>新規</th><th style={{ textAlign: 'right' }}>常連</th><th style={{ textAlign: 'right' }}>合計</th></tr></thead>
                    <tbody>
                      {yearData.map((r, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'row-even' : 'row-odd'}>
                          <td style={{ fontWeight: 700 }}>{i + 1}月</td>
                          <td className="num" style={{ color: 'var(--sub)' }}>{r.totalCount > 0 ? r.totalCount + '件' : '—'}</td>
                          <td className="num">{r.shinkiSales > 0 ? fmt(r.shinkiSales) : '—'}</td>
                          <td className="num">{r.jorenSales > 0 ? fmt(r.jorenSales) : '—'}</td>
                          <td className="num">{r.totalSales > 0 ? fmt(r.totalSales) : '—'}</td>
                        </tr>
                      ))}
                      <tr className="row-total">
                        <td colSpan={2}>合計 {yearCount}件</td>
                        <td className="num">{fmt(yearData.reduce((a, r) => a + r.shinkiSales, 0))}</td>
                        <td className="num">{fmt(yearData.reduce((a, r) => a + r.jorenSales, 0))}</td>
                        <td className="num">{fmt(yearTotal)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* 月別 */}
        {view === 'month' && (
          <>
            <div className="mnav">
              <button className="mnav-btn" onClick={() => changeMonth(-1)}>◀ 前月</button>
              <span className="mnav-label" onClick={openMonthPicker}>{year}年{month}月</span>
              <button className="mnav-btn" onClick={() => changeMonth(1)}>翌月 ▶</button>
            </div>
            <div className="card cp gap">
              <div className="stitle">月間合計</div>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                <div><div className="stitle" style={{ marginBottom: 4 }}>売上合計</div><div style={{ fontSize: 22, fontWeight: 900, color: 'var(--primary)' }}>{monthStats ? fmt(monthStats.totalSales) : '—'}</div></div>
                <div><div className="stitle" style={{ marginBottom: 4 }}>件数</div><div style={{ fontSize: 22, fontWeight: 900 }}>{monthStats?.totalCount ?? '—'}件</div></div>
                <div><div className="stitle" style={{ marginBottom: 4 }}>客単価</div><div style={{ fontSize: 22, fontWeight: 900 }}>{monthStats && monthStats.totalCount > 0 ? fmt(Math.round(monthStats.totalSales / monthStats.totalCount)) : '—'}</div></div>
              </div>
            </div>
            <div className="card">
              {loading ? <span className="spin" /> : monthDays.map(d => {
                const date = new Date(year, month - 1, d.day)
                const dow = DOW[date.getDay()]
                const isToday = year === todayY && month === todayM && d.day === todayD
                const isSun = date.getDay() === 0, isSat = date.getDay() === 6
                const dowColor = isSun ? '#e53e3e' : isSat ? '#3182ce' : 'var(--sub2)'
                return (
                  <div key={d.day}
                    onClick={() => d.total > 0 ? jumpToDay(year, month, d.day) : undefined}
                    style={{ display: 'flex', alignItems: 'center', padding: '11px 16px', borderBottom: '1px solid var(--border)', cursor: d.total > 0 ? 'pointer' : 'default', background: isToday ? 'var(--primary-l)' : undefined }}>
                    <div style={{ width: 46, flexShrink: 0 }}>
                      <span style={{ fontSize: 15, fontWeight: d.total > 0 ? 900 : 600, color: isToday ? 'var(--primary)' : d.total > 0 ? 'var(--text)' : 'var(--sub2)' }}>{d.day}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, marginLeft: 3, color: dowColor }}>{dow}</span>
                    </div>
                    {d.total > 0 ? (
                      <>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--accent)' }}>{fmt(d.total)}</div>
                          <div style={{ fontSize: 11, color: 'var(--sub2)', marginTop: 1 }}>
                            {d.count}件{d.shinki > 0 ? ' · 新規' + fmt(d.shinki) : ''}{d.joren > 0 ? ' · 常連' + fmt(d.joren) : ''}
                          </div>
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--sub2)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                      </>
                    ) : (
                      <div style={{ flex: 1, color: 'var(--sub2)', fontSize: 13 }}>—</div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* 日別 */}
        {view === 'day' && (
          <>
            <div className="mnav">
              <button className="mnav-btn" onClick={() => changeDay(-1)}>◀ 前日</button>
              <span className="mnav-label" style={{ fontSize: 15 }}>
                {dayDate.getFullYear()}年{dayDate.getMonth() + 1}月{dayDate.getDate()}日（{DOW[dayDate.getDay()]}）
              </span>
              <button className="mnav-btn" onClick={() => changeDay(1)}>翌日 ▶</button>
            </div>
            <div className="card cp gap">
              <div className="stitle">本日合計</div>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                <div><div className="stitle" style={{ marginBottom: 4 }}>売上合計</div><div style={{ fontSize: 22, fontWeight: 900, color: 'var(--primary)' }}>{dayStats ? fmt(dayStats.totalSales) : '—'}</div></div>
                <div><div className="stitle" style={{ marginBottom: 4 }}>件数</div><div style={{ fontSize: 22, fontWeight: 900 }}>{dayStats?.totalCount ?? '—'}件</div></div>
                <div><div className="stitle" style={{ marginBottom: 4 }}>新規</div><div style={{ fontSize: 22, fontWeight: 900 }}>{dayStats ? fmt(dayStats.shinkiSales) + '（' + dayStats.shinkiCount + '件）' : '—'}</div></div>
                <div><div className="stitle" style={{ marginBottom: 4 }}>常連</div><div style={{ fontSize: 22, fontWeight: 900 }}>{dayStats ? fmt(dayStats.jorenSales) + '（' + dayStats.jorenCount + '件）' : '—'}</div></div>
              </div>
            </div>
            <div className="card">
              {loading ? <span className="spin" /> : dayRecords.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--sub2)' }}>この日の記録はありません</div>
              ) : (
                <div className="ledger-wrap">
                  <table className="ltbl">
                    <thead><tr><th>時刻</th><th>種別</th><th style={{ textAlign: 'right' }}>金額</th><th style={{ textAlign: 'right' }}></th></tr></thead>
                    <tbody>
                      {dayRecords.map((r, i) => (
                        <tr key={r.id} className={i % 2 === 0 ? 'row-even' : 'row-odd'}>
                          <td style={{ color: 'var(--sub2)', fontSize: 13 }}>{r.time}</td>
                          <td><span className={`badge ${r.type === '新規' ? 'bs' : r.type === '常連' ? 'bj' : 'bo'}`}>{r.type}</span></td>
                          <td className="num">{fmt(r.amount)}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button className="ib" style={{ marginRight: 4 }} onClick={() => { setEditId(r.id); setEditType(r.type); setEditAmount(r.amount); setEditOpen(true) }}>編集</button>
                            <button className="db" onClick={() => deleteSale(r.id)}>✕</button>
                          </td>
                        </tr>
                      ))}
                      {dayStats && (
                        <tr className="row-total">
                          <td colSpan={2}>合計</td>
                          <td className="num">{fmt(dayStats.totalSales)}</td>
                          <td></td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 月ピッカー */}
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
                const isActive = m === month && pickerYear === year
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

      {/* 編集モーダル */}
      {editOpen && (
        <div className="modal" onClick={() => setEditOpen(false)}>
          <div className="mbox" onClick={e => e.stopPropagation()}>
            <div className="mtitle">売上を編集</div>
            <div className="fg"><label className="fl">種別</label>
              <select className="fc" value={editType} onChange={e => setEditType(e.target.value)}>
                {master.map(m => <option key={m.id} value={m.type}>{m.type} ({fmt(m.amount)})</option>)}
              </select>
            </div>
            <div className="fg"><label className="fl">金額</label>
              <input type="number" className="fc" value={editAmount} onChange={e => setEditAmount(Number(e.target.value))} inputMode="numeric" />
            </div>
            <div className="mfoot">
              <button className="btn btn-s" style={{ flex: 1 }} onClick={() => setEditOpen(false)}>キャンセル</button>
              <button className="btn btn-p" style={{ flex: 2 }} onClick={saveEdit}>保存する</button>
            </div>
          </div>
        </div>
      )}

      {toastMsg && <div className="toast" style={{ background: toastErr ? '#b91c1c' : '#3D2314' }}>{toastMsg}</div>}
    </div>
  )
}
