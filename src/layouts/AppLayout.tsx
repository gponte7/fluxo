import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { ArrowLeftRight, BarChart3, CalendarRange, Upload, LayoutDashboard, Plus, Settings, Tags, Wallet } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { DataProvider } from '../hooks/useData'
import { UIProvider, useUI } from '../hooks/useUI'
import TransactionModal from '../components/TransactionModal'
import { Skeleton } from '../components/ui'

const nav = [
  { to: '/', label: 'Dashboard', short: 'Início', icon: LayoutDashboard },
  { to: '/movimentacoes', label: 'Movimentações', short: 'Lançamentos', icon: ArrowLeftRight },
  { to: '/visao-anual', label: 'Visão Anual', short: 'Anual', icon: CalendarRange },
  { to: '/relatorios', label: 'Relatórios', short: 'Relatórios', icon: BarChart3 },
  { to: '/importar', label: 'Importar extrato', short: 'Importar', icon: Upload },
  { to: '/categorias', label: 'Categorias', short: 'Categorias', icon: Tags },
  { to: '/configuracoes', label: 'Configurações', short: 'Ajustes', icon: Settings },
]
function Fab() { const { newTx } = useUI(); return <button onClick={() => newTx()} aria-label="Nova movimentação" className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-surface shadow-lg md:hidden print:hidden"><Plus /></button> }

export default function AppLayout() {
  const { user, loading, name } = useAuth()
  if (loading) return <div className="p-6"><Skeleton className="h-40" /></div>
  if (!user) return <Navigate to="/entrar" replace />
  return (
    <DataProvider><UIProvider>
      <div className="min-h-screen md:pl-64 print:pl-0">
        <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-line bg-surface p-5 md:flex print:!hidden">
          <div className="mb-8 flex items-center gap-2 font-display text-xl font-bold"><Wallet className="text-brand" />Meu Dinheiro</div>
          <nav className="flex-1 space-y-1">
            {nav.map(({ to, label, icon: I }) => (
              <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${isActive ? 'bg-brand/10 text-brand' : 'text-muted hover:bg-line/50'}`}><I size={18} />{label}</NavLink>
            ))}
          </nav>
          <p className="truncate text-sm text-muted">{name}</p>
        </aside>
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 md:px-8 md:pb-10"><Outlet /></main>
        <nav className="fixed inset-x-0 bottom-0 z-30 flex overflow-x-auto border-t print:hidden border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
          {nav.map(({ to, short, icon: I }) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `flex min-w-[78px] flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${isActive ? 'text-brand' : 'text-muted'}`}><I size={20} />{short}</NavLink>
          ))}
        </nav>
        <Fab />
        <TransactionModal />
      </div>
    </UIProvider></DataProvider>
  )
}
