// Lightweight name+PIN check — not real authentication. See the caveat in
// supabase/migration_users_and_onboarding.sql. This just stops someone from
// casually opening the app and editing data without knowing the PIN.
export async function hashPin(name, pin) {
  const data = new TextEncoder().encode(`${name.trim().toLowerCase()}:${pin}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

const SESSION_KEY = 'fcc_user_id'

export function getStoredUserId() {
  return localStorage.getItem(SESSION_KEY)
}

export function setStoredUserId(id) {
  if (id) localStorage.setItem(SESSION_KEY, id)
  else localStorage.removeItem(SESSION_KEY)
}
