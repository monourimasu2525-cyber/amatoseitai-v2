'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://amatoseitai-v2-production.up.railway.app'

function ResetPasswordForm() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token) setError('無効なリンクです。')
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('パスワードが一致しません'); return }
    if (password.length < 6) { setError('パスワードは6文字以上にしてください'); return }
    setLoading(true)
    const res = await fetch(`${API}/api/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.success) { setDone(true); setTimeout(() => router.push('/login'), 3000) }
    else setError(data.message || 'エラーが発生しました')
  }

  const s: Record<string, React.CSSProperties> = {
    wrap: { minHeight: '100vh', background: '#F5EDE4', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "-apple-system, BlinkMacSystemFont, 'Hiragino Kaku Gothic ProN', sans-serif" },
    card: { background: '#fff', borderRadius: 20, padding: '40px 36px', width: '100%', maxWidth: 420, boxShadow: '0 4px 24px rgba(61,35,20,.1)', border: '1px solid #EAD9C8' },
    logo: { display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 28 },
    logoBox: { width: 32, height: 32, borderRadius: 8, background: '#3D2314', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 22, fontWeight: 900, color: '#3D2314', textAlign: 'center', marginBottom: 28 },
    label: { display: 'block', fontSize: 13, fontWeight: 700, color: '#5C3520', marginBottom: 6, marginTop: 16 },
    input: { width: '100%', padding: '12px 14px', border: '1.5px solid #EAD9C8', borderRadius: 10, fontSize: 15, outline: 'none', boxSizing: 'border-box' as const, background: '#FDFAF7' },
    btn: { width: '100%', background: '#3D2314', color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 800, cursor: 'pointer', marginTop: 24 },
    err: { background: '#FEF2F2', color: '#b91c1c', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 600, marginTop: 16 },
  }

  if (done) return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={{ textAlign: 'center', fontSize: 40, marginBottom: 16 }}>✅</div>
        <div style={s.title}>パスワードを変更しました</div>
        <p style={{ textAlign: 'center', fontSize: 14, color: '#8B5A3A' }}>3秒後にログインページへ移動します...</p>
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
        <div style={s.title}>新しいパスワードを設定</div>
        {error && <div style={s.err}>{error}</div>}
        {!error || token ? (
          <form onSubmit={handleSubmit}>
            <label style={s.label}>新しいパスワード</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="6文字以上" style={s.input} />
            <label style={s.label}>パスワード（確認）</label>
            <input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="もう一度入力" style={s.input} />
            <button type="submit" disabled={loading} style={{ ...s.btn, opacity: loading ? .6 : 1 }}>
              {loading ? '変更中...' : 'パスワードを変更する'}
            </button>
          </form>
        ) : null}
        <Link href="/login" style={{ display: 'block', textAlign: 'center', marginTop: 20, fontSize: 13, color: '#8B5A3A' }}>← ログインページへ戻る</Link>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#F5EDE4' }} />}>
      <ResetPasswordForm />
    </Suspense>
  )
}
