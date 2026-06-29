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

  return (
    <div className="page">
      <div className="ph"><h1>分析</h1></div>
      <div className="wrap">

        {/* 月別来院推移（過去12ヶ月）*/}
        {adv && adv.monthly_visits.length > 0 && (
          <div className="card gap">
            <div style={{ padding: '16px 16px 12px' }}><div className="stitle">月別来院数（過去12ヶ月）</div></div>
            <div style={{ padding: '0 16px 16px' }}>
              {(() => {
                const maxCount = Math.max(...adv.monthly_visits.map(x => x.count), 1)
                return adv.monthly_visits.map(m => (
                  <div key={m.month} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 36, fontSize: 12, color: 'var(--sub)', flexShrink: 0, textAlign: 'right' }}>{m.month.slice(5)}月</div>
                    <div style={{ flex: 1, background: 'var(--border)', borderRadius: 4, height: 20 }}>
                      <div style={{ width: `${(m.count / maxCount) * 100}%`, background: '#C4622D', borderRadius: 4, height: '100%', minWidth: 4 }} />
                    </div>
                    <div style={{ width: 32, fontSize: 13, fontWeight: 700, color: 'var(--primary)', textAlign: 'right', flexShrink: 0 }}>{m.count}</div>
                  </div>
                ))
              })()}
            </div>
          </div>
        )}

        {/* 月ナビ */}
        <div className="mnav">
          <button className="mnav-btn" onClick={() => changeMonth(-1)}>◀ 前月</button>
          <span className="mnav-label">{advYear}年{advMonth}月</span>
          <button className="mnav-btn" onClick={() => changeMonth(1)}>翌月 ▶</button>
        </div>

        {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--sub2)' }}>読み込み中...</div>}
        {!loading && adv && (
          <>
            {/* 来院数 */}
            <div className="kpi-main gap">
              <div className="lbl">来院数</div>
              <div className="val">{adv.visit_count}件</div>
              <div className="sub">{adv.active_days}日稼働 / 1日{adv.daily_capacity}枠</div>
            </div>

            {/* 稼働率・継続率 */}
            <div className="kpi2">
              <div className="kc">
                <div className="lbl">稼働率</div>
                <div className="val" style={{ color: adv.utilization_rate >= 80 ? 'var(--pos)' : adv.utilization_rate >= 50 ? 'var(--primary)' : 'var(--neg)' }}>
                  {adv.utilization_rate}%
                </div>
                <div className="sub">枠の使用率</div>
              </div>
              <div className="kc">
                <div className="lbl">継続率</div>
                <div className="val" style={adv.retention_rate !== null ? { color: adv.retention_rate >= 70 ? 'var(--pos)' : adv.retention_rate >= 40 ? 'var(--primary)' : 'var(--neg)' } : {}}>
                  {adv.retention_rate !== null ? `${adv.retention_rate}%` : '—'}
                </div>
                <div className="sub">前月来院者が今月も来た割合</div>
              </div>
            </div>

            {/* 年間LTV */}
            <div className="kpi-main gap">
              <div className="lbl">年間LTV（直近12ヶ月）</div>
              <div className="val">{adv.annual_ltv ? fmt(adv.annual_ltv) : '—'}</div>
              <div className="sub">新規1人獲得あたりの年間売上平均</div>
            </div>

            {/* リピート率 2〜5回目 */}
            <div className="card gap">
              <div style={{ padding: '16px 16px 12px' }}><div className="stitle">リピート率（全期間コホート）</div></div>
              {adv.repeat_rates ? (
                <div style={{ padding: '0 16px 16px' }}>
                  {([['2回目', adv.repeat_rates.v2], ['3回目', adv.repeat_rates.v3], ['4回目', adv.repeat_rates.v4], ['5回目', adv.repeat_rates.v5]] as [string, number][]).map(([label, pct]) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{ width: 38, fontSize: 12, color: 'var(--sub)', textAlign: 'right', flexShrink: 0 }}>{label}</div>
                      <div style={{ flex: 1, background: 'var(--border)', borderRadius: 4, height: 18 }}>
                        <div style={{ width: `${pct}%`, background: pct >= 70 ? '#C4622D' : '#DDB89A', borderRadius: 4, height: '100%', minWidth: 4, transition: 'width .4s' }} />
                      </div>
                      <div style={{ width: 38, fontSize: 13, fontWeight: 700, color: 'var(--primary)', textAlign: 'right', flexShrink: 0 }}>{pct}%</div>
                    </div>
                  ))}
                  <div style={{ fontSize: 11, color: 'var(--sub2)', marginTop: 4 }}>対象: 累計{adv.repeat_total}人</div>
                </div>
              ) : (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--sub2)' }}>来院データがありません</div>
              )}
            </div>

            {/* 媒体別新規顧客 */}
            {adv.source_breakdown.length > 0 && (
              <div className="card gap">
                <div style={{ padding: '16px 16px 0' }}><div className="stitle">媒体別 新規顧客数（{advMonth}月）</div></div>
                <table className="tbl">
                  <thead><tr><th>媒体</th><th className="r">新規数</th></tr></thead>
                  <tbody>
                    {adv.source_breakdown.map(s => (
                      <tr key={s.channel_id}>
                        <td style={{ fontWeight: 700 }}>{s.channel_name}</td>
                        <td className="r">{s.count}人</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* CPA */}
            {adv.cpa_list.length > 0 && (
              <div className="card gap">
                <div style={{ padding: '16px 16px 0' }}><div className="stitle">CPA（媒体別・{advMonth}月）</div></div>
                <table className="tbl">
                  <thead><tr><th>媒体</th><th className="r">広告費</th><th className="r">新規</th><th className="r">CPA</th></tr></thead>
                  <tbody>
                    {adv.cpa_list.map(c => (
                      <tr key={c.channel_id}>
                        <td style={{ fontWeight: 700 }}>{c.channel_name}</td>
                        <td className="r" style={{ color: 'var(--sub)' }}>{fmt(c.spend)}</td>
                        <td className="r" style={{ color: 'var(--sub)' }}>{c.new_customers}人</td>
                        <td className="num">{c.cpa ? fmt(c.cpa) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ padding: '8px 16px 12px', fontSize: 11, color: 'var(--sub2)' }}>
                  広告費は設定 → 広告媒体から入力できます
                </div>
              </div>
            )}

            {adv.source_breakdown.length === 0 && adv.cpa_list.length === 0 && (
              <div className="card cp gap" style={{ textAlign: 'center', color: 'var(--sub2)', fontSize: 13 }}>
                設定ページで広告媒体を登録すると媒体別分析が使えます
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
