import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getStoredUserId, hashPin, setStoredUserId } from '../lib/auth'

const AuthContext = createContext(null)
const THEME_KEY = 'layla_theme'
const USER_COLUMNS = 'id, name, onboarded, theme, resale_access, running_access'

function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

function readStoredTheme() {
  return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'pink'
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [theme, setThemeState] = useState(readStoredTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const syncThemeFromUser = useCallback((userTheme) => {
    const next = userTheme === 'dark' ? 'dark' : 'pink'
    localStorage.setItem(THEME_KEY, next)
    setThemeState(next)
  }, [])

  useEffect(() => {
    const storedId = getStoredUserId()
    if (!storedId) {
      setLoading(false)
      return
    }

    supabase
      .from('users')
      .select(USER_COLUMNS)
      .eq('id', storedId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setUser(data)
          syncThemeFromUser(data.theme)
        } else {
          setStoredUserId(null)
        }
        setLoading(false)
      })
  }, [syncThemeFromUser])

  const signUp = useCallback(async (name, pin) => {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Enter a name')
    if (!/^\d{4}$/.test(pin)) throw new Error('PIN must be 4 digits')

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .ilike('name', trimmed)
      .maybeSingle()
    if (existing) throw new Error('That name is already signed up. Try signing in instead')

    const pin_hash = await hashPin(trimmed, pin)
    const { data, error } = await supabase
      .from('users')
      .insert({ name: trimmed, pin_hash })
      .select(USER_COLUMNS)
      .single()
    if (error) throw new Error(error.message)

    setStoredUserId(data.id)
    setUser(data)
    syncThemeFromUser(data.theme)
    return data
  }, [syncThemeFromUser])

  const signIn = useCallback(async (name, pin) => {
    const trimmed = name.trim()
    const { data, error } = await supabase
      .from('users')
      .select(`${USER_COLUMNS}, pin_hash`)
      .ilike('name', trimmed)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) throw new Error('No account with that name. Sign up instead')

    const pin_hash = await hashPin(trimmed, pin)
    if (pin_hash !== data.pin_hash) throw new Error('Incorrect PIN')

    const { pin_hash: _drop, ...safeUser } = data
    setStoredUserId(safeUser.id)
    setUser(safeUser)
    syncThemeFromUser(safeUser.theme)
    return safeUser
  }, [syncThemeFromUser])

  const signOut = useCallback(() => {
    setStoredUserId(null)
    setUser(null)
  }, [])

  const markOnboarded = useCallback(async () => {
    if (!user) return
    const { error } = await supabase.from('users').update({ onboarded: true }).eq('id', user.id)
    if (error) throw new Error(error.message)
    setUser((prev) => ({ ...prev, onboarded: true }))
  }, [user])

  const setTheme = useCallback(async (next) => {
    localStorage.setItem(THEME_KEY, next)
    setThemeState(next)
    if (user) {
      const { error } = await supabase.from('users').update({ theme: next }).eq('id', user.id)
      if (error) throw new Error(error.message)
      setUser((prev) => ({ ...prev, theme: next }))
    }
  }, [user])

  return (
    <AuthContext.Provider
      value={{ user, loading, theme, setTheme, signUp, signIn, signOut, markOnboarded }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
