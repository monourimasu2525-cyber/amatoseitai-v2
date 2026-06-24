'use client';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

function headers() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` };
}

async function request(method, path, body, onUnauth) {
  const opts = { method, headers: headers() };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  if (res.status === 401) { onUnauth?.(); throw new Error('認証切れ'); }
  return res.json();
}

export function createApi(onUnauth) {
  return {
    get:    (path, params) => request('GET', path + (params ? '?' + new URLSearchParams(params) : ''), null, onUnauth),
    post:   (path, body)   => request('POST',   path, body,  onUnauth),
    put:    (path, body)   => request('PUT',    path, body,  onUnauth),
    delete: (path)         => request('DELETE', path, null,  onUnauth),
    csvUrl: (params)       => `/api/csv?${new URLSearchParams({ ...params, token: getToken() })}`,
  };
}
