'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { GET, POST, PUT, DEL } from '@/lib/api'

interface Customer {
  id: number; name: string; phone: string; birthday: string | null; memo: string; created_at: string
}
interface CustomerStat {
  visit_count: string; last_visit: string | null; total_amount: string | null
}
interface MasterItem { id: number; type: string; amount: number }

const EMPTY_FORM = { name: '', phone: '', birthday: '', memo: '' }
const EMPTY_VISIT = { type: '', amount: '' }

export default function CustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [stats, setStats] = useState<Record<number, CustomerStat>>({})
  const [master, setMaster] = useState<MasterItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [visitOpen, setVisitOpen] = useState(false)
  const [visitTarget, setVisitTarget] = useState<Customer | null>(null)
  const [visitForm, setVisitForm] = useState(EMPTY_VISIT)
  const [visitSaving, setVisitSaving] = useState(false)

  const [toast, setToast] = useState('')
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const load = useCallback(async (q = '') => {
    setLoading(true)
    const [cd, sd, md] = await Promise.all([
      GET<{ customers: Customer[] }>('/api/customers', q ? { search: q } : {}),
      GET<{ stats: Record<number, CustomerStat> }>('/api/customers/stats'),
      GET<{ items: MasterItem[] }>('/api/getMaster'),
    ])
    setCustomers(cd.customers || [])
    setStats(sd.stats || {})
    setMaster(md.items || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openAdd() { setEditing(null); setForm(EMPTY_FORM); setEditOpen(true) }
  function openEdit(c: Customer) {
    setEditing(c)
    setForm({ name: c.name, phone: c.phone, birthday: c.birthday ? c.birthday.slice(0, 10) : '', memo: c.memo })
    setEditOpen(true)
  }
  function openVisit(c: Customer) { setVisitTarget(c); setVisitForm(EMPTY_VISIT); setVisitOpen(true) }

  async function handleSave() {
    if (!form.name.trim()) { showToast('名前を入力してください'); return }
    setSaving(true)
    if (editing) { await PUT('/api/customers/' + editing.id, form); showToast('更新しました') }
    else { await POST('/api/customers', form); showToast('登録しました') }
    setSaving(false); setEditOpen(false); load(search)
  }

  async function handleDelete(id: number) {
    await DEL('/api/customers/' + id)
    setDeleteId(null); showToast('削除しました'); load(search)
  }

  async function handleVisit() {
    if (!visitForm.type) { showToast('種別を選択してください'); return }
    setVisitSaving(true)
    const d = await POST<{ success: boolean; message?: string }>('/api/visits', {
      customer_id: visitTarget!.id, type: visitForm.type, amount: visitForm.amount
    })
    setVisitSaving(false)
    if (d.success) { showToast('来院を記録しました'); setVisitOpen(false); load(search) }
    else showToast(d.message || 'エラーが発生しました')
  }

  function fmtBirthday(b: string | null) {
    if (!b) return null
    const d = new Date(b)
    const age = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000))
    return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}（${age}歳）`
  }
  function fmtLastVisit(s: CustomerStat | undefined) {
    if (!s?.last_visit) return null
    const d = new Date(s.last_visit)
    const diff = Math.floor((Date.now() - d.getTime()) / (24 * 3600 * 1000))
    if (diff === 0) return '今日'
    if (diff === 1) return '昨日'
    if (diff < 7) return `${diff}日前`
    return `${d.getMonth()+1}/${d.getDate()}`
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 80, fontFamily: "-apple-system, 'Hiragino Kaku Gothic ProN', sans-serif" }}>
      {/* ヘッダー */}
      <div style={{ background: 'var(--primary)', padding: '20px 16px 16px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ color: '#fff', fontSize: 18, fontWeight: 900, marginBottom: 12 }}>顧客管理</div>
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); load(e.target.value) }}
          placeholder="名前・電話番号で検索"
          style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: 'none', fontSize: 14, background: 'rgba(255,255,255,.15)', color: '#fff', outline: 'none', boxSizing: 'border-box' as const }}
        />
      </div>

      {/* 顧客追加ボタン */}
      <div style={{ padding: '12px 16px 4px' }}>
        <button onClick={openAdd} style={{ width: '100%', background: '#fff', color: 'var(--primary)', border: '2px dashed var(--border)', borderRadius: 12, padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <span style={{ fontSize: 18 }}>＋</span> 顧客を追加
        </button>
      </div>

      <div style={{ padding: '8px 16px', fontSize: 13, color: 'var(--sub)', fontWeight: 600 }}>
        {loading ? '読み込み中...' : `${customers.length}件`}
      </div>

      {/* 顧客リスト */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {!loading && customers.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--sub2)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>顧客がいません</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>「＋ 追加」から登録してください</div>
          </div>
        )}
        {customers.map(c => {
          const st = stats[c.id]
          const lastVisit = fmtLastVisit(st)
          return (
            <div key={c.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(61,35,20,.06)', overflow: 'hidden' }}>
              {/* タップで詳細へ */}
              <button onClick={() => router.push('/app/customers/' + c.id)} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '14px 14px 10px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary)' }}>{c.name}</div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' as const }}>
                      {c.phone && <span style={{ fontSize: 12, color: 'var(--sub)' }}>📞 {c.phone}</span>}
                      {fmtBirthday(c.birthday) && <span style={{ fontSize: 12, color: 'var(--sub)' }}>🎂 {fmtBirthday(c.birthday)}</span>}
                    </div>
                    {c.memo && <div style={{ fontSize: 12, color: 'var(--sub2)', marginTop: 4, background: 'var(--primary-l)', padding: '3px 8px', borderRadius: 6, display: 'inline-block' }}>{c.memo}</div>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                    {st && (
                      <>
                        <div style={{ fontSize: 12, color: 'var(--sub2)' }}>{st.visit_count}回来院</div>
                        {lastVisit && <div style={{ fontSize: 11, color: 'var(--sub2)', marginTop: 2 }}>最終: {lastVisit}</div>}
                      </>
                    )}
                  </div>
                </div>
              </button>

              {/* アクションボタン */}
              <div style={{ display: 'flex', gap: 0, borderTop: '1px solid var(--border)' }}>
                <button onClick={() => openVisit(c)} style={{ flex: 1, background: 'none', border: 'none', borderRight: '1px solid var(--border)', padding: '9px 0', fontSize: 12, fontWeight: 700, color: '#C4622D', cursor: 'pointer' }}>
                  来院登録
                </button>
                <button onClick={() => openEdit(c)} style={{ flex: 1, background: 'none', border: 'none', borderRight: '1px solid var(--border)', padding: '9px 0', fontSize: 12, fontWeight: 700, color: 'var(--sub)', cursor: 'pointer' }}>
                  編集
                </button>
                <button onClick={() => setDeleteId(c.id)} style={{ flex: 1, background: 'none', border: 'none', padding: '9px 0', fontSize: 12, fontWeight: 700, color: '#b91c1c', cursor: 'pointer' }}>
                  削除
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* 来院登録モーダル */}
      {visitOpen && visitTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 20px', width: '100%', maxWidth: 540, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--primary)', marginBottom: 4 }}>来院登録</div>
            <div style={{ fontSize: 13, color: 'var(--sub)', marginBottom: 18 }}>{visitTarget.name}</div>

            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--sub)', marginBottom: 8 }}>種別を選択 *</label>
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8, marginBottom: 16 }}>
              {master.map(m => (
                <button key={m.id} onClick={() => setVisitForm(p => ({ ...p, type: m.type, amount: String(m.amount) }))}
                  style={{ padding: '8px 14px', borderRadius: 10, border: `2px solid ${visitForm.type === m.type ? 'var(--primary)' : 'var(--border)'}`, background: visitForm.type === m.type ? 'var(--primary-l)' : '#fff', color: visitForm.type === m.type ? 'var(--primary)' : 'var(--sub)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  {m.type}<br /><span style={{ fontSize: 11, fontWeight: 500 }}>¥{m.amount.toLocaleString()}</span>
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--sub)', marginBottom: 5 }}>種別（手入力）</label>
                <input type="text" value={visitForm.type} onChange={e => setVisitForm(p => ({ ...p, type: e.target.value }))} placeholder="新規・常連など"
                  style={{ width: '100%', padding: '11px 13px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--sub)', marginBottom: 5 }}>金額</label>
                <input type="number" value={visitForm.amount} onChange={e => setVisitForm(p => ({ ...p, amount: e.target.value }))} placeholder="0"
                  style={{ width: '100%', padding: '11px 13px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setVisitOpen(false)} style={{ flex: 1, background: 'var(--primary-l)', color: 'var(--primary)', border: 'none', borderRadius: 12, padding: 13, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>キャンセル</button>
              <button onClick={handleVisit} disabled={visitSaving} style={{ flex: 2, background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 12, padding: 13, fontSize: 15, fontWeight: 800, cursor: 'pointer', opacity: visitSaving ? .6 : 1 }}>
                {visitSaving ? '登録中...' : '来院を記録する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 顧客追加・編集モーダル */}
      {editOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 20px', width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--primary)', marginBottom: 20 }}>{editing ? '顧客を編集' : '顧客を追加'}</div>
            {([
              { label: '名前 *', key: 'name', type: 'text', placeholder: '山田 太郎' },
              { label: '電話番号', key: 'phone', type: 'tel', placeholder: '090-0000-0000' },
              { label: '生年月日', key: 'birthday', type: 'date', placeholder: '' },
            ] as const).map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--sub)', marginBottom: 5 }}>{f.label}</label>
                <input type={f.type} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                  style={{ width: '100%', padding: '11px 13px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 15, outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
            ))}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--sub)', marginBottom: 5 }}>メモ</label>
              <textarea value={form.memo} onChange={e => setForm(p => ({ ...p, memo: e.target.value }))} placeholder="施術上の注意点など" rows={3}
                style={{ width: '100%', padding: '11px 13px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 14, outline: 'none', resize: 'none', boxSizing: 'border-box' as const }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setEditOpen(false)} style={{ flex: 1, background: 'var(--primary-l)', color: 'var(--primary)', border: 'none', borderRadius: 12, padding: 13, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>キャンセル</button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 2, background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 12, padding: 13, fontSize: 15, fontWeight: 800, cursor: 'pointer', opacity: saving ? .6 : 1 }}>
                {saving ? '保存中...' : (editing ? '更新する' : '登録する')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 削除確認 */}
      {deleteId !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px 24px', width: '100%', maxWidth: 360, textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 10 }}>🗑️</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary)', marginBottom: 8 }}>削除しますか？</div>
            <div style={{ fontSize: 13, color: 'var(--sub)', marginBottom: 24 }}>この操作は取り消せません</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteId(null)} style={{ flex: 1, background: 'var(--primary-l)', color: 'var(--primary)', border: 'none', borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>キャンセル</button>
              <button onClick={() => handleDelete(deleteId)} style={{ flex: 1, background: '#b91c1c', color: '#fff', border: 'none', borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>削除する</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', background: '#3D2314', color: '#fff', padding: '10px 20px', borderRadius: 100, fontSize: 13, fontWeight: 700, zIndex: 200, whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
