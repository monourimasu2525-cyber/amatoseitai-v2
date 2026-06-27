const EMAIL_KEY = 'auth_email'

export function getEmail(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(EMAIL_KEY)
}

export function setAuth(_token: string, email: string): void {
  // tokenはhttpOnly Cookieに移行済み。emailのみUI表示用に保持
  localStorage.setItem(EMAIL_KEY, email)
}

export function clearAuth(): void {
  localStorage.removeItem(EMAIL_KEY)
}

export function isLoggedIn(): boolean {
  // CookieはJSから読めないためemailの存在でソフトチェック
  // 実際の認証はCookieでサーバー側が判定する
  return !!getEmail()
}
