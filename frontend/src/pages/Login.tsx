import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function Login() {
  const { isAuthenticated, isLoggingIn, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (isAuthenticated) {
    const redirectTo = (location.state as { from?: string } | null)?.from ?? '/'
    return <Navigate to={redirectTo} replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await login(username, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.')
    }
  }

  return (
    <div className="flex min-h-screen bg-ink">
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden px-14 py-14 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(244,245,242,0.9) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
          aria-hidden="true"
        />

        <div className="relative flex items-center gap-2.5">
          <span className="relative flex h-7 w-7 items-center justify-center">
            <span className="absolute left-0 top-1 h-2.5 w-2.5 rounded-full bg-hot" />
            <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-warm" />
            <span className="absolute right-0 bottom-0 h-2 w-2 rounded-full bg-cold" />
          </span>
          <span className="font-display text-lg font-semibold text-white">LeadTriage</span>
        </div>

        <div className="relative max-w-md">
          <p className="font-display text-4xl font-semibold leading-[1.15] text-white">
            Every inbound lead, sorted the moment it arrives.
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-text-on-ink-muted">
            Groq-scored classification, workflow automation, and a full audit
            trail — so nothing hot sits in an inbox going cold.
          </p>
          <dl className="mt-9 flex gap-8">
            <div>
              <dt className="text-xs uppercase tracking-wide text-text-on-ink-muted">Hot</dt>
              <dd className="num mt-1 flex items-center gap-1.5 text-sm text-white">
                <span className="h-2 w-2 rounded-full bg-hot" /> respond now
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-text-on-ink-muted">Warm</dt>
              <dd className="num mt-1 flex items-center gap-1.5 text-sm text-white">
                <span className="h-2 w-2 rounded-full bg-warm" /> nurture
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-text-on-ink-muted">Cold</dt>
              <dd className="num mt-1 flex items-center gap-1.5 text-sm text-white">
                <span className="h-2 w-2 rounded-full bg-cold" /> low priority
              </dd>
            </div>
          </dl>
        </div>

        <p className="relative text-xs text-text-on-ink-muted">
          Internal tool · single-tenant demo instance
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-paper px-6 py-14">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <span className="font-display text-lg font-semibold text-text">LeadTriage</span>
          </div>

          <h1 className="font-display text-xl font-semibold text-text">Sign in</h1>
          <p className="mt-1 text-sm text-text-muted">
            Use the operator credentials configured for this instance.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
            <div>
              <label htmlFor="username" className="mb-1.5 block text-xs font-medium text-text-muted">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-text shadow-card outline-none focus:border-primary"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-text-muted">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-text shadow-card outline-none focus:border-primary"
              />
            </div>

            {error && (
              <p role="alert" className="rounded-md bg-status-failed-soft px-3 py-2 text-sm text-status-failed">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="mt-1 rounded-md bg-primary px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoggingIn ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
