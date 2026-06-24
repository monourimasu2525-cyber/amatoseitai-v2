'use client';
import { useState, useRef } from 'react';

function fmt(n) { return '¥' + Number(n || 0).toLocaleString(); }

export default function SettingsTab({ api, email, master, onMasterChange, onLogout }) {
  const [newType, setNewType] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [editModal, setEditModal] = useState(null);
  const [editType, setEditType] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);

  async function addMaster() {
    if (!newType || !newAmount) { alert('種別名と金額は必須です'); return; }
    const r = await api.post('/api/master', { type: newType, amount: parseInt(newAmount), description: newDesc });
    if (r.success) { setNewType(''); setNewAmount(''); setNewDesc(''); onMasterChange(); }
    else alert(r.message);
  }

  async function confirmEdit() {
    if (!editType || !editAmount) return;
    const r = await api.put(`/api/master/${editModal}`, { type: editType, amount: parseInt(editAmount), description: editDesc });
    if (r.success) { setEditModal(null); onMasterChange(); }
    else alert(r.message);
  }

  async function deleteMaster(id, type) {
    if (!confirm(`「${type}」を削除しますか？`)) return;
    const r = await api.delete(`/api/master/${id}`);
    if (r.success) onMasterChange();
    else alert(r.message);
  }

  async function importCsv(file) {
    if (!file) return;
    setImporting(true); setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/csv', { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }, body: formData });
      const r = await res.json();
      setImportResult({ ok: r.success, msg: r.message });
    } catch { setImportResult({ ok: false, msg: 'インポートに失敗しました' }); }
    setImporting(false);
  }

  return (
    <div id="page-settings" className="page active">
      <div className="ph"><h1>設定</h1></div>
      <div className="wrap">
        {/* アカウント */}
        <div className="card cp gap">
          <div className="stitle">アカウント</div>
          <div style={{fontSize:'14px',color:'var(--sub)',marginBottom:'14px'}}>ログイン中: <strong>{email}</strong></div>
          <button className="btn btn-d btn-w" onClick={onLogout}>ログアウト</button>
        </div>

        {/* マスタ追加 */}
        <div className="card cp gap">
          <div className="stitle" style={{marginBottom:'12px'}}>マスタ追加</div>
          <div className="fg"><label className="fl">種別名</label><input type="text" className="fc" value={newType} onChange={e=>setNewType(e.target.value)} placeholder="例：新規" /></div>
          <div className="fg"><label className="fl">金額</label><input type="number" className="fc" value={newAmount} onChange={e=>setNewAmount(e.target.value)} placeholder="例：3270" /></div>
          <div className="fg"><label className="fl">メモ（任意）</label><input type="text" className="fc" value={newDesc} onChange={e=>setNewDesc(e.target.value)} placeholder="補足など" /></div>
          <button className="btn btn-p btn-w" onClick={addMaster}>追加する</button>
        </div>

        {/* マスタ一覧 */}
        <div className="card gap" id="master-list">
          {!master.length
            ? <div style={{padding:'16px',textAlign:'center',color:'var(--sub2)'}}>マスタが空です</div>
            : master.map(item=>(
                <div key={item.id} className="li">
                  <div style={{flex:1}}>
                    <div style={{fontWeight:800,fontSize:'15px'}}>{item.type}</div>
                    <div style={{fontSize:'12px',color:'var(--sub)',marginTop:'2px'}}>{fmt(item.amount)}{item.description?` · ${item.description}`:''}</div>
                  </div>
                  <button className="ib" style={{marginRight:'4px'}} onClick={()=>{setEditModal(item.id);setEditType(item.type);setEditAmount(String(item.amount));setEditDesc(item.description||'');}}>編集</button>
                  <button className="db" onClick={()=>deleteMaster(item.id,item.type)}>✕</button>
                </div>
              ))
          }
        </div>

        {/* CSVインポート */}
        <div className="card cp">
          <div className="stitle" style={{marginBottom:'10px'}}>CSVインポート</div>
          <div
            className="import-area"
            onClick={()=>fileRef.current?.click()}
            onDragOver={e=>{e.preventDefault();e.currentTarget.classList.add('dragover');}}
            onDragLeave={e=>e.currentTarget.classList.remove('dragover')}
            onDrop={e=>{e.preventDefault();e.currentTarget.classList.remove('dragover');const f=e.dataTransfer.files[0];if(f)importCsv(f);}}
          >
            <input ref={fileRef} type="file" accept=".csv" onChange={e=>{if(e.target.files[0])importCsv(e.target.files[0]);}} style={{display:'none'}} />
            <div style={{fontSize:'32px',marginBottom:'8px'}}>📂</div>
            <div style={{fontSize:'14px',fontWeight:700,color:'var(--primary)'}}>CSVファイルを選択</div>
            <div style={{fontSize:'12px',color:'var(--sub)',marginTop:'4px'}}>またはドラッグ&ドロップ</div>
          </div>
          {importing && <div style={{textAlign:'center',color:'var(--sub)',fontSize:'13px'}}>インポート中…</div>}
          {importResult && <div className={`import-result ${importResult.ok?'ok':'err'}`}>{importResult.msg}</div>}
        </div>
      </div>

      {editModal && (
        <div className="modal open" onClick={e=>e.currentTarget===e.target&&setEditModal(null)}>
          <div className="mbox">
            <div className="mtitle">マスタを編集</div>
            <div className="fg"><label className="fl">種別名</label><input type="text" className="fc" value={editType} onChange={e=>setEditType(e.target.value)} /></div>
            <div className="fg"><label className="fl">金額</label><input type="number" className="fc" value={editAmount} onChange={e=>setEditAmount(e.target.value)} /></div>
            <div className="fg"><label className="fl">メモ</label><input type="text" className="fc" value={editDesc} onChange={e=>setEditDesc(e.target.value)} /></div>
            <div className="mfoot">
              <button className="btn btn-s" style={{flex:1}} onClick={()=>setEditModal(null)}>キャンセル</button>
              <button className="btn btn-p" style={{flex:1}} onClick={confirmEdit}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
