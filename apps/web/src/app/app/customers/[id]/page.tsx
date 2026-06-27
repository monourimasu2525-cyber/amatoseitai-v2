'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { GET, PUT, DEL } from '@/lib/api'

interface Customer {
  id: number; name: string; phone: string; birthday: string | null; memo: string; source_id: number | null
}
interface Visit {
  id: number; customer_id: number; sale_id: number | null; memo: string; visited_at: string; type: string | null; amount: number | null
}
interface Channel { id: number; name: string }

const KARTE_TEMPLATE = '【患者の訴え】\n\n【見立て・身体の状態】\n\n【施術内容】\n\n【施術後の説明・アドバイス】\n\n【次回に向けて】'

export default function CustomerDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [visits, setVisits] = useState<Visit[]>([])
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [deleteVisitId, setDeleteVisitId] = useState<number | null>(null)

  // カルテ編集
  const [karteEditId, setKarteEditId] = useState<number | null>(null)
  const [karteDraft, setKarteDraft] = useState('')
  const [karteSaving, setKarteSaving] = useState(false)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const load = useCallback(async () => {
    setLoading(true)
    const [cd, vd, chd] = await Promise.all([
      GET<{ success: boolean; customers: Customer[] }>('/api/customers'),
      GET<{ success: boolean; visits: Visit[] }>('/api/visits', { customer_id: id }),
      GET<{ channels: Channel[] }>('/api/advertising-channels'),
    ])
    const found = (cd.customers || []).find(c => c.id === Number(id))
    setCustomer(found || null)
    setVisits(vd.visits || [])
    setChannels(chd.channels || [])
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function handleDeleteVisit(vid: number) {
    await DEL('/api/visits/' + vid)
    setDeleteVisitId(null)
    showToast('来院記録を削除しました')
    load()
  }

  function openKarte(v: Visit) {
    setKarteEditId(v.id)
    setKarteDraft(v.memo || '')
  }

  async function saveKarte() {
    if (karteEditId === null) return
    setKarteSaving(true)
    await PUT('/api/visits/' + karteEditId, { memo: karteDraft })
    setKarteSaving(false)
    setKarteEditId(null)
    showToast('カルテを保存しました')
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
  const sourceName = customer?.source_id ? channels.find(c => c.id === customer.source_id)?.name : null

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
        {sourceName && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
            <span style={{ color: 'var(--sub2)' }}>集客媒体</span>
            <span style={{ color: 'var(--primary)', fontWeight: 700, background: 'var(--primary-l)', padding: '2px 8px', borderRadius: 6, fontSize: 12 }}>{sourceName}</span>
          </div>
        )}
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
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary)', marginBottom: 10 }}>来院履歴・カルテ</div>
        {visits.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--sub2)', background: '#fff', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>来院記録がありません</div>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {visits.map((v, idx) => (
            <div key={v.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
              {/* 来院ヘッダー */}
              <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', background: 'var(--primary)', padding: '2px 7px', borderRadius: 6 }}>{visits.length - idx}回目</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary)' }}>{v.type || '—'}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--sub2)', marginTop: 3 }}>{fmtDate(v.visited_at)} {fmtTime(v.visited_at)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--primary)' }}>
                    {v.amount ? '¥' + v.amount.toLocaleString() : '—'}
                  </div>
                  <button onClick={() => setDeleteVisitId(v.id)} style={{ background: '#FEF2F2', border: 'none', borderRadius: 7, padding: '5px 8px', fontSize: 11, fontWeight: 700, color: '#b91c1c', cursor: 'pointer' }}>削除</button>
                </div>
              </div>

              {/* カルテ */}
              <div style={{ borderTop: '1px solid var(--border)', padding: '10px 14px' }}>
                {v.memo ? (
                  <div>
                    <pre style={{ fontSize: 12, color: 'var(--sub)', margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.7 }}>{v.memo}</pre>
                    <button onClick={() => openKarte(v)} style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-l)', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>カルテを編集</button>
                  </div>
                ) : (
                  <button onClick={() => { openKarte(v); setKarteDraft(KARTE_TEMPLATE) }} style={{ fontSize: 12, fontWeight: 700, color: 'var(--sub2)', background: 'none', border: '1.5px dashed var(--border)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', width: '100%' }}>
                    + カルテを記入する
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* カルテ編集モーダル */}
      {karteEditId !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '20px 16px 32px', width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--primary)', marginBottom: 12 }}>カルテを編集</div>
            <textarea
              value={karteDraft}
              onChange={e => setKarteDraft(e.target.value)}
              rows={14}
              style={{ width: '100%', padding: '12px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 13, outline: 'none', resize: 'none', lineHeight: 1.7, boxSizing: 'border-box' as const }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button onClick={() => setKarteEditId(null)} style={{ flex: 1, background: 'var(--primary-l)', color: 'var(--primary)', border: 'none', borderRadius: 12, padding: 13, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>キャンセル</button>
              <button onClick={saveKarte} disabled={karteSaving} style={{ flex: 2, background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 12, padding: 13, fontSize: 15, fontWeight: 800, cursor: 'pointer', opacity: karteSaving ? .6 : 1 }}>
                {karteSaving ? '保存中…' : '保存する'}
              </button>
            </div>
          </div>
        </div>
      )}

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
