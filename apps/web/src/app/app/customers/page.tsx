'use client'

import { useState, useEffect, useCallback } from 'react'
import { GET, POST, PUT, DEL } from '@/lib/api'

interface Customer {
  id: number
  name: string
  phone: string
  birthday: string | null
  memo: string
  created_at: string
}

const EMPTY = { name: '', phone: '', birthday: '', memo: '' }

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const load = useCallback(async (q = '') => {
    setLoading(true)
    const d = await GET<{ success: boolean; customers: Customer[] }>('/api/customers', q ? { search: q } : {})
    setCustomers(d.customers || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openAdd() { setEditing(null); setForm(EMPTY); setModalOpen(true) }
  function openEdit(c: Customer) {
    setEditing(c)
    setForm({ name: c.name, phone: c.phone, birthday: c.birthday ? c.birthday.slice(0, 10) : '', memo: c.memo })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { showToast('名前を入力してください'); return }
    setSaving(true)
    if (editing) {
      await PUT('/api/customers/' + editing.id, form)
      showToast('更新しました')
    } else {
      await POST('/api/customers', form)
      showToast('登録しました')
    }
    setSaving(false)
    setModalOpen(false)
    load(search)
  }

  async function handleDelete(id: number) {
    await DEL('/api/customers/' + id)
    setDeleteId(null)
    showToast('削除しました')
    load(search)
  }

  function fmtBirthday(b: string | null) {
    if (!b) return '—'
    const d = new Date(b)
    const age = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000))
    return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}（${age}歳）`
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 80, fontFamily: "-apple-system, 'Hiragino Kaku Gothic ProN', sans-serif" }}>
      {/* ヘッダー */}
      <div style={{ background: 'var(--primary)', padding: '20px 16px 16px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ color: '#fff', fontSize: 18, fontWeight: 900, marginBottom: 12 }}>顧客管理</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); load(e.target.value) }}
            placeholder="名前・電話番号で検索"
            style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: 'none', fontSize: 14, background: 'rgba(255,255,255,.15)', color: '#fff', outline: 'none' }}
          />
          <button onClick={openAdd} style={{ background: '#C4622D', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            ＋ 追加
          </button>
        </div>
      </div>

      {/* 件数 */}
      <div style={{ padding: '10px 16px', fontSize: 13, color: 'var(--sub)', fontWeight: 600 }}>
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
        {customers.map(c => (
          <div key={c.id} style={{ background: '#fff', borderRadius: 14, padding: '16px', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(61,35,20,.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary)', marginBottom: 4 }}>{c.name}</div>
                {c.phone && <div style={{ fontSize: 13, color: 'var(--sub)', marginBottom: 2 }}>📞 {c.phone}</div>}
                {c.birthday && <div style={{ fontSize: 13, color: 'var(--sub)', marginBottom: 2 }}>🎂 {fmtBirthday(c.birthday)}</div>}
                {c.memo && <div style={{ fontSize: 13, color: 'var(--sub2)', marginTop: 4, background: 'var(--primary-l)', padding: '5px 10px', borderRadius: 7 }}>{c.memo}</div>}
              </div>
              <div style={{ display: 'flex', gap: 6, marginLeft: 10, flexShrink: 0 }}>
                <button onClick={() => openEdit(c)} style={{ background: 'var(--primary-l)', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, color: 'var(--primary)', cursor: 'pointer' }}>編集</button>
                <button onClick={() => setDeleteId(c.id)} style={{ background: '#FEF2F2', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, color: '#b91c1c', cursor: 'pointer' }}>削除</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 追加・編集モーダル */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 20px', width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--primary)', marginBottom: 20 }}>
              {editing ? '顧客を編集' : '顧客を追加'}
            </div>
            {[
              { label: '名前 *', key: 'name', type: 'text', placeholder: '山田 太郎' },
              { label: '電話番号', key: 'phone', type: 'tel', placeholder: '090-0000-0000' },
              { label: '生年月日', key: 'birthday', type: 'date', placeholder: '' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--sub)', marginBottom: 5 }}>{f.label}</label>
                <input
                  type={f.type}
                  value={form[f.key as keyof typeof form]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  style={{ width: '100%', padding: '11px 13px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 15, outline: 'none', boxSizing: 'border-box' as const }}
                />
              </div>
            ))}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--sub)', marginBottom: 5 }}>メモ</label>
              <textarea
                value={form.memo}
                onChange={e => setForm(p => ({ ...p, memo: e.target.value }))}
                placeholder="施術上の注意点など"
                rows={3}
                style={{ width: '100%', padding: '11px 13px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 14, outline: 'none', resize: 'none', boxSizing: 'border-box' as const }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModalOpen(false)} style={{ flex: 1, background: 'var(--primary-l)', color: 'var(--primary)', border: 'none', borderRadius: 12, padding: 13, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>キャンセル</button>
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

      {/* トースト */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', background: '#3D2314', color: '#fff', padding: '10px 20px', borderRadius: 100, fontSize: 13, fontWeight: 700, zIndex: 200, whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
