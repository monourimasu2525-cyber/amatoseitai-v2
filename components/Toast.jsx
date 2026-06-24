'use client';
import { useEffect, useRef } from 'react';

export default function Toast({ message, error, onHide }) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (!message) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(onHide, 3000);
    return () => clearTimeout(timerRef.current);
  }, [message]);

  return (
    <div
      id="toast"
      className={message ? 'show' : ''}
      style={{ background: error ? '#b91c1c' : '#3D2314' }}
    >
      {message}
    </div>
  );
}
