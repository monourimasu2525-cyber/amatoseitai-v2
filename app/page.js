'use client';
import { useState, useEffect, useCallback } from 'react';
import Script from 'next/script';
import AuthScreen from '@/components/AuthScreen';
import HomeTab from '@/components/HomeTab';
import LedgerTab from '@/components/LedgerTab';
import StatsTab from '@/components/StatsTab';
import AccountingTab from '@/components/AccountingTab';
import SettingsTab from '@/components/SettingsTab';
import QuickSheet, { PaySheet, SuccessOverlay } from '@/components/QuickSheet';
import Toast from '@/components/Toast';
import { createApi } from '@/lib/api';

export default function App() {
  const [token, setToken] = useState(null);
  const [email, setEmail] = useState(null);
  const [page, setPage] = useState('home');
  const [master, setMaster] = useState([]);
  const [toast, setToast] = useState({ msg: '', err: false });
  const [quickOpen, setQuickOpen] = useState(false);
  const [payItem, setPayItem] = useState(null);
  const [success, setSuccess] = useState(null);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [chartReady, setChartReady] = useState(false);

  const showToast = useCallback((msg, err = false) => setToast({ msg, err }), []);

  const api = createApi(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_email');
    setToken(null); setEmail(null);
  });

  useEffect(() => {
    const t = localStorage.getItem('auth_token');
    const e = localStorage.getItem('auth_email');
    if (t) { setToken(t); setEmail(e); }
  }, []);

  useEffect(() => {
    if (token) loadMaster();
  }, [token]);

  async function loadMaster() {
    try { const d = await api.get('/api/master'); setMaster(d.items || []); } catch {}
  }

  function onLogin(t, e) { setToken(t); setEmail(e); }

  function onLogout() {
    localStorage.removeItem('auth_token'); localStorage.removeItem('auth_email');
    setToken(null); setEmail(null); setMaster([]);
  }

  function goPage(p) {
    setPage(p);
    if (p === 'settings') loadMaster();
  }

  function openQuick(type, amount) {
    if (type && amount) { setPayItem({ type, amount }); return; }
    if (!master.length) { showToast('設定からマスタを追加してください'); return; }
    setQuickOpen(true);
  }

  function selectPlan(type, amount) {
    setQuickOpen(false);
    setTimeout(() => setPayItem({ type, amount }), 200);
  }

  async function confirmSale(method) {
    const { type, amount } = payItem;
    setPayItem(null);
    const r = await api.post('/api/sales', { type, amount });
    if (r.success) {
      setSuccess({ type, amount, method });
      setTimeout(() => setSuccess(null), 1500);
      setRefreshSignal(s => s + 1);
      showToast(r.message);
    } else {
      showToast(r.message, true);
    }
  }

  if (!token) return <AuthScreen onLogin={onLogin} />;

  const NAV = [
    { id:'home',       label:'ホーム',   icon:<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>, extra:<polyline points="9 22 9 12 15 12 15 22"/> },
    { id:'ledger',     label:'台帳',     icon:<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></> },
    null, // center
    { id:'stats',      label:'集計',     icon:<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></> },
    { id:'settings',   label:'設定',     icon:<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></> },
  ];

  return (
    <>
      <Script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js" onLoad={() => setChartReady(true)} />

      {/* アクティブなタブのみレンダリング */}
      {page === 'home' && <HomeTab api={api} master={master} onOpenQuick={openQuick} onNeedRefresh={() => setRefreshSignal(s=>s+1)} refreshSignal={refreshSignal} />}
      {page === 'ledger' && <LedgerTab api={api} master={master} refreshSignal={refreshSignal} />}
      {page === 'stats' && <StatsTab api={api} />}
      {page === 'accounting' && <AccountingTab api={api} />}
      {page === 'settings' && <SettingsTab api={api} email={email} master={master} onMasterChange={loadMaster} onLogout={onLogout} />}

      {/* ナビ */}
      <nav id="nav">
        {NAV.map((item, i) => item === null ? (
          <button key="center" className="nb-center" onClick={() => openQuick()}>
            <div className="nb-plus">
              <svg width="26" height="26" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round">
                <line x1="13" y1="6" x2="13" y2="20"/><line x1="6" y1="13" x2="20" y2="13"/>
              </svg>
            </div>
          </button>
        ) : (
          <button key={item.id} className={`nb${page===item.id?' active':''}`} onClick={() => goPage(item.id)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{item.icon}</svg>
            {item.label}
          </button>
        ))}
      </nav>

      {/* オーバーレイ */}
      {quickOpen && <QuickSheet master={master} onClose={()=>setQuickOpen(false)} onSelect={selectPlan} />}
      {payItem   && <PaySheet type={payItem.type} amount={payItem.amount} onClose={()=>setPayItem(null)} onConfirm={confirmSale} />}
      {success   && <SuccessOverlay {...success} />}

      {/* トースト */}
      <Toast message={toast.msg} error={toast.err} onHide={()=>setToast({msg:'',err:false})} />
    </>
  );
}
