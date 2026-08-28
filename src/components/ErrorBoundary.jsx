import { Component } from 'react'

// The app had no error boundary anywhere -- any uncaught render exception
// unmounts the whole tree, leaving a blank/black screen with zero signal
// about what happened. This catches that at the root and shows the actual
// error instead, so a future bug is visible and reportable rather than a
// silent crash.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Uncaught render error:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#18181b', color: '#f4f4f5' }}>
          <div style={{ maxWidth: 480 }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h1>
            <p style={{ fontSize: 14, color: '#a1a1aa', marginBottom: 12 }}>
              A page crashed instead of loading. Reloading might help; if not, this is worth reporting.
            </p>
            <pre style={{ fontSize: 12, color: '#fca5a5', whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#000', padding: 12, borderRadius: 8 }}>
              {String(this.state.error?.message ?? this.state.error)}
            </pre>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{ marginTop: 16, minHeight: 40, padding: '0 16px', borderRadius: 8, background: '#f4f4f5', color: '#18181b', fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer' }}
            >
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
