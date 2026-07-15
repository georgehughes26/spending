import { Navigate, NavLink, Route, HashRouter as Router, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import DashboardPage from './pages/DashboardPage'
import DataEntryPage from './pages/DataEntryPage'
import SettingsPage from './pages/SettingsPage'
import SignInPage from './pages/SignInPage'
import OnboardingPage from './pages/OnboardingPage'
import BankPage from './pages/BankPage'
import BankCallbackPage from './pages/BankCallbackPage'

const navLinkClass = ({ isActive }) =>
  `flex min-h-11 cursor-pointer items-center rounded-lg px-3 text-sm font-medium transition-colors duration-150 ${
    isActive ? 'bg-pink-600 text-white' : 'text-zinc-400 hover:text-pink-300'
  }`

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <p className="mx-auto max-w-7xl px-6 py-6 text-sm text-zinc-500">Loading…</p>
  if (!user) return <Navigate to="/signin" replace />
  if (!user.onboarded) return <Navigate to="/onboarding" replace />
  return children
}

function RequireSignedIn({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <p className="mx-auto max-w-7xl px-6 py-6 text-sm text-zinc-500">Loading…</p>
  if (!user) return <Navigate to="/signin" replace />
  return children
}

function Shell({ children }) {
  const { user, signOut } = useAuth()
  return (
    <div className="min-h-svh">
      <header className="border-b border-pink-900/30 px-6 py-5">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-300">
              Financial Command Centre
            </h1>
            <p className="mt-1 text-sm text-zinc-500">Your complete financial position, at a glance.</p>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            <NavLink to="/" end className={navLinkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/entry" className={navLinkClass}>
              Data Entry
            </NavLink>
            <NavLink to="/settings" className={navLinkClass}>
              Settings
            </NavLink>
            {user && (
              <button
                type="button"
                onClick={signOut}
                className="flex min-h-11 cursor-pointer items-center rounded-lg px-3 text-sm font-medium text-zinc-400 transition-colors duration-150 hover:text-red-300"
              >
                Sign out ({user.name})
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
