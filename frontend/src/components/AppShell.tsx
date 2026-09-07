import { type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Activity,
  Gauge,
  LayoutGrid,
  LogOut,
  Settings as SettingsIcon,
  Users,
  Workflow,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutGrid, end: true },
  { to: '/leads', label: 'Leads', icon: Users, end: false },
  { to: '/workflows', label: 'Workflows', icon: Workflow, end: false },
  { to: '/automation', label: 'Automation', icon: Activity, end: false },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, end: false },
]

export function AppShell({ children }: { children: ReactNode }) {
  const { logout } = useAuth()

  return (
    <div className="flex min-h-screen bg-paper">
      <aside className="flex w-60 shrink-0 flex-col bg-ink text-text-on-ink">
        <div className="flex items-center gap-2.5 px-5 py-6">
          <span className="relative flex h-7 w-7 items-center justify-center">
            <span className="absolute left-0 top-1 h-2.5 w-2.5 rounded-full bg-hot" />
            <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-warm" />
            <span className="absolute right-0 bottom-0 h-2 w-2 rounded-full bg-cold" />
          </span>
          <span className="font-display text-[17px] font-semibold tracking-tight text-white">
            LeadTriage
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-3">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-ink-soft text-white'
                    : 'text-text-on-ink-muted hover:bg-ink-soft hover:text-white'
                }`
              }
            >
              <Icon className="h-4 w-4" strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-ink-line px-3 py-3">
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-text-on-ink-muted transition-colors hover:bg-ink-soft hover:text-white"
          >
            <LogOut className="h-4 w-4" strokeWidth={2} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-end border-b border-border bg-surface px-6">
          <div className="flex items-center gap-2 text-xs text-text-faint">
            <Gauge className="h-3.5 w-3.5" strokeWidth={2} />
            Demo mode
          </div>
        </header>
        <main className="min-w-0 flex-1 px-8 py-7">{children}</main>
      </div>
    </div>
  )
}
