'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { setAuth, isLoggedIn } from '@/lib/auth'
import styles from './signup.module.css'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://amatoseitai-v2-production.up.railway.app'

export default function SignupPage() {
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
    if (password.length < 6) { setError('パスワードは6文字以上にしてください'); return }
    setLoading(true)
    try {
      const res = await fetch(API + '/api/register', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (data.success) {
        setAuth('', data.email)
        router.push('/onboarding')
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
        <div className={styles.subtext}>新規アカウント作成</div>

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
              autoComplete="new-password"
            />
          </div>
          <button type="submit" className="btn btn-p btn-w" disabled={loading}>
            {loading ? '登録中…' : '無料で始める'}
          </button>
        </form>

        <div className={styles.footer}>
          すでにアカウントをお持ちの方は{' '}
          <Link href="/login" className={styles.link}>ログイン</Link>
        </div>
      </div>
    </div>
  )
}
