'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { GET, DEL } from '@/lib/api'

interface Customer {
  id: number; name: string; phone: string; birthday: string | null; memo: string
}
interface Visit {
  id: number; customer_id: number; sale_id: number | null; memo: string; visited_at: string; type: string | null; amount: number | null
}

export default function CustomerDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [deleteVisitId, setDeleteVisitId] = useState<number | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const load = useCallback(async () => {
    setLoading(true)
    const [cd, vd] = await Promise.all([
      GET<{ success: boolean; customers: Customer[] }>('/api/customers'),
      GET<{ success: boolean; visits: Visit[] }>('/api/visits', { customer_id: id }),
    ])
    const found = (cd.customers || []).find(c => c.id === Number(id))
    setCustomer(found || null)
    setVisits(vd.visits || [])
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function handleDeleteVisit(vid: number) {
    await DEL('/api/visits/' + vid)
    setDeleteVisitId(null)
    showToast('来院記録を削除しました')
    load()
  }

  function fmtAge(b: string | null) {
    if (!b) return null
    const age = Math.floor((Date.now() - new Date(b).getTime()) / (365.25 * 24 * 3600 * 1000))
    return `${age}歳`
  }
  function fmtDate(d: string) {
    const dt = new Date(d)
    return `${dt.getFullYear()}/${dt.getMonth()+1}/${dt.getDate()}`
  }
  function fmtTime(d: string) {
    const dt = new Date(d)
    return `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`
  }

  const totalAmount = visits.reduce((s, v) => s + (v.amount || 0), 0)

  if (loading) return <div style={{ minHeight: '100vh', background: 'var(--bg)' }} />

  if (!customer) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: 'var(--sub)' }}>
        <div style={{ fontSize: 40 }}>🔍</div>
        <div style={{ marginTop: 12, fontWeight: 700 }}>顧客が見つかりません</div>
        <button onClick={() => router.back()} style={{ marginTop: 16, background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', cursor: 'pointer' }}>戻る</button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 80, fontFamily: "-apple-system, 'Hiragino Kaku Gothic ProN', sans-serif" }}>
      {/* ヘッダー */}
      <div style={{ background: 'var(--primary)', padding: '16px 16px 20px' }}>
        <button onClick={() => router.back()} style={{ background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: 8, padding: '6px 12px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginBottom: 12 }}>
          ← 戻る
        </button>
        <div style={{ color: '#fff', fontSize: 22, fontWeight: 900 }}>{customer.name}</div>
        {fmtAge(customer.birthday) && <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 13, marginTop: 2 }}>{fmtAge(customer.birthday)}</div>}
      </div>

      {/* 顧客情報 */}
      <div style={{ margin: 16, background: '#fff', borderRadius: 14, padding: 16, border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary)', marginBottom: 10 }}>基本情報</div>
        {customer.phone && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
            <span style={{ color: 'var(--sub2)' }}>電話</span>
            <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{customer.phone}</span>
          </div>
        )}
        {customer.birthday && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: customer.memo ? '1px solid var(--border)' : 'none', fontSize: 13 }}>
            <span style={{ color: 'var(--sub2)' }}>生年月日</span>
            <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{customer.birthday.slice(0,10)}</span>
          </div>
        )}
        {customer.memo && (
          <div style={{ padding: '8px 0', fontSize: 13, color: 'var(--sub)' }}>{customer.memo}</div>
        )}
      </div>

      {/* 来院統計 */}
      <div style={{ margin: '0 16px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 14, border: '1px solid var(--border)', textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--primary)' }}>{visits.length}</div>
          <div style={{ fontSize: 12, color: 'var(--sub2)', marginTop: 2 }}>来院回数</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: 14, border: '1px solid var(--border)', textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--primary)' }}>¥{totalAmount.toLocaleString()}</div>
          <div style={{ fontSize: 12, color: 'var(--sub2)', marginTop: 2 }}>累計売上</div>
        </div>
      </div>

      {/* 来院履歴 */}
      <div style={{ margin: '0 16px' }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary)', marginBottom: 10 }}>来院履歴</div>
        {visits.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--sub2)', background: '#fff', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>来院記録がありません</div>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visits.map(v => (
            <div key={v.id} style={{ background: '#fff', borderRadius: 12, padding: '12px 14px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary)' }}>{v.type || '—'}</div>
                <div style={{ fontSize: 12, color: 'var(--sub2)', marginTop: 2 }}>{fmtDate(v.visited_at)} {fmtTime(v.visited_at)}</div>
                {v.memo && <div style={{ fontSize: 12, color: 'var(--sub)', marginTop: 2 }}>{v.memo}</div>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--primary)' }}>
                  {v.amount ? '¥' + v.amount.toLocaleString() : '—'}
                </div>
                <button onClick={() => setDeleteVisitId(v.id)} style={{ background: '#FEF2F2', border: 'none', borderRadius: 7, padding: '5px 10px', fontSize: 11, fontWeight: 700, color: '#b91c1c', cursor: 'pointer' }}>削除</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 来院記録削除確認 */}
      {deleteVisitId !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px 24px', width: '100%', maxWidth: 360, textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 10 }}>🗑️</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary)', marginBottom: 4 }}>来院記録を削除しますか？</div>
            <div style={{ fontSize: 13, color: 'var(--sub)', marginBottom: 24 }}>紐付いた売上データも同時に削除されます</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteVisitId(null)} style={{ flex: 1, background: 'var(--primary-l)', color: 'var(--primary)', border: 'none', borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>キャンセル</button>
              <button onClick={() => handleDeleteVisit(deleteVisitId)} style={{ flex: 1, background: '#b91c1c', color: '#fff', border: 'none', borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>削除する</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', background: '#3D2314', color: '#fff', padding: '10px 20px', borderRadius: 100, fontSize: 13, fontWeight: 700, zIndex: 200, whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
