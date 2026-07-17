'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://amatoseitai-v2-production.up.railway.app'

interface Menu { type: string; amount: number; description: string }
interface Slot { time: string; available: boolean }
interface Day { date: string; closed: boolean; slots: Slot[] }

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

export default function BookingPage() {
  const { slug } = useParams<{ slug: string }>()
  const [clinicName, setClinicName] = useState('')
  const [menus, setMenus] = useState<Menu[]>([])
  const [notFound, setNotFound] = useState(false)
  const [apiError, setApiError] = useState(false)

  const now = new Date()
  const [ym, setYm] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 })
  const [days, setDays] = useState<Day[]>([])
  const [loadingSlots, setLoadingSlots] = useState(true)

  const [selDate, setSelDate] = useState('')
  const [selTime, setSelTime] = useState('')
  const [menu, setMenu] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errMsg, setErrMsg] = useState('')
  const [done, setDone] = useState<{ date: string; time: string; menu: string } | null>(null)

  useEffect(() => {
    fetch(`${API}/api/booking/${slug}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); return null }
        return r.json()
      })
      .then(d => {
        if (!d) return
        setClinicName(d.clinic.name)
        setMenus(d.menus || [])
      })
      .catch(() => setApiError(true))
  }, [slug])

  const loadSlots = useCallback(async () => {
    setLoadingSlots(true)
    try {
      const r = await fetch(`${API}/api/booking/${slug}/slots?year=${ym.year}&month=${ym.month}`)
      const d = await r.json()
      setDays(d.days || [])
    } catch {
      setApiError(true)
    }
    setLoadingSlots(false)
  }, [slug, ym])

  useEffect(() => { loadSlots() }, [loadSlots])

  function moveMonth(diff: number) {
    setSelDate(''); setSelTime('')
    setYm(prev => {
      let y = prev.year, m = prev.month + diff
      if (m < 1) { m = 12; y-- }
      if (m > 12) { m = 1; y++ }
      return { year: y, month: m }
    })
  }

  async function submit() {
    if (!name.trim() || !phone.trim()) { setErrMsg('お名前と電話番号を入力してください'); return }
    setSubmitting(true)
    setErrMsg('')
    try {
      const r = await fetch(`${API}/api/booking/${slug}/reserve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selDate, time: selTime, menu, name, phone, email }),
      })
      const d = await r.json()
      if (d.success) {
        setDone({ date: selDate, time: selTime, menu })
      } else {
        setErrMsg(d.message || '予約できませんでした')
        loadSlots()
      }
    } catch {
      setErrMsg('通信エラーが発生しました。時間をおいてお試しいただくか、お電話でご予約ください。')
    }
    setSubmitting(false)
  }

  function fmtDateJa(dateStr: string) {
    const [y, m, d] = dateStr.split('-').map(Number)
    const wd = WEEKDAYS[new Date(y, m - 1, d).getDay()]
    return `${y}年${m}月${d}日（${wd}）`
  }

  if (notFound) {
    return (
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 18, color: 'var(--primary)' }}>ページが見つかりません</h1>
        <p style={{ fontSize: 14, color: 'var(--sub)', marginTop: 10 }}>URLをお確かめください。</p>
      </div>
    )
  }

  if (apiError) {
    return (
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 18, color: 'var(--primary)' }}>ただいま予約を受け付けられません</h1>
        <p style={{ fontSize: 14, color: 'var(--sub)', marginTop: 10 }}>
          お手数ですが、時間をおいて再度お試しいただくか、お電話でご予約ください。
        </p>
      </div>
    )
  }

  // 予約完了画面
  if (done) {
    return (
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '40px 16px' }}>
        <div className="card cp" style={{ textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--pos-l)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--pos)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h1 style={{ fontSize: 19, fontWeight: 900, color: 'var(--primary)', marginBottom: 6 }}>ご予約を承りました</h1>
          <p style={{ fontSize: 13, color: 'var(--sub)', marginBottom: 20 }}>{clinicName}</p>
          <div style={{ background: 'var(--primary-l)', borderRadius: 12, padding: '16px', textAlign: 'left', fontSize: 14 }}>
            <div style={{ marginBottom: 8 }}><b>日時：</b>{fmtDateJa(done.date)} {done.time}</div>
            {done.menu && <div style={{ marginBottom: 8 }}><b>メニュー：</b>{done.menu}</div>}
            <div><b>お名前：</b>{name} 様</div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--sub2)', marginTop: 16, lineHeight: 1.7 }}>
            変更・キャンセルの際は、お手数ですが直接お電話にてご連絡ください。
          </p>
        </div>
      </div>
    )
  }

  const selDay = days.find(d => d.date === selDate)
  const firstWd = days.length ? new Date(ym.year, ym.month - 1, 1).getDay() : 0

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', paddingBottom: 40 }}>
      <div className="ph" style={{ textAlign: 'center' }}>
        <h1>{clinicName || '　'}</h1>
        <div className="sub">ネット予約</div>
      </div>

      <div className="wrap">
        {/* 月ナビ */}
        <div className="mnav">
          <button className="mnav-btn" onClick={() => moveMonth(-1)}>‹ 前月</button>
          <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--primary)' }}>{ym.year}年{ym.month}月</span>
          <button className="mnav-btn" onClick={() => moveMonth(1)}>翌月 ›</button>
        </div>

        {/* カレンダー */}
        <div className="card cp gap">
          {loadingSlots ? <span className="spin" /> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {WEEKDAYS.map((w, i) => (
                <div key={w} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: i === 0 ? 'var(--neg)' : i === 6 ? '#2563eb' : 'var(--sub)', padding: '4px 0' }}>{w}</div>
              ))}
              {Array.from({ length: firstWd }).map((_, i) => <div key={'e' + i} />)}
              {days.map(day => {
                const dNum = Number(day.date.slice(-2))
                const hasSlot = day.slots.some(s => s.available)
                const selected = day.date === selDate
                return (
                  <button
                    key={day.date}
                    disabled={!hasSlot}
                    onClick={() => { setSelDate(day.date); setSelTime('') }}
                    style={{
                      border: 'none', borderRadius: 8, padding: '6px 0 4px', fontSize: 13, fontWeight: 700,
                      background: selected ? 'var(--primary)' : hasSlot ? 'var(--primary-l)' : 'transparent',
                      color: selected ? '#fff' : hasSlot ? 'var(--primary)' : '#c9b8a8',
                    }}
                  >
                    <div>{dNum}</div>
                    <div style={{ fontSize: 10, fontWeight: 600 }}>{day.closed ? '休' : hasSlot ? '○' : '×'}</div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* 時間選択 */}
        {selDay && (
          <div className="card cp gap">
            <div className="stitle">{fmtDateJa(selDay.date)} の空き時間</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {selDay.slots.map(s => (
                <button
                  key={s.time}
                  disabled={!s.available}
                  onClick={() => setSelTime(s.time)}
                  style={{
                    border: '1.5px solid', borderRadius: 10, padding: '10px 0', fontSize: 15, fontWeight: 700,
                    borderColor: selTime === s.time ? 'var(--primary)' : 'var(--border)',
                    background: selTime === s.time ? 'var(--primary)' : s.available ? '#fff' : '#F5F0EB',
                    color: selTime === s.time ? '#fff' : s.available ? 'var(--primary)' : '#c9b8a8',
                  }}
                >
                  {s.time}{!s.available && ' ×'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* お客様情報 */}
        {selDate && selTime && (
          <div className="card cp">
            <div className="stitle">ご予約内容の入力</div>
            <div style={{ background: 'var(--primary-l)', borderRadius: 10, padding: '10px 14px', fontSize: 14, fontWeight: 700, color: 'var(--primary)', marginBottom: 14 }}>
              {fmtDateJa(selDate)} {selTime}〜
            </div>
            {menus.length > 0 && (
              <div className="fg">
                <label className="fl">メニュー</label>
                <select className="fc" value={menu} onChange={e => setMenu(e.target.value)}>
                  <option value="">選択しない</option>
                  {menus.map(m => (
                    <option key={m.type} value={m.type}>{m.type}（¥{m.amount.toLocaleString()}）</option>
                  ))}
                </select>
              </div>
            )}
            <div className="fg">
              <label className="fl">お名前 *</label>
              <input className="fc" value={name} onChange={e => setName(e.target.value)} placeholder="山田 太郎" maxLength={50} />
            </div>
            <div className="fg">
              <label className="fl">電話番号 *</label>
              <input className="fc" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="090-1234-5678" maxLength={20} />
            </div>
            <div className="fg">
              <label className="fl">メールアドレス（任意）</label>
              <input className="fc" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="taro@example.com" maxLength={255} />
            </div>
            {errMsg && <div className="import-result err" style={{ marginBottom: 12 }}>{errMsg}</div>}
            <button className="btn btn-p btn-w" onClick={submit} disabled={submitting}>
              {submitting ? '送信中…' : 'この内容で予約する'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
