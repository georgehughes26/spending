import { Navigate, NavLink, Route, HashRouter as Router, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AuthProvider, useAuth } from './context/AuthContext'
import DashboardPage from './pages/DashboardPage'
import DataEntryPage from './pages/DataEntryPage'
import SettingsPage from './pages/SettingsPage'
import SignInPage from './pages/SignInPage'
import OnboardingPage from './pages/OnboardingPage'
import ResalePage from './pages/ResalePage'
import RunningDashboardPage from './pages/RunningDashboardPage'
import RunningUploadPage from './pages/RunningUploadPage'
import RunningSettingsPage from './pages/RunningSettingsPage'
import RunningHistoryPage from './pages/RunningHistoryPage'
import RunningHistoryDetailPage from './pages/RunningHistoryDetailPage'
import StrengthDashboardPage from './pages/StrengthDashboardPage'
import StrengthProgramPage from './pages/StrengthProgramPage'
import StrengthLogPage from './pages/StrengthLogPage'
import StrengthHistoryPage from './pages/StrengthHistoryPage'
import StrengthHistoryDetailPage from './pages/StrengthHistoryDetailPage'
import BankPage from './pages/BankPage'
import BankCallbackPage from './pages/BankCallbackPage'
import { PageTransition, tapScale } from './components/motion'
import { RunningNavIcon } from './components/RunningIcons'

const iconProps = { viewBox: '0 0 20 20', className: 'h-5 w-5 shrink-0', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }

const icons = {
  dashboard: (
    <svg {...iconProps}>
      <rect x="2.5" y="2.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="11" y="2.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="2.5" y="11" width="6.5" height="6.5" rx="1.5" />
      <rect x="11" y="11" width="6.5" height="6.5" rx="1.5" />
    </svg>
  ),
  entry: (
    <svg {...iconProps}>
      <path d="M12 3.5l4.5 4.5-9 9H3v-4.5z" />
      <path d="M10.5 5 15 9.5" />
    </svg>
  ),
  settings: (
    <svg {...iconProps}>
      <circle cx="10" cy="10" r="2.8" />
      <path d="M10 2.5v2.2M10 15.3v2.2M17.5 10h-2.2M4.7 10H2.5M15.1 4.9l-1.6 1.6M6.5 13.5l-1.6 1.6M15.1 15.1l-1.6-1.6M6.5 6.5 4.9 4.9" />
    </svg>
  ),
  resale: (
    <svg {...iconProps}>
      <path d="M3 3h6l8 8-6 6-8-8z" />
      <circle cx="7" cy="7" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  ),
  running: <RunningNavIcon />,
  signOut: (
    <svg {...iconProps}>
      <path d="M8 3H4.5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1H8" />
      <path d="M12.5 13.5 17 10l-4.5-3.5M17 10H7.5" />
    </svg>
  ),
}

const navItemClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
    isActive
      ? 'bg-pink-600 dark:bg-emerald-400 text-white dark:text-zinc-950'
      : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
  }`

// Thumb-reachable bottom tab bar for mobile -- a horizontally scrolling row
// of full nav items (the old mobile treatment) forced multi-word labels to
// wrap mid-word and hid the last tab off-screen with no scroll affordance.
// A fixed bottom bar keeps every destination visible and reachable at once,
// which is the platform-standard mobile nav pattern.
const mobileTabItemClass = ({ isActive }) =>
  `flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium whitespace-nowrap transition-colors duration-150 [&_svg]:h-5 [&_svg]:w-5 ${
    isActive ? 'text-pink-500 dark:text-emerald-400' : 'text-zinc-500'
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

// Gates the whole "Training" area (Running + Strength) -- still driven by
// the running_access flag rather than a new column, since it's the same
// single-user gate just covering more ground now.
function RequireTrainingAccess({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <p className="mx-auto max-w-7xl px-6 py-6 text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
  if (!user) return <Navigate to="/signin" replace />
  if (!user.onboarded) return <Navigate to="/onboarding" replace />
  if (!user.running_access) return <Navigate to="/" replace />
  return children
}

function RequireSignedIn({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <p className="mx-auto max-w-7xl px-6 py-6 text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
  if (!user) return <Navigate to="/signin" replace />
  return children
}

// The sidebar is always the same near-black chrome regardless of light/dark
// theme -- a permanent, app-like frame around whichever theme the content
// area is in, rather than the header re-skinning itself every toggle.
function Shell({ children }) {
  const { user, signOut } = useAuth()

  const navItems = (
    <>
      <NavLink to="/" end className={navItemClass}>
        {icons.dashboard} Dashboard
      </NavLink>
      <NavLink to="/entry" className={navItemClass}>
        {icons.entry} Data Entry
      </NavLink>
      <NavLink to="/settings" className={navItemClass}>
        {icons.settings} Settings
      </NavLink>
      {user?.resale_access && (
        <NavLink to="/resale" className={navItemClass}>
          {icons.resale} Reselling
        </NavLink>
      )}
      {user?.running_access && (
        <NavLink to="/training" className={navItemClass}>
          {icons.running} Training
        </NavLink>
      )}
    </>
  )

  return (
    <div className="min-h-svh lg:flex">
      {/* Desktop sidebar -- unchanged from before, just scoped to lg+ now
          that mobile has its own top header and bottom tab bar below. */}
      <aside className="sticky top-0 z-10 hidden flex-shrink-0 bg-zinc-950 lg:flex lg:h-svh lg:w-64 lg:flex-col lg:justify-between">
        <div className="px-6 py-6">
          <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-400">
            Layla
          </h1>
          <p className="mt-0.5 text-xs text-zinc-500">Smart Spending Management</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1.5 px-4">{navItems}</nav>
        {user && (
          <div className="px-4 pb-6">
            <motion.button {...tapScale}
              type="button"
              onClick={signOut}
              className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-400 transition-colors duration-150 hover:bg-white/5 hover:text-red-400"
            >
              {icons.signOut} Sign out
            </motion.button>
          </div>
        )}
      </aside>

      {/* Mobile top header -- wordmark only, nav lives in the bottom tab
          bar so it doesn't compete for the same row. */}
      <header className="sticky top-0 z-10 bg-zinc-950 px-5 py-4 lg:hidden">
        <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-400">
          Layla
        </h1>
      </header>

      <div className="min-w-0 flex-1 pb-20 lg:pb-0">{children}</div>

      {/* Mobile bottom tab bar -- fixed, safe-area aware, every destination
          reachable without scrolling or wrapping. */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-white/10 bg-zinc-950 pb-[env(safe-area-inset-bottom)] lg:hidden">
        <NavLink to="/" end className={mobileTabItemClass}>
          {icons.dashboard}
          Dashboard
        </NavLink>
        <NavLink to="/entry" className={mobileTabItemClass}>
          {icons.entry}
          Entry
        </NavLink>
        <NavLink to="/settings" className={mobileTabItemClass}>
          {icons.settings}
          Settings
        </NavLink>
        {user?.resale_access && (
          <NavLink to="/resale" className={mobileTabItemClass}>
            {icons.resale}
            Reselling
          </NavLink>
        )}
        {user?.running_access && (
          <NavLink to="/training" className={mobileTabItemClass}>
            {icons.running}
            Training
          </NavLink>
        )}
      </nav>
    </div>
  )
}

function AppRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/signin" element={<PageTransition><SignInPage /></PageTransition>} />
        <Route
          path="/onboarding"
          element={
            <PageTransition>
              <RequireSignedIn>
                <OnboardingPage />
              </RequireSignedIn>
            </PageTransition>
          }
        />
        <Route
          path="/"
          element={
            <PageTransition>
              <RequireAuth>
                <Shell><DashboardPage /></Shell>
              </RequireAuth>
            </PageTransition>
          }
        />
        <Route
          path="/entry"
          element={
            <PageTransition>
              <RequireAuth>
                <Shell><DataEntryPage /></Shell>
              </RequireAuth>
            </PageTransition>
          }
        />
        <Route
          path="/settings"
          element={
            <PageTransition>
              <RequireAuth>
                <Shell><SettingsPage /></Shell>
              </RequireAuth>
            </PageTransition>
          }
        />
        <Route
          path="/resale"
          element={
            <PageTransition>
              <RequireResaleAccess>
                <Shell><ResalePage /></Shell>
              </RequireResaleAccess>
            </PageTransition>
          }
        />
        <Route path="/training" element={<Navigate to="/training/running" replace />} />
        <Route
          path="/training/running"
          element={
            <PageTransition>
              <RequireTrainingAccess>
                <Shell><RunningDashboardPage /></Shell>
              </RequireTrainingAccess>
            </PageTransition>
          }
        />
        <Route
          path="/training/running/upload"
          element={
            <PageTransition>
              <RequireTrainingAccess>
                <Shell><RunningUploadPage /></Shell>
              </RequireTrainingAccess>
            </PageTransition>
          }
        />
        <Route
          path="/training/running/history"
          element={
            <PageTransition>
              <RequireTrainingAccess>
                <Shell><RunningHistoryPage /></Shell>
              </RequireTrainingAccess>
            </PageTransition>
          }
        />
        <Route
          path="/training/running/history/:id"
          element={
            <PageTransition>
              <RequireTrainingAccess>
                <Shell><RunningHistoryDetailPage /></Shell>
              </RequireTrainingAccess>
            </PageTransition>
          }
        />
        <Route
          path="/training/running/settings"
          element={
            <PageTransition>
              <RequireTrainingAccess>
                <Shell><RunningSettingsPage /></Shell>
              </RequireTrainingAccess>
            </PageTransition>
          }
        />
        <Route
          path="/training/strength"
          element={
            <PageTransition>
              <RequireTrainingAccess>
                <Shell><StrengthDashboardPage /></Shell>
              </RequireTrainingAccess>
            </PageTransition>
          }
        />
        <Route
          path="/training/strength/program"
          element={
            <PageTransition>
              <RequireTrainingAccess>
                <Shell><StrengthProgramPage /></Shell>
              </RequireTrainingAccess>
            </PageTransition>
          }
        />
        <Route
          path="/training/strength/log/:dayId"
          element={
            <PageTransition>
              <RequireTrainingAccess>
                <Shell><StrengthLogPage /></Shell>
              </RequireTrainingAccess>
            </PageTransition>
          }
        />
        <Route
          path="/training/strength/history"
          element={
            <PageTransition>
              <RequireTrainingAccess>
                <Shell><StrengthHistoryPage /></Shell>
              </RequireTrainingAccess>
            </PageTransition>
          }
        />
        <Route
          path="/training/strength/history/:id"
          element={
            <PageTransition>
              <RequireTrainingAccess>
                <Shell><StrengthHistoryDetailPage /></Shell>
              </RequireTrainingAccess>
            </PageTransition>
          }
        />
        <Route path="/bank" element={<PageTransition><RequireAuth><Shell><BankPage /></Shell></RequireAuth></PageTransition>} />
        <Route path="/bank-callback" element={<BankCallbackPage />} />
      </Routes>
    </AnimatePresence>
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
