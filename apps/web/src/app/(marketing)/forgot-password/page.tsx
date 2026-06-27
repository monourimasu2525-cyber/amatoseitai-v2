'use client'

import { useState } from 'react'
import Link from 'next/link'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://amatoseitai-v2-production.up.railway.app'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch(`${API}/api/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setSent(true)
    setLoading(false)
  }

  const s: Record<string, React.CSSProperties> = {
    wrap: { minHeight: '100vh', background: '#F5EDE4', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "-apple-system, BlinkMacSystemFont, 'Hiragino Kaku Gothic ProN', sans-serif" },
    card: { background: '#fff', borderRadius: 20, padding: '40px 36px', width: '100%', maxWidth: 420, boxShadow: '0 4px 24px rgba(61,35,20,.1)', border: '1px solid #EAD9C8' },
    logo: { display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 28 },
    logoBox: { width: 32, height: 32, borderRadius: 8, background: '#3D2314', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 22, fontWeight: 900, color: '#3D2314', textAlign: 'center', marginBottom: 8 },
    sub: { fontSize: 14, color: '#8B5A3A', textAlign: 'center', marginBottom: 28, lineHeight: 1.6 },
    label: { display: 'block', fontSize: 13, fontWeight: 700, color: '#5C3520', marginBottom: 6 },
    input: { width: '100%', padding: '12px 14px', border: '1.5px solid #EAD9C8', borderRadius: 10, fontSize: 15, outline: 'none', boxSizing: 'border-box' as const, background: '#FDFAF7' },
    btn: { width: '100%', background: '#3D2314', color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 800, cursor: 'pointer', marginTop: 20 },
    link: { display: 'block', textAlign: 'center', marginTop: 20, fontSize: 13, color: '#8B5A3A' },
  }

  if (sent) return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={{ textAlign: 'center', fontSize: 40, marginBottom: 16 }}>📧</div>
        <div style={{ ...s.title }}>メールを送信しました</div>
        <p style={{ ...s.sub, marginBottom: 0 }}>
          <strong>{email}</strong> にパスワードリセット用のリンクを送りました。<br />
          メールボックスをご確認ください（1時間有効）。
        </p>
        <Link href="/login" style={{ ...s.link, display: 'block', marginTop: 28 }}>← ログインページへ戻る</Link>
      </div>
    </div>
  )

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.logo}>
          <div style={s.logoBox}><span style={{ color: '#fff', fontSize: 14, fontWeight: 900 }}>A</span></div>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#3D2314' }}>Amato</span>
        </div>
        <div style={s.title}>パスワードをお忘れですか？</div>
        <p style={s.sub}>登録済みのメールアドレスを入力してください。<br />リセット用リンクをお送りします。</p>
        <form onSubmit={handleSubmit}>
          <label style={s.label}>メールアドレス</label>
          <input
            type="email" required value={email} onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com" style={s.input} />
          <button type="submit" disabled={loading} style={{ ...s.btn, opacity: loading ? .6 : 1 }}>
            {loading ? '送信中...' : 'リセットリンクを送る'}
          </button>
        </form>
        <Link href="/login" style={s.link}>← ログインページへ戻る</Link>
      </div>
    </div>
  )
}
