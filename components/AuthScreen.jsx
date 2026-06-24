'use client';
import { useState } from 'react';

export default function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function doAuth() {
    setError('');
    if (!email || !password) { setError('メールアドレスとパスワードを入力してください'); return; }
    setLoading(true);
    try {
      const res = await fetch(mode === 'login' ? '/api/login' : '/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_email', data.email);
        onLogin(data.token, data.email);
      } else {
        setError(data.message);
      }
    } catch {
      setError('サーバーに接続できません');
    }
    setLoading(false);
  }

  return (
    <div id="auth-screen" className="show">
      <div className="auth-box">
        <div className="auth-logo">あまと整体院</div>
        <div className="auth-sub">売上管理システム</div>
        <div className="auth-tabs">
          <button className={`auth-tab${mode === 'login' ? ' active' : ''}`} onClick={() => { setMode('login'); setError(''); }}>ログイン</button>
          <button className={`auth-tab${mode === 'register' ? ' active' : ''}`} onClick={() => { setMode('register'); setError(''); }}>新規登録</button>
        </div>
        {error && <div className="auth-err show">{error}</div>}
        <div className="fg">
          <label className="fl">メールアドレス</label>
          <input type="email" className="fc" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="example@email.com" autoComplete="email"
            onKeyDown={e => e.key === 'Enter' && document.getElementById('auth-pw')?.focus()} />
        </div>
        <div className="fg">
          <label className="fl">パスワード</label>
          <input id="auth-pw" type="password" className="fc" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="6文字以上" autoComplete="current-password"
            onKeyDown={e => e.key === 'Enter' && doAuth()} />
        </div>
        <button className="btn btn-p btn-w" onClick={doAuth} disabled={loading}>
          {loading ? '...' : mode === 'login' ? 'ログイン' : '新規登録'}
        </button>
      </div>
    </div>
  );
}
