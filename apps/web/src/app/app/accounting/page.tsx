'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { GET, getCsvUrl } from '@/lib/api'
import type { MonthStats, MasterItem } from '@/types'

const fmt = (n: number) => '¥' + Number(n).toLocaleString()

interface DayBreakdown {
  day: number; total: number; shinki: number; joren: number; other: number; count: number
}

export default function AccountingPage() {
  const router = useRouter()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [stats, setStats] = useState<MonthStats | null>(null)
  const [days, setDays] = useState<DayBreakdown[]>([])
  const [master, setMaster] = useState<MasterItem[]>([])
  const [loading, setLoading] = useState(false)

  const years = Array.from({ length: 4 }, (_, i) => now.getFullYear() - i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  async function load() {
    setLoading(true)
    const [s, d, m] = await Promise.all([
      GET<MonthStats>('/api/getMonthStats', { year, month }),
      GET<{ days: DayBreakdown[] }>('/api/getDailyBreakdown', { year, month }),
      GET<{ items: MasterItem[] }>('/api/getMaster'),
    ])
    setStats(s); setDays(d.days); setMaster(m.items || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [year, month])

  const activeDays = days.filter(d => d.total > 0)
  const unit = stats && stats.totalCount > 0 ? Math.round(stats.totalSales / stats.totalCount) : 0

  function doPrint() { window.print() }

  return (
    <div className="page">
      <div className="ph no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', fontSize: 22, padding: '0 4px 0 0', color: 'var(--primary)' }}>←</button>
          <h1>経理レポート</h1>
        </div>
      </div>

      <div className="wrap">
        {/* 月選択 */}
        <div className="card cp gap no-print">
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}><label className="fl">年</label>
              <select className="fc" value={year} onChange={e => setYear(Number(e.target.value))}>
                {years.map(y => <option key={y} value={y}>{y}年</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}><label className="fl">月</label>
              <select className="fc" value={month} onChange={e => setMonth(Number(e.target.value))}>
                {months.map(m => <option key={m} value={m}>{m}月</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button className="btn btn-s btn-sm" onClick={() => window.open(getCsvUrl({ year, month }))}>CSVダウンロード</button>
            <button className="btn btn-p btn-sm" onClick={doPrint}>印刷 / PDF</button>
          </div>
        </div>

        {loading ? <span className="spin" /> : stats && (
          <>
            {/* レポートヘッダー */}
            <div className="card cp gap" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--sub)', fontWeight: 600, marginBottom: 4 }}>あまと整体院</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--primary)', marginBottom: 2 }}>{year}年{month}月 月次売上レポート</div>
              <div style={{ fontSize: 12, color: 'var(--sub2)' }}>出力日：{now.getFullYear()}年{now.getMonth() + 1}月{now.getDate()}日</div>
            </div>

            {/* KPIサマリー */}
            <div className="card cp gap">
              <div className="stitle">月間サマリー</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 4 }}>
                <div className="kc">
                  <div className="lbl">売上合計</div>
                  <div className="val" style={{ fontSize: 26, color: 'var(--accent)' }}>{fmt(stats.totalSales)}</div>
                </div>
                <div className="kc">
                  <div className="lbl">総件数</div>
                  <div className="val" style={{ fontSize: 26 }}>{stats.totalCount}件</div>
                </div>
                <div className="kc">
                  <div className="lbl">客単価</div>
                  <div className="val" style={{ fontSize: 20 }}>{fmt(unit)}</div>
                </div>
                <div className="kc">
                  <div className="lbl">営業日数</div>
                  <div className="val" style={{ fontSize: 20 }}>{activeDays.length}日</div>
                </div>
              </div>
            </div>

            {/* 種別内訳 */}
            <div className="card gap">
              <div style={{ padding: '16px 16px 0' }}><div className="stitle">種別内訳</div></div>
              <table className="tbl">
                <thead><tr><th>種別</th><th>件数</th><th className="r">割合</th><th className="r">売上金額</th></tr></thead>
                <tbody>
                  {stats.shinkiCount > 0 && (
                    <tr>
                      <td><span className="badge bs">新規</span></td>
                      <td>{stats.shinkiCount}件</td>
                      <td className="r" style={{ color: 'var(--sub)' }}>{Math.round(stats.shinkiCount / stats.totalCount * 100)}%</td>
                      <td className="num">{fmt(stats.shinkiSales)}</td>
                    </tr>
                  )}
                  {stats.jorenCount > 0 && (
                    <tr>
                      <td><span className="badge bj">常連</span></td>
                      <td>{stats.jorenCount}件</td>
                      <td className="r" style={{ color: 'var(--sub)' }}>{Math.round(stats.jorenCount / stats.totalCount * 100)}%</td>
                      <td className="num">{fmt(stats.jorenSales)}</td>
                    </tr>
                  )}
                  {stats.otherCount > 0 && (
                    <tr>
                      <td><span className="badge bo">その他</span></td>
                      <td>{stats.otherCount}件</td>
                      <td className="r" style={{ color: 'var(--sub)' }}>{Math.round(stats.otherCount / stats.totalCount * 100)}%</td>
                      <td className="num">{fmt(stats.otherSales)}</td>
                    </tr>
                  )}
                  <tr className="tr-t">
                    <td>合計</td>
                    <td>{stats.totalCount}件</td>
                    <td className="r">100%</td>
                    <td className="num">{fmt(stats.totalSales)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 日別明細 */}
            <div className="card gap">
              <div style={{ padding: '16px 16px 0' }}><div className="stitle">日別売上明細</div></div>
              {activeDays.length === 0 ? (
                <div style={{ padding: 18, textAlign: 'center', color: 'var(--sub2)' }}>記録がありません</div>
              ) : (
                <table className="tbl">
                  <thead><tr><th>日付</th><th>件数</th><th className="r">新規</th><th className="r">常連</th><th className="r">合計</th></tr></thead>
                  <tbody>
                    {activeDays.map(d => (
                      <tr key={d.day}>
                        <td style={{ fontWeight: 700 }}>{year}/{month}/{d.day}</td>
                        <td>{d.count}件</td>
                        <td className="r">{d.shinki > 0 ? fmt(d.shinki) : '—'}</td>
                        <td className="r">{d.joren > 0 ? fmt(d.joren) : '—'}</td>
                        <td className="num">{fmt(d.total)}</td>
                      </tr>
                    ))}
                    <tr className="tr-t">
                      <td>合計 ({activeDays.length}日)</td>
                      <td>{stats.totalCount}件</td>
                      <td className="r">{fmt(stats.shinkiSales)}</td>
                      <td className="r">{fmt(stats.jorenSales)}</td>
                      <td className="num">{fmt(stats.totalSales)}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>

            {/* マスタ参照 */}
            {master.length > 0 && (
              <div className="card gap">
                <div style={{ padding: '16px 16px 0' }}><div className="stitle">料金マスタ（参考）</div></div>
                <table className="tbl">
                  <thead><tr><th>種別</th><th className="r">標準単価</th><th>備考</th></tr></thead>
                  <tbody>
                    {master.map(m => (
                      <tr key={m.id}>
                        <td style={{ fontWeight: 700 }}>{m.type}</td>
                        <td className="r">{fmt(m.amount)}</td>
                        <td style={{ color: 'var(--sub2)', fontSize: 13 }}>{m.description || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
