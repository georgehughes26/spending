import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getStoredUserId, hashPin, setStoredUserId } from '../lib/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedId = getStoredUserId()
    if (!storedId) {
      setLoading(false)
      return
    }

    supabase
      .from('users')
      .select('id, name, onboarded')
      .eq('id', storedId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setUser(data)
        else setStoredUserId(null)
        setLoading(false)
      })
  }, [])

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
      .select('id, name, onboarded')
      .single()
    if (error) throw new Error(error.message)

    setStoredUserId(data.id)
    setUser(data)
    return data
  }, [])

  const signIn = useCallback(async (name, pin) => {
    const trimmed = name.trim()
    const { data, error } = await supabase
      .from('users')
      .select('id, name, onboarded, pin_hash')
      .ilike('name', trimmed)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) throw new Error('No account with that name. Sign up instead')

    const pin_hash = await hashPin(trimmed, pin)
    if (pin_hash !== data.pin_hash) throw new Error('Incorrect PIN')

    const { pin_hash: _drop, ...safeUser } = data
    setStoredUserId(safeUser.id)
    setUser(safeUser)
    return safeUser
  }, [])

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

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, markOnboarded }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
