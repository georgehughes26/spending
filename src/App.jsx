import { Navigate, NavLink, Route, HashRouter as Router, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import DashboardPage from './pages/DashboardPage'
import DataEntryPage from './pages/DataEntryPage'
import SettingsPage from './pages/SettingsPage'
import SignInPage from './pages/SignInPage'
import OnboardingPage from './pages/OnboardingPage'
import ResalePage from './pages/ResalePage'
import BankPage from './pages/BankPage'
import BankCallbackPage from './pages/BankCallbackPage'

const navLinkClass = ({ isActive }) =>
  `flex min-h-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border px-3 text-sm font-medium transition-colors duration-150 sm:justify-start sm:border-none ${
    isActive
      ? 'border-pink-600 dark:border-emerald-400 bg-pink-600 dark:bg-emerald-400 text-white dark:text-zinc-950'
      : 'border-pink-200 dark:border-white/10 bg-white/70 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 hover:text-pink-700 dark:hover:text-emerald-400 sm:bg-transparent'
  }`

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <p className="mx-auto max-w-7xl px-6 py-6 text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
  if (!user) return <Navigate to="/signin" replace />
  if (!user.onboarded) return <Navigate to="/onboarding" replace />
  return children
}

function RequireResaleAccess({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <p className="mx-auto max-w-7xl px-6 py-6 text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
  if (!user) return <Navigate to="/signin" replace />
  if (!user.onboarded) return <Navigate to="/onboarding" replace />
  if (!user.resale_access) return <Navigate to="/" replace />
  return children
}

function RequireSignedIn({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <p className="mx-auto max-w-7xl px-6 py-6 text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
  if (!user) return <Navigate to="/signin" replace />
  return children
}

function Shell({ children }) {
  const { user, signOut } = useAuth()
  return (
    <div className="min-h-svh">
      <header className="border-b border-pink-200 dark:border-white/10 py-4 sm:py-5">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div>
            <h1 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 dark:from-emerald-400 to-rose-600 dark:to-teal-300">
              Layla
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Smart Spending Management</p>
          </div>
          <nav className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <NavLink to="/" end className={navLinkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/entry" className={navLinkClass}>
              Data Entry
            </NavLink>
            <NavLink to="/settings" className={navLinkClass}>
              Settings
            </NavLink>
            {user?.resale_access && (
              <NavLink to="/resale" className={navLinkClass}>
                Reselling
              </NavLink>
            )}
            {user && (
              <button
                type="button"
                onClick={signOut}
                className="flex min-h-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-pink-200 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 text-sm font-medium text-zinc-500 dark:text-zinc-400 transition-colors duration-150 hover:text-red-600 dark:hover:text-red-400 sm:justify-start sm:border-none sm:bg-transparent"
              >
                Sign out
              </button>
            )}
          </nav>
        </div>
      </header>
      {children}
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/signin" element={<SignInPage />} />
      <Route
        path="/onboarding"
        element={
          <RequireSignedIn>
            <OnboardingPage />
          </RequireSignedIn>
        }
      />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Shell><DashboardPage /></Shell>
          </RequireAuth>
        }
      />
      <Route
        path="/entry"
        element={
          <RequireAuth>
            <Shell><DataEntryPage /></Shell>
          </RequireAuth>
        }
      />
      <Route
        path="/settings"
        element={
          <RequireAuth>
            <Shell><SettingsPage /></Shell>
          </RequireAuth>
        }
      />
      <Route
        path="/resale"
        element={
          <RequireResaleAccess>
            <Shell><ResalePage /></Shell>
          </RequireResaleAccess>
        }
      />
      <Route path="/bank" element={<RequireAuth><Shell><BankPage /></Shell></RequireAuth>} />
      <Route path="/bank-callback" element={<BankCallbackPage />} />
    </Routes>
  )
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  )
}
