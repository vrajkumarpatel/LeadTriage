import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-paper text-center">
      <p className="font-display text-5xl font-semibold text-text">404</p>
      <p className="text-sm text-text-muted">This page doesn't exist.</p>
      <Link to="/" className="mt-2 text-sm font-medium text-primary hover:underline">
        Back to dashboard
      </Link>
    </div>
  )
}
