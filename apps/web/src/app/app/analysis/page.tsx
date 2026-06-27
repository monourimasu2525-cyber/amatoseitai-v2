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

export default function AnalysisPage() {
  const router = useRouter()
  const [data, setData] = useState<CustomerAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    GET<CustomerAnalytics & { success: boolean }>('/api/analytics/customers').then(d => {
      if (d.success) setData(d)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  return (
    <div className="page">
      <div className="ph"><h1>分析</h1></div>
      <div className="wrap">
        {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--sub2)' }}>読み込み中...</div>}
        {!loading && data && (
          <>
            {/* KPI */}
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

            {/* 累計売上ランキング */}
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
        {!loading && !data && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--sub2)' }}>データを取得できませんでした</div>
        )}
      </div>
    </div>
  )
}
