'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { GET, POST } from '@/lib/api'
import { isLoggedIn } from '@/lib/auth'

interface Clinic { id: number; name: string }

export default function ClinicSetupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!isLoggedIn()) { router.replace('/login'); return }
    // 既に院があればダッシュボードへ
    GET<{ success: boolean; clinic: Clinic | null }>('/api/clinics/me').then(d => {
      if (d.clinic) router.replace('/app/dashboard')
      else setChecking(false)
    }).catch(() => setChecking(false))
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('院名を入力してください'); return }
    setLoading(true)
    const d = await POST<{ success: boolean; message?: string; clinic?: Clinic }>('/api/clinics', { name })
    setLoading(false)
    if (d.success) router.push('/app/dashboard')
    else setError(d.message || 'エラーが発生しました')
  }

  if (checking) return <div style={{ minHeight: '100vh', background: '#F5EDE4' }} />

  return (
    <div style={{ minHeight: '100vh', background: '#F5EDE4', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "-apple-system, 'Hiragino Kaku Gothic ProN', sans-serif" }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '44px 36px', width: '100%', maxWidth: 440, boxShadow: '0 4px 24px rgba(61,35,20,.1)', border: '1px solid #EAD9C8' }}>
        {/* ロゴ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 32 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#3D2314', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 900 }}>A</span>
          </div>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#3D2314' }}>Amato</span>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>🏥</div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: '#3D2314', marginBottom: 8 }}>院の情報を登録してください</h1>
          <p style={{ fontSize: 14, color: '#8B5A3A', lineHeight: 1.6 }}>
            売上データを管理する院の名前を入力してください。
          </p>
        </div>

        {error && (
          <div style={{ background: '#FEF2F2', color: '#b91c1c', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#5C3520', marginBottom: 8 }}>
            院名
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="例：あまと整体院"
            maxLength={100}
            style={{ width: '100%', padding: '13px 14px', border: '1.5px solid #EAD9C8', borderRadius: 10, fontSize: 16, outline: 'none', boxSizing: 'border-box', background: '#FDFAF7', marginBottom: 24 }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', background: '#3D2314', color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontSize: 16, fontWeight: 800, cursor: 'pointer', opacity: loading ? .6 : 1 }}>
            {loading ? '登録中...' : '院を登録してスタート →'}
          </button>
        </form>
      </div>
    </div>
  )
}
