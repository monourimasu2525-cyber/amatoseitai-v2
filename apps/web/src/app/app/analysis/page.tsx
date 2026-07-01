'use client'

import { useState, useEffect } from 'react'
import { GET } from '@/lib/api'

const fmt = (n: number) => '¥' + Number(n).toLocaleString()

interface AdvancedAnalytics {
  year: number; month: number
  visit_count: number; active_days: number; daily_capacity: number; utilization_rate: number
  prev_month_visitors: number; retained_visitors: number; retention_rate: number | null
  repeat_total: number
  repeat_rates: { v2: number; v3: number; v4: number; v5: number } | null
  source_breakdown: { channel_id: number; channel_name: string; count: number }[]
  cpa_list: { channel_id: number; channel_name: string; spend: number; new_customers: number; cpa: number | null }[]
  annual_ltv: number | null
  monthly_visits: { month: string; count: number }[]
}

const C = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: 'var(--card)', borderRadius: 10, boxShadow: 'var(--shadow)', ...style }}>{children}</div>
)

export default function AnalysisPage() {
  const now = new Date()
  const [advYear, setAdvYear] = useState(now.getFullYear())
  const [advMonth, setAdvMonth] = useState(now.getMonth() + 1)
  const [adv, setAdv] = useState<AdvancedAnalytics | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    GET<AdvancedAnalytics & { success: boolean }>('/api/analytics/advanced', { year: advYear, month: advMonth }).then(d => {
      if (d.success) setAdv(d)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [advYear, advMonth])

  function changeMonth(d: number) {
    let m = advMonth + d, y = advYear
    if (m > 12) { m = 1; y++ }
    if (m < 1) { m = 12; y-- }
    setAdvYear(y); setAdvMonth(m)
  }

  const isCurrent = advYear === now.getFullYear() && advMonth === now.getMonth() + 1

  return (
    <div className="page">
      <div className="ph"><h1>分析</h1></div>
      <div className="wrap">

        <div className="mnav">
          <button className="mnav-btn" onClick={() => changeMonth(-1)}>◀ 前月</button>
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span className="mnav-label">{advYear}年{advMonth}月</span>
            {isCurrent && <span style={{ fontSize: 10, color: 'var(--sub2)', fontWeight: 600, marginTop: 1 }}>月途中</span>}
          </span>
          <button className="mnav-btn" onClick={() => changeMonth(1)}>翌月 ▶</button>
        </div>

        {loading && <span className="spin" />}

        {!loading && adv && (
          <>
            {/* 来院数 / 稼働率 / 継続率 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 6 }}>
              <C style={{ padding: '10px 6px', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--sub)', marginBottom: 4 }}>来院数</div>
                <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1, color: 'var(--primary)' }}>
                  {adv.visit_count}<span style={{ fontSize: 12, fontWeight: 600 }}>件</span>
                </div>
                <div style={{ fontSize: 9, color: 'var(--sub2)', marginTop: 3 }}>{adv.active_days}日稼働</div>
              </C>
              <C style={{ padding: '10px 6px', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--sub)', marginBottom: 4 }}>稼働率</div>
                <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1, color: isCurrent ? 'var(--primary)' : adv.utilization_rate >= 80 ? 'var(--pos)' : adv.utilization_rate >= 50 ? 'var(--primary)' : 'var(--neg)' }}>
                  {adv.utilization_rate}%
                </div>
                <div style={{ fontSize: 9, color: 'var(--sub2)', marginTop: 3 }}>{isCurrent ? '月途中' : '枠使用率'}</div>
              </C>
              <C style={{ padding: '10px 6px', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--sub)', marginBottom: 4 }}>継続率</div>
                <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1, color: adv.retention_rate !== null ? (isCurrent ? 'var(--primary)' : adv.retention_rate >= 70 ? 'var(--pos)' : adv.retention_rate >= 40 ? 'var(--primary)' : 'var(--neg)') : 'var(--sub)' }}>
                  {adv.retention_rate !== null ? `${adv.retention_rate}%` : '—'}
                </div>
                <div style={{ fontSize: 9, color: 'var(--sub2)', marginTop: 3 }}>{isCurrent ? '月途中' : '前月→今月'}</div>
              </C>
            </div>

            {/* LTV / 2回目来院率 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
              <C style={{ padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: 'var(--sub)', marginBottom: 3 }}>年間LTV</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--primary)', letterSpacing: '-.5px', lineHeight: 1.1 }}>
                  {adv.annual_ltv ? fmt(adv.annual_ltv) : '—'}
                </div>
                <div style={{ fontSize: 9, color: 'var(--sub2)', marginTop: 3 }}>患者1人の年間平均売上</div>
              </C>
              <C style={{ padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: 'var(--sub)', marginBottom: 3 }}>2回目来院率</div>
                <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1.1, color: adv.repeat_rates ? (adv.repeat_rates.v2 >= 70 ? 'var(--pos)' : adv.repeat_rates.v2 >= 40 ? 'var(--primary)' : 'var(--neg)') : 'var(--sub)' }}>
                  {adv.repeat_rates ? `${adv.repeat_rates.v2}%` : '—'}
                </div>
                <div style={{ fontSize: 9, color: 'var(--sub2)', marginTop: 3 }}>初回来院者が再来した割合</div>
              </C>
            </div>

            {/* リピート率 4列コンパクト */}
            <C style={{ padding: '10px 12px', marginBottom: 6 }}>
              <div style={{ fontSize: 10, color: 'var(--sub)', marginBottom: 8 }}>リピート率（全期間・累計{adv.repeat_total}人）</div>
              {adv.repeat_rates ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4 }}>
                  {([['2回目', adv.repeat_rates.v2], ['3回目', adv.repeat_rates.v3], ['4回目', adv.repeat_rates.v4], ['5回目', adv.repeat_rates.v5]] as [string, number][]).map(([label, pct]) => (
                    <div key={label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 9, color: 'var(--sub2)', marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: 20, fontWeight: 900, lineHeight: 1, color: pct >= 70 ? 'var(--pos)' : pct >= 40 ? 'var(--primary)' : 'var(--neg)' }}>{pct}%</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--sub2)', fontSize: 12 }}>来院データがありません</div>
              )}
            </C>

            {/* 年間推移 縦棒グラフ */}
            {adv.monthly_visits.length > 0 && (() => {
              const maxCount = Math.max(...adv.monthly_visits.map(x => x.count), 1)
              return (
                <C style={{ padding: '10px 12px', marginBottom: 6 }}>
                  <div style={{ fontSize: 10, color: 'var(--sub)', marginBottom: 8 }}>年間推移（過去12ヶ月）</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 72 }}>
                    {adv.monthly_visits.map(m => {
                      const isCurrentM = m.month === `${advYear}-${String(advMonth).padStart(2, '0')}`
                      const h = Math.max(Math.round((m.count / maxCount) * 60), m.count > 0 ? 4 : 0)
                      return (
                        <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                          <div style={{ fontSize: 8, fontWeight: 700, color: isCurrentM ? '#C4622D' : 'var(--sub2)', lineHeight: 1, marginBottom: 2 }}>{m.count}</div>
                          <div style={{ width: '100%', height: h, background: isCurrentM ? '#C4622D' : '#DDB89A', borderRadius: '2px 2px 0 0' }} />
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
                    {adv.monthly_visits.map(m => (
                      <div key={m.month} style={{ flex: 1, textAlign: 'center', fontSize: 8, color: 'var(--sub2)' }}>{m.month.slice(5)}</div>
                    ))}
                  </div>
                </C>
              )
            })()}

            {/* 媒体別・CPA */}
            {(adv.source_breakdown.length > 0 || adv.cpa_list.length > 0) ? (
              <C style={{ padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: 'var(--sub)', marginBottom: 8 }}>集客の効率（{advMonth}月）</div>
                {adv.source_breakdown.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: adv.cpa_list.length > 0 ? 10 : 0 }}>
                    {adv.source_breakdown.map(s => (
                      <div key={s.channel_id} style={{ background: 'var(--bg)', borderRadius: 6, padding: '4px 8px' }}>
                        <span style={{ fontSize: 11, color: 'var(--sub)' }}>{s.channel_name}</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary)', marginLeft: 6 }}>{s.count}人</span>
                      </div>
                    ))}
                  </div>
                )}
                {adv.cpa_list.length > 0 && (
                  <>
                    <div style={{ fontSize: 10, color: 'var(--sub2)', marginBottom: 6 }}>CPA（広告費 ÷ 新規数）</div>
                    {adv.cpa_list.map(c => (
                      <div key={c.channel_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: 'var(--sub)', fontWeight: 600 }}>{c.channel_name}</span>
                        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary)' }}>{c.cpa ? fmt(c.cpa) : '—'}</span>
                      </div>
                    ))}
                    <div style={{ fontSize: 10, color: 'var(--sub2)', marginTop: 6 }}>設定 → 広告媒体から広告費を入力できます</div>
                  </>
                )}
              </C>
            ) : (
              <C style={{ padding: '12px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--sub2)' }}>設定ページで広告媒体を登録すると<br />媒体別分析・CPAが使えます</div>
              </C>
            )}
          </>
        )}
      </div>
    </div>
  )
}
