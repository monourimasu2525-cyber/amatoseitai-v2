import { clearAuth } from './auth'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://amatoseitai-v2-production.up.railway.app'

const FETCH_OPTS: RequestInit = {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
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
  const res = await fetch(API + path + params, FETCH_OPTS)
  return handleResponse<T>(res)
}

export async function POST<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(API + path, { ...FETCH_OPTS, method: 'POST', body: JSON.stringify(body) })
  return handleResponse<T>(res)
}

export async function PUT<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(API + path, { ...FETCH_OPTS, method: 'PUT', body: JSON.stringify(body) })
  return handleResponse<T>(res)
}

export async function DEL<T>(path: string): Promise<T> {
  const res = await fetch(API + path, { ...FETCH_OPTS, method: 'DELETE' })
  return handleResponse<T>(res)
}

export function getCsvUrl(params: Record<string, string | number> = {}): string {
  // CookieがSameSite=noneで送られるため tokenパラメータ不要
  return API + '/api/getCsv?' + new URLSearchParams(params as Record<string, string>)
}
