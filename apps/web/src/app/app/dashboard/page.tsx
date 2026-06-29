'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { GET, POST, PUT, DEL } from '@/lib/api'
import type { InitData, MasterItem, Sale, MonthStats } from '@/types'
import { Chart, registerables } from 'chart.js'
import styles from './dashboard.module.css'

Chart.register(...registerables)

const fmt = (n: number) => '¥' + Number(n).toLocaleString()
const fmtS = (n: number) => n >= 10000 ? (n / 10000).toFixed(1).replace('.0', '') + '万' : '¥' + Number(n).toLocaleString()

export default function DashboardPage() {
  const router = useRouter()
  const [master, setMaster] = useState<MasterItem[]>([])
  const [todayTotal, setTodayTotal] = useState(0)
  const [todayCount, setTodayCount] = useState(0)
  const [monthStats, setMonthStats] = useState<MonthStats | null>(null)
  const [prevMonthStats, setPrevMonthStats] = useState<MonthStats | null>(null)
  const [todayList, setTodayList] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)

  // クイック入力
  const [quickOpen, setQuickOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [pendingType, setPendingType] = useState('')
  const [pendingAmount, setPendingAmount] = useState(0)
  const [successShow, setSuccessShow] = useState(false)
  const [successInfo, setSuccessInfo] = useState({ type: '', amount: 0, method: '' })

  // 編集モーダル
  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState(0)
  const [editType, setEditType] = useState('')
  const [editAmount, setEditAmount] = useState(0)

  // トースト
  const [toastMsg, setToastMsg] = useState('')
  const [toastErr, setToastErr] = useState(false)

  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstance = useRef<Chart | null>(null)

  const toast = useCallback((msg: string, err = false) => {
    setToastMsg(msg); setToastErr(err)
    setTimeout(() => setToastMsg(''), 3000)
  }, [])

  const loadData = useCallback(async () => {
    try {
      const data = await GET<InitData>('/api/initData')
      setMaster(data.master || [])
      setTodayTotal(data.todayStats.totalSales)
      setTodayCount(data.todayStats.totalCount)
      setMonthStats(data.thisMonth)
      setPrevMonthStats(data.prevMonth)
      const now = new Date()
      const tk = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`
      setTodayList((data.history?.records || []).filter(r => r.date === tk))
    } catch {
      toast('データ取得エラー', true)
    }
    setLoading(false)
  }, [toast])

  // 院未設定なら clinic-setup へ
  useEffect(() => {
    GET<{ success: boolean; clinic: { id: number } | null }>('/api/clinics/me').then(d => {
      if (!d.clinic) router.replace('/app/clinic-setup')
    }).catch(() => {})
  }, [router])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (!chartRef.current) return
    const loadChart = async () => {
      const now = new Date()
      try {
        const data = await GET<{ days: { day: number; total: number; count: number }[] }>(
          '/api/getDailyBreakdown', { year: now.getFullYear(), month: now.getMonth() + 1 }
        )
        if (chartInstance.current) chartInstance.current.destroy()
        const ctx = chartRef.current!.getContext('2d')!
        chartInstance.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: data.days.map(d => `${d.day}`),
            datasets: [{
              data: data.days.map(d => d.total),
              backgroundColor: data.days.map(d => d.day === now.getDate() ? '#C4622D' : '#DDB89A'),
              borderRadius: 3, borderSkipped: false, barPercentage: .7, categoryPercentage: .85,
            }],
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { backgroundColor: '#3D2314', callbacks: { title: t => `${now.getMonth() + 1}/${t[0].label}`, label: c => c.raw ? '¥' + Number(c.raw).toLocaleString() : '' } } },
            scales: {
              x: { grid: { display: false }, ticks: { font: { size: 8 }, color: '#B8967A', maxTicksLimit: 16 } },
              y: { beginAtZero: true, grid: { color: 'rgba(61,35,20,0.05)' }, ticks: { font: { size: 8 }, color: '#B8967A', callback: v => v === 0 ? '' : fmtS(Number(v)) } },
            },
          },
        })
      } catch { /* グラフなし */ }
    }
    if (!loading) loadChart()
  }, [loading])

  async function confirmSale(method: string) {
    setPayOpen(false)
    try {
      const r = await POST<{ success: boolean; message: string }>('/api/addSale', { type: pendingType, amount: pendingAmount })
      if (r.success) {
        setSuccessInfo({ type: pendingType, amount: pendingAmount, method })
        setSuccessShow(true)
        setTimeout(() => setSuccessShow(false), 1500)
        loadData()
      } else toast(r.message, true)
    } catch { toast('登録に失敗しました', true) }
  }

  async function handleDelete(id: number) {
    if (!confirm('この売上を削除しますか？')) return
    const r = await DEL<{ success: boolean; message: string }>('/api/deleteSale/' + id)
    if (r.success) { toast('削除しました'); loadData() } else toast(r.message, true)
  }

  async function handleEdit() {
    if (!editType || !editAmount) { toast('全項目を入力してください', true); return }
    const r = await PUT<{ success: boolean; message: string }>('/api/editSale/' + editId, { type: editType, amount: editAmount })
    if (r.success) { toast('修正しました'); setEditOpen(false); loadData() } else toast(r.message, true)
  }

  const now = new Date()
  const monthLabel = `${now.getMonth() + 1}月`
  const prevPct = prevMonthStats && prevMonthStats.totalSales > 0
    ? Math.round(((monthStats?.totalSales ?? 0) - prevMonthStats.totalSales) / prevMonthStats.totalSales * 100)
    : null

  return (
    <div className="page">
      {/* ヘッダー */}
      <div className={styles.header}>
        <div className={styles.headerLbl}>今日の売上</div>
        <div className={styles.headerVal}>{loading ? '—' : fmt(todayTotal)}</div>
        <div className={styles.headerSub}>合計 {todayCount}件</div>
        <div className={styles.miniGrid}>
          <div className={styles.hmc}>
            <div className={styles.hmcLbl}>今月合計</div>
            <div className={styles.hmcVal}>{monthStats ? fmtS(monthStats.totalSales) : '—'}</div>
          </div>
          <div className={styles.hmc}>
            <div className={styles.hmcLbl}>新規</div>
            <div className={styles.hmcVal}>{monthStats ? fmtS(monthStats.shinkiSales) : '—'}</div>
            <div className={styles.hmcSub}>{monthStats?.shinkiCount}件</div>
          </div>
          <div className={styles.hmc}>
            <div className={styles.hmcLbl}>常連</div>
            <div className={styles.hmcVal}>{monthStats ? fmtS(monthStats.jorenSales) : '—'}</div>
            <div className={styles.hmcSub}>{monthStats?.jorenCount}件</div>
          </div>
        </div>
      </div>

      {/* クイック入力 */}
      <div className={styles.plansWrap}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8, padding: '0 14px' }}>
          <div className={styles.plansLbl} style={{ marginBottom: 0 }}>クイック入力</div>
          <div style={{ fontSize: 11, color: 'rgba(245,213,192,.5)' }}>顧客記録なし</div>
        </div>
        <div className={styles.plansScroll}>
          {loading ? <span className="spin" style={{ margin: '8px 14px' }} /> : master.length === 0 ? (
            <div style={{ padding: '4px 14px', color: 'var(--sub2)', fontSize: 13 }}>設定からマスタを追加してください</div>
          ) : master.map((item, i) => (
            <button key={item.id} className={`${styles.planCard} ${i > 0 ? styles.planCardSec : ''}`}
              onClick={() => { setPendingType(item.type); setPendingAmount(item.amount); setPayOpen(true) }}>
              <div className={styles.pcName}>{item.type}</div>
              <div className={styles.pcAmt}>{fmt(item.amount)}</div>
              <div className={styles.pcHint}>タップして入力</div>
            </button>
          ))}
        </div>
        <div style={{ padding: '6px 14px 0', fontSize: 11, color: 'rgba(245,213,192,.45)' }}>
          顧客と紐づけて記録するには 顧客タブ → 来院登録
        </div>
      </div>

      <div className={styles.content}>
        {/* 今月の売上 */}
        <div className={`${styles.mcard} gap`}>
          <div className={styles.mcardLbl}>今月の売上</div>
          <div className={styles.mcardRow}>
            <div className={styles.mcardVal}>{monthStats ? fmt(monthStats.totalSales) : '—'}</div>
            {prevPct !== null && (
              <span className={`tag ${prevPct >= 0 ? 't-up' : 't-dn'}`}>
                {prevPct >= 0 ? '▲' : '▼'}{Math.abs(prevPct)}% 先月比
              </span>
            )}
          </div>
          <div className={styles.mcardCnt}>{monthStats?.totalCount}件</div>
          <div className={styles.pb}>
            <div className={styles.pf} style={{ width: prevMonthStats && prevMonthStats.totalSales > 0 ? Math.min(Math.round((monthStats?.totalSales ?? 0) / prevMonthStats.totalSales * 100), 130) + '%' : '0%' }} />
          </div>
        </div>

        {/* 日別グラフ */}
        <div className={`card cp gap`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div className="stitle" style={{ margin: 0 }}>今月の日別売上</div>
            <span style={{ fontSize: 11, color: 'var(--sub2)', fontWeight: 600 }}>{monthLabel}</span>
          </div>
          <div className="cw" style={{ height: 150 }}><canvas ref={chartRef} /></div>
        </div>

        {/* 今日の記録 */}
        <div className="stitle">今日の記録</div>
        <div className="card">
          {loading ? <span className="spin" /> : todayList.length === 0 ? (
            <div style={{ padding: 18, textAlign: 'center', color: 'var(--sub2)', fontSize: 14 }}>まだ記録がありません</div>
          ) : todayList.map(r => (
            <div key={r.id} className="li">
              <span className={`badge ${r.type === '新規' ? 'bs' : r.type === '常連' ? 'bj' : 'bo'}`}>{r.type}</span>
              <span className="la" style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {(r as Sale & { customer_name?: string }).customer_name && (
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>{(r as Sale & { customer_name?: string }).customer_name}</span>
                )}
                <span style={{ fontSize: 13 }}>{fmt(r.amount)}</span>
              </span>
              <span className="lt">{r.time}</span>
              <button className="ib" style={{ marginRight: 4 }} onClick={() => { setEditId(r.id); setEditType(r.type); setEditAmount(r.amount); setEditOpen(true) }}>編集</button>
              <button className="db" onClick={() => handleDelete(r.id)}>✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* クイック入力シート */}
      {quickOpen && (
        <div className={styles.overlay} onClick={() => setQuickOpen(false)}>
          <div className={styles.sheet} onClick={e => e.stopPropagation()}>
            <div className={styles.handle} />
            <div className={styles.sheetTitle}>どのプランを入力？</div>
            <div className={styles.sheetPlans}>
              {master.map((item, i) => (
                <button key={item.id} className={`${styles.splan} ${i > 0 ? styles.splanSec : ''}`}
                  onClick={() => { setQuickOpen(false); setPendingType(item.type); setPendingAmount(item.amount); setTimeout(() => setPayOpen(true), 200) }}>
                  <span className={styles.splanName}>{item.type}</span>
                  <span className={styles.splanAmt}>{fmt(item.amount)}</span>
                </button>
              ))}
            </div>
            <button className={styles.sheetCancel} onClick={() => setQuickOpen(false)}>キャンセル</button>
          </div>
        </div>
      )}

      {/* 支払方法シート */}
      {payOpen && (
        <div className={styles.overlay} onClick={() => setPayOpen(false)}>
          <div className={styles.paySheet} onClick={e => e.stopPropagation()}>
            <div className={styles.handle} />
            <div className={styles.payPlanInfo}>
              <div className={styles.payPlanName}>{pendingType}</div>
              <div className={styles.payPlanAmt}>{fmt(pendingAmount)}</div>
            </div>
            <div className={styles.payMethods}>
              {[{ method: '現金', icon: '💴' }, { method: 'クレカ', icon: '💳' }, { method: 'PayPay', icon: '📱' }].map(p => (
                <button key={p.method} className={styles.payBtn} onClick={() => confirmSale(p.method)}>
                  <div className={styles.payIcon}>{p.icon}</div>
                  <div className={styles.payLbl}>{p.method}</div>
                </button>
              ))}
            </div>
            <button className={styles.sheetCancel} onClick={() => setPayOpen(false)}>キャンセル</button>
          </div>
        </div>
      )}

      {/* 完了オーバーレイ */}
      {successShow && (
        <div className={styles.successOverlay}>
          <div className={styles.successIcon}>✅</div>
          <div className={styles.successMethod}>{successInfo.type}　{successInfo.method}</div>
          <div className={styles.successAmt}>{fmt(successInfo.amount)}</div>
        </div>
      )}

      {/* 編集モーダル */}
      {editOpen && (
        <div className="modal open" onClick={() => setEditOpen(false)}>
          <div className="mbox" onClick={e => e.stopPropagation()}>
            <div className="mtitle">売上を編集</div>
            <div className="fg">
              <label className="fl">種別</label>
              <select className="fc" value={editType} onChange={e => setEditType(e.target.value)}>
                {master.map(m => <option key={m.id} value={m.type}>{m.type} ({fmt(m.amount)})</option>)}
              </select>
            </div>
            <div className="fg">
              <label className="fl">金額</label>
              <input type="number" className="fc" value={editAmount} onChange={e => setEditAmount(Number(e.target.value))} inputMode="numeric" />
            </div>
            <div className="mfoot">
              <button className="btn btn-s" style={{ flex: 1 }} onClick={() => setEditOpen(false)}>キャンセル</button>
              <button className="btn btn-p" style={{ flex: 2 }} onClick={handleEdit}>保存する</button>
            </div>
          </div>
        </div>
      )}

      {/* トースト */}
      {toastMsg && (
        <div className={styles.toast} style={{ background: toastErr ? '#b91c1c' : '#3D2314' }}>
          {toastMsg}
        </div>
      )}
    </div>
  )
}
