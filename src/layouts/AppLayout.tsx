import { useEffect, useState } from 'react'
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { ArrowLeftRight, BarChart3, CalendarRange, ChevronRight, LayoutDashboard, MoreHorizontal, Settings, Tags, Upload, Wallet } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { DataProvider } from '../hooks/useData'
import { UIProvider } from '../hooks/useUI'
import TransactionModal from '../components/TransactionModal'
import { Skeleton } from '../components/ui'

const main = [
  { to: '/', label: 'Dashboard', short: 'Início', icon: LayoutDashboard },
  { to: '/movimentacoes', label: 'Movimentações', short: 'Lançamentos', icon: ArrowLeftRight },
  { to: '/relatorios', label: 'Relatórios', short: 'Relatórios', icon: BarChart3 },
  { to: '/visao-anual', label: 'Visão Anual', short: 'Anual', icon: CalendarRange },
]
const more = [
  { to: '/importar', label: 'Importar extrato', desc: 'Traga lançamentos de um arquivo OFX ou CSV', icon: Upload },
  { to: '/categorias', label: 'Categorias', desc: 'Crie e edite suas categorias', icon: Tags },
  { to: '/configuracoes', label: 'Configurações', desc: 'Conta, tema e dados', icon: Settings },
]
const desktop = [...main, ...more.map((m) => ({ ...m, short: m.label }))]

export default function AppLayout() {
  const { user, loading, name } = useAuth()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  if (loading) return <div className="p-6"><Skeleton className="h-40" /></div>
  if (!user) return <Navigate to="/entrar" replace />
  const inMore = more.some((m) => pathname.startsWith(m.to))
  const tab = (active: boolean) => `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${active ? 'font-semibold text-brand' : 'text-muted'}`

  return (
    <DataProvider><UIProvider>
      <div className="min-h-screen md:pl-64 print:pl-0">
        <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-line bg-surface p-5 md:flex print:!hidden">
          <div className="mb-8 flex items-center gap-2 font-display text-xl font-bold"><Wallet className="text-brand" />Fluxo</div>
          <nav className="flex-1 space-y-1">
            {desktop.map(({ to, label, icon: I }) => (
              <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${isActive ? 'bg-brand/10 text-brand' : 'text-muted hover:bg-line/50'}`}><I size={18} />{label}</NavLink>
            ))}
          </nav>
          <p className="truncate text-sm text-muted">{name}</p>
        </aside>
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 md:px-8 md:pb-10"><Outlet /></main>

        {/* Mobile: 4 atalhos + "Mais" que abre as demais telas */}
        <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden print:hidden" aria-label="Navegação principal">
          {main.map(({ to, short, icon: I }) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => tab(isActive)}><I size={20} />{short}</NavLink>
          ))}
          <button className={tab(open || inMore)} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="dialog"><MoreHorizontal size={20} />Mais</button>
        </nav>
        {open && (
          <div className="fixed inset-0 z-40 bg-black/40 md:hidden print:hidden" onClick={() => setOpen(false)}>
            <div role="dialog" aria-label="Mais opções" onClick={(e) => e.stopPropagation()} className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-surface p-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
              <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-muted">Mais opções</p>
              <ul>{more.map(({ to, label, desc, icon: I }) => (
                <li key={to}><NavLink to={to} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-3 ${isActive ? 'bg-brand/10 text-brand' : 'hover:bg-line/50'}`}>
                  <I size={22} /><span className="flex-1"><span className="block text-sm font-semibold">{label}</span><span className="block text-xs text-muted">{desc}</span></span><ChevronRight size={18} className="text-muted" />
                </NavLink></li>))}</ul>
            </div>
          </div>
        )}
        <TransactionModal />
      </div>
    </UIProvider></DataProvider>
  )
}
