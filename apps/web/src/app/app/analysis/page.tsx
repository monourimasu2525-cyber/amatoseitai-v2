'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { GET } from '@/lib/api'

const fmt = (n: number) => '¥' + Number(n).toLocaleString()

interface CustomerAnalytics {
  total_customers: number; repeat_customers: number; repeat_rate: number
  churn_count: number; churn_rate: number; avg_visits: number; avg_ltv: number
  dormant: { id: number; name: string; phone: string; last_visit: string | null; days_since: number | null; visit_count: number }[]
  top_customers: { id: number; name: string; visit_count: number; total_amount: number }[]
  monthly_new: { month: string; count: number }[]
}
interface AdvancedAnalytics {
  year: number; month: number
  visit_count: number; active_days: number; daily_capacity: number; utilization_rate: number
  prev_month_visitors: number; retained_visitors: number; retention_rate: number | null
  repeat_total: number
  repeat_rates: { v2: number; v3: number; v4: number; v5: number } | null
  source_breakdown: { channel_id: number; channel_name: string; count: number }[]
  cpa_list: { channel_id: number; channel_name: string; spend: number; new_customers: number; cpa: number | null }[]
}

export default function AnalysisPage() {
  const router = useRouter()
  const now = new Date()
  const [view, setView] = useState<'customer' | 'advanced'>('advanced')
  const [advYear, setAdvYear] = useState(now.getFullYear())
  const [advMonth, setAdvMonth] = useState(now.getMonth() + 1)

  const [data, setData] = useState<CustomerAnalytics | null>(null)
  const [dataLoading, setDataLoading] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)

  const [adv, setAdv] = useState<AdvancedAnalytics | null>(null)
  const [advLoading, setAdvLoading] = useState(false)

  useEffect(() => {
    if (view === 'customer' && !dataLoaded) {
      setDataLoading(true)
      GET<CustomerAnalytics & { success: boolean }>('/api/analytics/customers').then(d => {
        if (d.success) setData(d)
        setDataLoading(false); setDataLoaded(true)
      }).catch(() => { setDataLoading(false); setDataLoaded(true) })
    }
  }, [view, dataLoaded])

  useEffect(() => {
    if (view !== 'advanced') return
    setAdvLoading(true)
    GET<AdvancedAnalytics & { success: boolean }>('/api/analytics/advanced', { year: advYear, month: advMonth }).then(d => {
      if (d.success) setAdv(d)
      setAdvLoading(false)
    }).catch(() => setAdvLoading(false))
  }, [view, advYear, advMonth])

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

        <div className="vtabs">
          <button className={`vtab ${view === 'advanced' ? 'active' : ''}`} onClick={() => setView('advanced')}>指標</button>
          <button className={`vtab ${view === 'customer' ? 'active' : ''}`} onClick={() => setView('customer')}>顧客</button>
        </div>

        {/* 指標タブ */}
        {view === 'advanced' && (
          <>
            <div className="mnav">
              <button className="mnav-btn" onClick={() => changeMonth(-1)}>◀ 前月</button>
              <span className="mnav-label">{advYear}年{advMonth}月</span>
              <button className="mnav-btn" onClick={() => changeMonth(1)}>翌月 ▶</button>
            </div>

            {advLoading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--sub2)' }}>読み込み中...</div>}
            {!advLoading && adv && (
              <>
                {/* 来院数・稼働率 */}
                <div className="kpi-main gap">
                  <div className="lbl">来院数</div>
                  <div className="val">{adv.visit_count}件</div>
                  <div className="sub">{adv.active_days}日稼働 / 1日{adv.daily_capacity}枠</div>
                </div>
                <div className="kpi2">
                  <div className="kc">
                    <div className="lbl">稼働率</div>
                    <div className="val" style={{ color: adv.utilization_rate >= 80 ? 'var(--pos)' : adv.utilization_rate >= 50 ? 'var(--primary)' : 'var(--neg)' }}>{adv.utilization_rate}%</div>
                    <div className="sub">{adv.visit_count} / ({adv.daily_capacity}枠×{adv.active_days}日)</div>
                  </div>
                  <div className="kc">
                    <div className="lbl">継続率</div>
                    <div className="val" style={adv.retention_rate !== null ? { color: adv.retention_rate >= 70 ? 'var(--pos)' : adv.retention_rate >= 40 ? 'var(--primary)' : 'var(--neg)' } : {}}>
                      {adv.retention_rate !== null ? `${adv.retention_rate}%` : '—'}
                    </div>
                    <div className="sub">前月来院者 {adv.prev_month_visitors}人中 {adv.retained_visitors}人が継続</div>
                  </div>
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
                          <div style={{ width: 38, fontSize: 13, fontWeight: 800, color: 'var(--primary)', textAlign: 'right', flexShrink: 0 }}>{pct}%</div>
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
                    <div style={{ padding: '16px 16px 0' }}>
                      <div className="stitle">CPA（媒体別・{advMonth}月）</div>
                    </div>
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
                      広告費は設定 → 広告媒体マスターから入力できます
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
          </>
        )}

        {/* 顧客タブ */}
        {view === 'customer' && (
          <>
            {dataLoading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--sub2)' }}>読み込み中...</div>}
            {!dataLoading && data && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '10px 16px' }}>
                  {[
                    { label: 'リピート率', value: `${data.repeat_rate}%`, sub: `${data.repeat_customers}人が2回以上来院` },
                    { label: '平均LTV', value: fmt(data.avg_ltv), sub: '顧客1人あたりの累計売上' },
                    { label: '平均来院回数', value: `${data.avg_visits}回`, sub: '顧客1人あたり' },
                    { label: '離脱率', value: `${data.churn_rate}%`, sub: '60日以上来院なし', neg: true },
                  ].map(k => (
                    <div key={k.label} className="kc">
                      <div className="lbl">{k.label}</div>
                      <div className="val" style={k.neg ? { color: 'var(--neg)' } : {}}>{k.value}</div>
                      <div className="sub">{k.sub}</div>
                    </div>
                  ))}
                </div>

                <div className="card gap">
                  <div style={{ padding: '16px 16px 0' }}><div className="stitle">累計売上ランキング</div></div>
                  {data.top_customers.length === 0 ? (
                    <div style={{ padding: 18, textAlign: 'center', color: 'var(--sub2)' }}>来院記録がありません</div>
                  ) : (
                    <table className="tbl">
                      <thead><tr><th>顧客名</th><th className="r">来院回数</th><th className="r">累計売上</th></tr></thead>
                      <tbody>
                        {data.top_customers.map((c, i) => (
                          <tr key={c.id} onClick={() => router.push('/app/customers/' + c.id)} style={{ cursor: 'pointer' }}>
                            <td style={{ fontWeight: 700 }}><span style={{ color: 'var(--sub2)', fontSize: 11, marginRight: 6 }}>#{i + 1}</span>{c.name}</td>
                            <td className="r" style={{ color: 'var(--sub)' }}>{c.visit_count}回</td>
                            <td className="num">{fmt(Number(c.total_amount))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="card gap">
                  <div style={{ padding: '16px 16px 8px' }}><div className="stitle">要フォロー顧客（60日以上来院なし）</div></div>
                  {data.dormant.length === 0 ? (
                    <div style={{ padding: 18, textAlign: 'center', color: 'var(--sub2)' }}>休眠顧客はいません 🎉</div>
                  ) : (
                    <div style={{ padding: '0 16px 8px' }}>
                      {data.dormant.map((d, idx) => (
                        <div key={d.id} onClick={() => router.push('/app/customers/' + d.id)}
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: idx < data.dormant.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--primary)' }}>{d.name}</div>
                            {d.phone && <div style={{ fontSize: 12, color: 'var(--sub2)' }}>{d.phone}</div>}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--neg)' }}>{d.last_visit ? `${d.days_since}日前` : '来院記録なし'}</div>
                            <div style={{ fontSize: 11, color: 'var(--sub2)' }}>{d.visit_count}回来院</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="card gap">
                  <div style={{ padding: '16px 16px 12px' }}><div className="stitle">月別新規顧客数</div></div>
                  <div style={{ padding: '0 16px 16px' }}>
                    {data.monthly_new.length === 0 ? (
                      <div style={{ textAlign: 'center', color: 'var(--sub2)', padding: 12 }}>データがありません</div>
                    ) : (() => {
                      const maxCount = Math.max(...data.monthly_new.map(x => Number(x.count)), 1)
                      return data.monthly_new.map(m => (
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
      </div>
    </div>
  )
}
