import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function SignInPage() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('signin')
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const user = mode === 'signin' ? await signIn(name, pin) : await signUp(name, pin)
      navigate(user.onboarded ? '/' : '/onboarding')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-300">
          Financial Command Centre
        </h1>
        <p className="mb-8 text-center text-sm text-zinc-500">
          {mode === 'signin' ? 'Sign in to your account' : 'Create your account'}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl border border-pink-900/30 bg-zinc-900/60 p-6">
          <label className="text-sm">
            <span className="mb-1 block text-zinc-400">Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. George"
              autoFocus
              className="min-h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-pink-600"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-zinc-400">4-digit PIN</span>
            <input
              type="password"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••"
              className="min-h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 tracking-[0.3em] text-zinc-100 outline-none focus:border-pink-600"
            />
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !name.trim() || pin.length !== 4}
            className="min-h-11 cursor-pointer rounded-lg bg-pink-600 px-4 py-2.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-pink-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode((m) => (m === 'signin' ? 'signup' : 'signin'))
              setError(null)
            }}
            className="min-h-11 cursor-pointer text-sm text-zinc-500 transition-colors duration-150 hover:text-zinc-300"
          >
            {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
