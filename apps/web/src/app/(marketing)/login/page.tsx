'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { setAuth, isLoggedIn } from '@/lib/auth'
import styles from './login.module.css'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://amatoseitai-v2-production.up.railway.app'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isLoggedIn()) router.replace('/app/dashboard')
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('メールアドレスとパスワードを入力してください'); return }
    setLoading(true)
    try {
      const res = await fetch(API + '/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (data.success) {
        setAuth(data.token, data.email)
        router.push('/app/dashboard')
      } else {
        setError(data.message)
      }
    } catch {
      setError('サーバーに接続できません')
    }
    setLoading(false)
  }

  return (
    <div className={styles.screen}>
      <div className={styles.box}>
        <div className={styles.logo}>Amato整体院</div>
        <div className={styles.subtext}>売上管理システム</div>

        {error && <div className={styles.err}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="fg">
            <label className="fl">メールアドレス</label>
            <input
              type="email"
              className="fc"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="example@email.com"
              autoComplete="email"
            />
          </div>
          <div className="fg">
            <label className="fl">パスワード</label>
            <input
              type="password"
              className="fc"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="6文字以上"
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn btn-p btn-w" disabled={loading}>
            {loading ? 'ログイン中…' : 'ログイン'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <Link href="/forgot-password" style={{ fontSize: 13, color: '#8B5A3A' }}>パスワードをお忘れの方</Link>
        </div>

        <div className={styles.footer}>
          アカウントをお持ちでない方は{' '}
          <Link href="/signup" className={styles.link}>新規登録</Link>
        </div>
      </div>
    </div>
  )
}
