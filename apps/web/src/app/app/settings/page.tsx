'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { GET, POST, PUT, DEL, getCsvUrl } from '@/lib/api'
import { getEmail, clearAuth } from '@/lib/auth'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://amatoseitai-v2-production.up.railway.app'
import type { MasterItem } from '@/types'

const fmt = (n: number) => '¥' + Number(n).toLocaleString()

const DEFAULT_CHANNELS = ['ホームページ', 'チラシ', '紹介', 'その他']

interface Channel { id: number; name: string }

export default function SettingsPage() {
  const router = useRouter()
  const [master, setMaster] = useState<MasterItem[]>([])
  const [newType, setNewType] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState(0)
  const [editType, setEditType] = useState('')
  const [editAmount, setEditAmount] = useState(0)
  const [editDesc, setEditDesc] = useState('')
  const [importResult, setImportResult] = useState<{ msg: string; ok: boolean } | null>(null)
  const [toastMsg, setToastMsg] = useState('')
  const [toastErr, setToastErr] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const importAreaRef = useRef<HTMLDivElement>(null)

  // 院設定
  const [clinicName, setClinicName] = useState('')
  const [dailyCapacity, setDailyCapacity] = useState('')
  const [clinicSaving, setClinicSaving] = useState(false)

  // 広告媒体
  const [channels, setChannels] = useState<Channel[]>([])
  const [newChannel, setNewChannel] = useState('')

  const email = getEmail()
  const now = new Date()
  const [csvYear, setCsvYear] = useState(now.getFullYear())
  const [csvMonth, setCsvMonth] = useState(now.getMonth() + 1)
  const years = Array.from({ length: 4 }, (_, i) => now.getFullYear() - i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  function toast(msg: string, err = false) {
    setToastMsg(msg); setToastErr(err)
    setTimeout(() => setToastMsg(''), 3000)
  }

  async function loadMaster() {
    try {
      const d = await GET<{ items: MasterItem[] }>('/api/getMaster')
      setMaster(d.items || [])
    } catch { toast('マスタ取得エラー', true) }
  }

  async function loadClinic() {
    const d = await GET<{ clinic: { name: string; daily_capacity: number } | null }>('/api/clinics/me')
    if (d.clinic) { setClinicName(d.clinic.name); setDailyCapacity(String(d.clinic.daily_capacity || 11)) }
  }

  async function loadChannels() {
    const d = await GET<{ channels: Channel[] }>('/api/advertising-channels')
    setChannels(d.channels || [])
  }

  useEffect(() => { loadMaster(); loadClinic(); loadChannels() }, [])

  async function saveClinic() {
    if (!clinicName.trim()) { toast('院名を入力してください', true); return }
    setClinicSaving(true)
    const r = await PUT<{ success: boolean; message?: string }>('/api/clinics/me', { name: clinicName, daily_capacity: parseInt(dailyCapacity) || 11 })
    setClinicSaving(false)
    if (r.success) toast('保存しました') else toast(r.message || 'エラー', true)
  }

  async function addChannel(name: string) {
    if (!name.trim()) { toast('媒体名を入力してください', true); return }
    const r = await POST<{ success: boolean; message?: string }>('/api/advertising-channels', { name })
    if (r.success) { setNewChannel(''); loadChannels() } else toast(r.message || 'エラー', true)
  }

  async function deleteChannel(id: number, name: string) {
    if (!confirm(`「${name}」を削除しますか？\n紐付いた顧客の媒体情報もクリアされます。`)) return
    await DEL('/api/advertising-channels/' + id)
    loadChannels()
  }

  async function addMaster() {
    if (!newType || !newAmount) { toast('種別名と金額は必須です', true); return }
    const r = await POST<{ success: boolean; message: string }>('/api/addMaster', { type: newType, amount: parseInt(newAmount), description: newDesc })
    if (r.success) {
      toast('マスタを追加しました')
      setNewType(''); setNewAmount(''); setNewDesc('')
      loadMaster()
    } else toast(r.message, true)
  }

  async function deleteMaster(id: number, type: string) {
    if (!confirm(`「${type}」を削除しますか？`)) return
    const r = await DEL<{ success: boolean; message: string }>('/api/deleteMaster/' + id)
    if (r.success) { toast('削除しました'); loadMaster() } else toast(r.message, true)
  }

  async function saveEditMaster() {
    if (!editType || !editAmount) { toast('全項目を入力してください', true); return }
    const r = await PUT<{ success: boolean; message: string }>('/api/updateMaster/' + editId, { type: editType, amount: editAmount, description: editDesc })
    if (r.success) { toast('更新しました'); setEditOpen(false); loadMaster() } else toast(r.message, true)
  }

  async function handleCsvFile(file: File) {
    setImportResult({ msg: 'インポート中…', ok: true })
    const form = new FormData()
    form.append('file', file)
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || '') + '/api/importCsv', {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
      })
      const data = await res.json()
      setImportResult({ msg: data.message, ok: data.success })
    } catch {
      setImportResult({ msg: 'インポートに失敗しました', ok: false })
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="page">
      <div className="ph"><h1>設定</h1></div>
      <div className="wrap">

        <div className="stitle">院設定</div>
        <div className="card cp gap">
          <div className="fg"><label className="fl">院名</label><input type="text" className="fc" value={clinicName} onChange={e => setClinicName(e.target.value)} placeholder="例：あまと整体院" /></div>
          <div className="fg">
            <label className="fl">1日の施術枠数</label>
            <input type="number" className="fc" value={dailyCapacity} onChange={e => setDailyCapacity(e.target.value)} placeholder="例：11" inputMode="numeric" />
            <div style={{ fontSize: 11, color: 'var(--sub2)', marginTop: 4 }}>稼働率の計算に使用（例：11時間営業なら11）</div>
          </div>
          <button className="btn btn-p btn-w" onClick={saveClinic} disabled={clinicSaving}>{clinicSaving ? '保存中…' : '保存する'}</button>
        </div>

        <div className="stitle">広告媒体マスター</div>
        <div className="card cp gap">
          <div style={{ fontSize: 12, color: 'var(--sub)', marginBottom: 8 }}>集客媒体を登録しておくと、顧客登録時に選択できます</div>
          {channels.length === 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--sub2)', marginBottom: 8 }}>デフォルトをまとめて追加：</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {DEFAULT_CHANNELS.map(n => (
                  <button key={n} className="btn btn-s btn-sm" onClick={() => addChannel(n)}>{n}</button>
                ))}
              </div>
            </div>
          )}
          {channels.map(ch => (
            <div key={ch.id} className="li">
              <span style={{ flex: 1, fontWeight: 700, fontSize: 14 }}>{ch.name}</span>
              <button className="db" onClick={() => deleteChannel(ch.id, ch.name)}>✕</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <input type="text" className="fc" style={{ flex: 1 }} value={newChannel} onChange={e => setNewChannel(e.target.value)} placeholder="媒体名を入力（例：Instagram）" onKeyDown={e => e.key === 'Enter' && addChannel(newChannel)} />
            <button className="btn btn-p btn-sm" onClick={() => addChannel(newChannel)}>追加</button>
          </div>
        </div>

        <div className="stitle">アカウント</div>
        <div className="card cp gap">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>{email}</div>
              <div style={{ fontSize: 12, color: 'var(--sub2)', marginTop: 2 }}>ログイン中</div>
            </div>
            <button className="btn btn-d btn-sm" onClick={async () => {
              await fetch(`${API}/api/logout`, { method: 'POST', credentials: 'include' })
              clearAuth()
              router.push('/login')
            }}>ログアウト</button>
          </div>
        </div>

        <div className="stitle">マスタ追加</div>
        <div className="card cp gap">
          <div className="fg"><label className="fl">種別名</label><input type="text" className="fc" value={newType} onChange={e => setNewType(e.target.value)} placeholder="例：新規、常連" /></div>
          <div className="fg"><label className="fl">金額</label><input type="number" className="fc" value={newAmount} onChange={e => setNewAmount(e.target.value)} placeholder="例：3270" inputMode="numeric" /></div>
          <div className="fg"><label className="fl">備考（任意）</label><input type="text" className="fc" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="メモ" /></div>
          <button className="btn btn-p btn-w" onClick={addMaster}>追加する</button>
        </div>

        <div className="stitle">マスタ一覧</div>
        <div className="card gap">
          <div style={{ padding: '0 16px' }}>
            {master.length === 0
              ? <div style={{ padding: 16, textAlign: 'center', color: 'var(--sub2)' }}>マスタが空です</div>
              : master.map(item => (
                <div key={item.id} className="li">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{item.type}</div>
                    <div style={{ fontSize: 12, color: 'var(--sub)', marginTop: 2 }}>{fmt(item.amount)}{item.description ? ' · ' + item.description : ''}</div>
                  </div>
                  <button className="ib" onClick={() => { setEditId(item.id); setEditType(item.type); setEditAmount(item.amount); setEditDesc(item.description || ''); setEditOpen(true) }}>編集</button>
                  <button className="db" onClick={() => deleteMaster(item.id, item.type)}>✕</button>
                </div>
              ))}
          </div>
        </div>

        <div className="stitle">経理レポート</div>
        <div className="card cp gap">
          <div style={{ fontSize: 13, color: 'var(--sub)', marginBottom: 12 }}>月次レポートの確認・CSV出力ができます</div>
          <button className="btn btn-p btn-w" onClick={() => router.push('/app/accounting')}>経理レポートを開く</button>
        </div>

        <div className="stitle">CSVエクスポート</div>
        <div className="card cp gap">
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 12 }}>
            <div style={{ flex: 1 }}><label className="fl">年</label>
              <select className="fc" value={csvYear} onChange={e => setCsvYear(Number(e.target.value))}>
                {years.map(y => <option key={y} value={y}>{y}年</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}><label className="fl">月</label>
              <select className="fc" value={csvMonth} onChange={e => setCsvMonth(Number(e.target.value))}>
                {months.map(m => <option key={m} value={m}>{m}月</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-s btn-sm" onClick={() => window.open(getCsvUrl({ year: csvYear, month: csvMonth }))}>月別CSV</button>
            <button className="btn btn-s btn-sm" onClick={() => window.open(getCsvUrl())}>全データCSV</button>
          </div>
        </div>

        <div className="stitle">CSVインポート</div>
        <div className="card cp gap">
          <div style={{ fontSize: 12, color: 'var(--sub)', marginBottom: 12 }}>形式：日付,種別,金額（例: 2024/6/1,新規,3270）</div>
          <div
            ref={importAreaRef}
            className="import-area"
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); importAreaRef.current?.classList.add('dragover') }}
            onDragLeave={() => importAreaRef.current?.classList.remove('dragover')}
            onDrop={e => { e.preventDefault(); importAreaRef.current?.classList.remove('dragover'); const f = e.dataTransfer.files[0]; if (f) handleCsvFile(f) }}
          >
            <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleCsvFile(f) }} />
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--sub2)" strokeWidth="1.5" style={{ marginBottom: 8 }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--sub)', marginBottom: 4 }}>CSVファイルを選択</div>
            <div style={{ fontSize: 12, color: 'var(--sub2)' }}>またはここにドロップ</div>
          </div>
          {importResult && <div className={`import-result ${importResult.ok ? 'ok' : 'err'}`}>{importResult.msg}</div>}
        </div>
      </div>

      {editOpen && (
        <div className="modal" onClick={() => setEditOpen(false)}>
          <div className="mbox" onClick={e => e.stopPropagation()}>
            <div className="mtitle">マスタを編集</div>
            <div className="fg"><label className="fl">種別名</label><input type="text" className="fc" value={editType} onChange={e => setEditType(e.target.value)} /></div>
            <div className="fg"><label className="fl">金額</label><input type="number" className="fc" value={editAmount} onChange={e => setEditAmount(Number(e.target.value))} inputMode="numeric" /></div>
            <div className="fg"><label className="fl">備考</label><input type="text" className="fc" value={editDesc} onChange={e => setEditDesc(e.target.value)} /></div>
            <div className="mfoot">
              <button className="btn btn-s" style={{ flex: 1 }} onClick={() => setEditOpen(false)}>キャンセル</button>
              <button className="btn btn-p" style={{ flex: 2 }} onClick={saveEditMaster}>保存する</button>
            </div>
          </div>
        </div>
      )}

      {toastMsg && <div className="toast" style={{ background: toastErr ? '#b91c1c' : '#3D2314' }}>{toastMsg}</div>}
    </div>
  )
}
