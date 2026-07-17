'use client'

import { useState, useEffect, useCallback } from 'react'
import { GET, PUT } from '@/lib/api'

interface Reservation {
  id: number; name: string; phone: string; email: string; menu: string
  start_at: string; status: string
}
interface Clinic { id: number; name: string; slug: string }

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [clinic, setClinic] = useState<Clinic | null>(null)
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const [loading, setLoading] = useState(true)
  const [cancelId, setCancelId] = useState<number | null>(null)
  const [toast, setToast] = useState('')
  const [copied, setCopied] = useState(false)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const load = useCallback(async () => {
    setLoading(true)
    const [rd, cd] = await Promise.all([
      GET('/api/reservations', tab === 'past' ? { past: 1 } : {}) as Promise<{ reservations: Reservation[] }>,
      GET('/api/clinics/me') as Promise<{ clinic: Clinic | null }>,
    ])
    setReservations(rd.reservations || [])
    setClinic(cd.clinic)
    setLoading(false)
  }, [tab])

  useEffect(() => { load() }, [load])

  const bookingUrl = clinic ? `${window.location.origin}/book/${clinic.slug}` : ''

  async function copyUrl() {
    await navigator.clipboard.writeText(bookingUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleCancel(id: number) {
    const d = await PUT('/api/reservations/' + id + '/cancel', {}) as { success: boolean; message: string }
    setCancelId(null)
    if (d.success) { showToast('予約をキャンセルしました'); load() }
    else showToast(d.message || 'キャンセルできませんでした')
  }

  function fmtDateJa(iso: string) {
    const dt = new Date(iso)
    return `${dt.getMonth() + 1}/${dt.getDate()}（${WEEKDAYS[dt.getDay()]}）`
  }
  function fmtTime(iso: string) {
    const dt = new Date(iso)
    return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`
  }

  // 日付ごとにグループ化
  const groups: { label: string; items: Reservation[] }[] = []
  reservations.forEach(r => {
    const label = fmtDateJa(r.start_at)
    const g = groups.find(g => g.label === label)
    if (g) g.items.push(r)
    else groups.push({ label, items: [r] })
  })

  return (
    <div className="page">
      <div className="ph">
        <h1>予約</h1>
        <div className="sub">ネット予約の確認・管理</div>
      </div>

      <div className="wrap">
        {/* 予約URL */}
        {clinic && (
          <div className="card cp gap">
            <div className="stitle">あなたの予約ページURL</div>
            <div style={{ fontSize: 13, color: 'var(--sub)', wordBreak: 'break-all', marginBottom: 10 }}>{bookingUrl}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-s btn-sm" onClick={copyUrl}>{copied ? 'コピーしました ✓' : 'URLをコピー'}</button>
              <a href={bookingUrl} target="_blank" rel="noopener noreferrer" className="btn btn-s btn-sm">開いて確認</a>
            </div>
            <p style={{ fontSize: 12, color: 'var(--sub2)', marginTop: 10, lineHeight: 1.6 }}>
              このURLをLINEやホームページに貼ると、お客様がネットから予約できます。
            </p>
          </div>
        )}

        <div className="vtabs">
          <button className={`vtab ${tab === 'upcoming' ? 'active' : ''}`} onClick={() => setTab('upcoming')}>今後の予約</button>
          <button className={`vtab ${tab === 'past' ? 'active' : ''}`} onClick={() => setTab('past')}>過去の予約</button>
        </div>

        {loading ? <span className="spin" /> : groups.length === 0 ? (
          <div className="card cp" style={{ textAlign: 'center', color: 'var(--sub2)', fontSize: 14 }}>
            {tab === 'upcoming' ? '今後の予約はまだありません' : '過去の予約はありません'}
          </div>
        ) : (
          groups.map(g => (
            <div key={g.label} className="gap">
              <div className="stitle" style={{ marginBottom: 6 }}>{g.label}</div>
              <div className="card">
                {g.items.map(r => (
                  <div key={r.id} className="li" style={r.status === 'cancelled' ? { opacity: .5 } : undefined}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--primary)', minWidth: 46 }}>{fmtTime(r.start_at)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, textDecoration: r.status === 'cancelled' ? 'line-through' : 'none' }}>{r.name} 様</div>
                      <div style={{ fontSize: 12, color: 'var(--sub2)' }}>
                        {r.menu && <span>{r.menu}　</span>}
                        <a href={'tel:' + r.phone} style={{ color: 'var(--accent)' }}>{r.phone}</a>
                      </div>
                    </div>
                    {r.status === 'cancelled' ? (
                      <span className="tag t-dn">キャンセル</span>
                    ) : tab === 'upcoming' ? (
                      <button className="ib" onClick={() => setCancelId(r.id)}>取消</button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* キャンセル確認モーダル */}
      {cancelId !== null && (
        <div className="modal" onClick={() => setCancelId(null)}>
          <div className="mbox" onClick={e => e.stopPropagation()}>
            <div className="mtitle">予約をキャンセルしますか？</div>
            <p style={{ fontSize: 13, color: 'var(--sub)', marginBottom: 4 }}>
              この操作は取り消せません。お客様への連絡は別途お電話等でお願いします。
            </p>
            <div className="mfoot">
              <button className="btn btn-s btn-w" onClick={() => setCancelId(null)}>戻る</button>
              <button className="btn btn-d btn-w" onClick={() => handleCancel(cancelId)}>キャンセルする</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast" style={{ background: 'var(--primary)' }}>{toast}</div>}
    </div>
  )
}
