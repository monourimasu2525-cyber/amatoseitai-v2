import { getToken, clearAuth } from './auth'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://amatoseitai-v2-production.up.railway.app'

function getHeaders(): Record<string, string> {
  const token = getToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    clearAuth()
    window.location.href = '/login'
    throw new Error('認証切れ')
  }
  return res.json()
}

export async function GET<T>(path: string, query: Record<string, string | number> = {}): Promise<T> {
  const params = Object.keys(query).length ? '?' + new URLSearchParams(query as Record<string, string>) : ''
  const res = await fetch(API + path + params, { headers: getHeaders() })
  return handleResponse<T>(res)
}

export async function POST<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(API + path, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  })
  return handleResponse<T>(res)
}

export async function PUT<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(API + path, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(body),
  })
  return handleResponse<T>(res)
}

export async function DEL<T>(path: string): Promise<T> {
  const res = await fetch(API + path, { method: 'DELETE', headers: getHeaders() })
  return handleResponse<T>(res)
}

export function getCsvUrl(params: Record<string, string | number> = {}): string {
  const token = getToken()
  const all = { ...params, ...(token ? { token } : {}) }
  return API + '/api/getCsv?' + new URLSearchParams(all as Record<string, string>)
}
