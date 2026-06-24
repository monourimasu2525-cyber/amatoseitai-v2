'use client';
import { useState } from 'react';

function fmt(n) { return '¥' + Number(n).toLocaleString(); }

export default function QuickSheet({ master, onClose, onSelect }) {
  return (
    <div id="quick-overlay" className="open" onClick={e => e.target.id === 'quick-overlay' && onClose()}>
      <div className="quick-sheet">
        <div className="sheet-handle" />
        <div className="sheet-title">クイック入力</div>
        <div className="sheet-plans" id="sheet-plans">
          {master.map((item, i) => (
            <button key={item.id} className={`splan${i > 0 ? ' sec' : ''}`} onClick={() => onSelect(item.type, item.amount)}>
              <span className="splan-name">{item.type}</span>
              <span className="splan-amt">{fmt(item.amount)}</span>
            </button>
          ))}
        </div>
        <button className="sheet-cancel" onClick={onClose}>キャンセル</button>
      </div>
    </div>
  );
}

export function PaySheet({ type, amount, onClose, onConfirm }) {
  function fmt(n) { return '¥' + Number(n).toLocaleString(); }
  return (
    <div id="pay-overlay" className="open" onClick={e => e.target.id === 'pay-overlay' && onClose()}>
      <div className="pay-sheet">
        <div className="sheet-handle" />
        <div className="pay-plan-info">
          <div className="pay-plan-name">{type}</div>
          <div className="pay-plan-amt">{fmt(amount)}</div>
        </div>
        <div className="pay-methods">
          {[['💵','現金'],['💳','カード'],['📱','PayPay']].map(([icon, label]) => (
            <button key={label} className="pay-btn" onClick={() => onConfirm(label)}>
              <div className="pay-icon">{icon}</div>
              <div className="pay-lbl">{label}</div>
            </button>
          ))}
        </div>
        <button className="pay-cancel" onClick={onClose}>キャンセル</button>
      </div>
    </div>
  );
}

export function SuccessOverlay({ type, amount, method }) {
  return (
    <div id="success-overlay" className="show">
      <div className="success-icon">✓</div>
      <div className="success-method">{type}　{method}</div>
      <div className="success-amt">{fmt(amount)}</div>
    </div>
  );
}
