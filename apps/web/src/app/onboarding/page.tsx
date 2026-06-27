'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isLoggedIn } from '@/lib/auth'

const STEPS = [
  {
    key: 'account',
    title: 'アカウント作成',
    desc: '登録完了しました！',
    done: true,
    action: null,
    actionLabel: null,
  },
  {
    key: 'master',
    title: '料金プランを設定する',
    desc: '新規・常連などの料金プランを登録しておくと、売上入力がスムーズになります。',
    done: false,
    action: '/app/settings',
    actionLabel: '設定ページへ',
  },
  {
    key: 'first_sale',
    title: '最初の売上を入力する',
    desc: 'ダッシュボードの「＋」ボタンから売上を入力してみましょう。',
    done: false,
    action: '/app/dashboard',
    actionLabel: 'ダッシュボードへ',
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [completed, setCompleted] = useState<Record<string, boolean>>({ account: true })

  useEffect(() => {
    if (!isLoggedIn()) { router.replace('/login'); return }
    const saved = localStorage.getItem('onboarding_progress')
    if (saved) setCompleted({ account: true, ...JSON.parse(saved) })
  }, [router])

  function markDone(key: string) {
    const next = { ...completed, [key]: true }
    setCompleted(next)
    const { account: _, ...rest } = next
    localStorage.setItem('onboarding_progress', JSON.stringify(rest))
  }

  function goStep(step: typeof STEPS[0]) {
    markDone(step.key)
    if (step.action) router.push(step.action)
  }

  const allDone = STEPS.every(s => completed[s.key])
  const doneCount = STEPS.filter(s => completed[s.key]).length

  return (
    <div style={{ minHeight: '100vh', background: '#F5EDE4', fontFamily: "-apple-system, BlinkMacSystemFont, 'Hiragino Kaku Gothic ProN', sans-serif" }}>
      {/* ヘッダー */}
      <div style={{ background: '#fff', borderBottom: '1px solid #EAD9C8', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: '#3D2314', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#fff', fontSize: 12, fontWeight: 900 }}>A</span>
        </div>
        <span style={{ fontSize: 16, fontWeight: 900, color: '#3D2314' }}>Amato</span>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '40px 20px' }}>
        {/* ウェルカム */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🎉</div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#3D2314', letterSpacing: '-0.5px', marginBottom: 10 }}>
            ようこそ！
          </h1>
          <p style={{ fontSize: 15, color: '#8B5A3A', lineHeight: 1.7 }}>
            3ステップでAmato整体院SaaSを<br />使い始めましょう。
          </p>
        </div>

        {/* 進捗バー */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', marginBottom: 20, boxShadow: '0 1px 3px rgba(61,35,20,.08)', border: '1px solid #EAD9C8', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, background: '#EAD9C8', borderRadius: 100, height: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#C4622D', borderRadius: 100, width: `${(doneCount / STEPS.length) * 100}%`, transition: 'width .4s' }} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#8B5A3A', flexShrink: 0 }}>
            {doneCount} / {STEPS.length} 完了
          </div>
        </div>

        {/* ステップ一覧 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
          {STEPS.map((step, i) => {
            const done = completed[step.key]
            return (
              <div key={step.key} style={{ background: '#fff', borderRadius: 14, padding: '20px 18px', boxShadow: '0 1px 3px rgba(61,35,20,.08)', border: `1.5px solid ${done ? '#C4622D' : '#EAD9C8'}`, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                {/* ステップ番号 / チェック */}
                <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 10, background: done ? '#C4622D' : '#F5EDE4', border: `2px solid ${done ? '#C4622D' : '#EAD9C8'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {done
                    ? <span style={{ color: '#fff', fontSize: 17, fontWeight: 900 }}>✓</span>
                    : <span style={{ color: '#B8967A', fontSize: 14, fontWeight: 800 }}>{i + 1}</span>
                  }
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: done ? '#B8967A' : '#3D2314', marginBottom: 4, textDecoration: done ? 'line-through' : 'none' }}>
                    {step.title}
                  </div>
                  <div style={{ fontSize: 13, color: '#8B5A3A', lineHeight: 1.6, marginBottom: step.action && !done ? 14 : 0 }}>
                    {step.desc}
                  </div>
                  {step.action && !done && (
                    <button
                      onClick={() => goStep(step)}
                      style={{ background: '#3D2314', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                      {step.actionLabel} →
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* 完了 or スキップ */}
        {allDone ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, marginBottom: 10 }}>🎊</div>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#3D2314', marginBottom: 6 }}>セットアップ完了！</div>
            <div style={{ fontSize: 14, color: '#8B5A3A', marginBottom: 20 }}>さっそく使い始めましょう。</div>
            <button
              onClick={() => router.push('/app/dashboard')}
              style={{ background: '#C4622D', color: '#fff', border: 'none', borderRadius: 12, padding: '14px 40px', fontSize: 16, fontWeight: 800, cursor: 'pointer' }}>
              ダッシュボードへ →
            </button>
          </div>
        ) : (
          <button
            onClick={() => router.push('/app/dashboard')}
            style={{ width: '100%', background: 'none', border: '1.5px solid #EAD9C8', borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 600, color: '#B8967A', cursor: 'pointer' }}>
            スキップしてダッシュボードへ
          </button>
        )}
      </div>
    </div>
  )
}
