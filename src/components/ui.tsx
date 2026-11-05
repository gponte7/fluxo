import type { ReactNode } from 'react'
import { AlertTriangle, Inbox, Plus } from 'lucide-react'
import { brl, MESES, yearOptions } from '../utils/format'

export const Skeleton = ({ className = 'h-24' }: { className?: string }) => <div className={`animate-pulse rounded-2xl bg-line/60 ${className}`} />

export function ErrorBox({ onRetry, msg }: { onRetry?: () => void; msg?: string }) {
  return (
    <div className="card flex flex-col items-center gap-3 py-10 text-center" role="alert">
      <AlertTriangle className="text-exp" />
      <p className="text-sm">{msg ?? 'Não foi possível carregar os dados. Verifique sua conexão.'}</p>
      {onRetry && <button className="btn-ghost" onClick={onRetry}>Tentar novamente</button>}
    </div>
  )
}
export function EmptyState({ text, onAdd, action = '+ Adicionar movimentação' }: { text: string; onAdd?: () => void; action?: string }) {
  return (
    <div className="card flex flex-col items-center gap-3 py-10 text-center">
      <Inbox className="text-muted" />
      <p className="text-sm text-muted">{text}</p>
      {onAdd && <button className="btn-primary" onClick={onAdd}><Plus size={16} />{action.replace('+ ', '')}</button>}
    </div>
  )
}
export const Stat = ({ label, value, tone, hint }: { label: string; value: string; tone?: 'inc' | 'exp'; hint?: string }) => (
  <div className="card">
    <p className="text-sm text-muted">{label}</p>
    <p className={`num mt-1 text-2xl font-bold sm:text-3xl ${tone === 'inc' ? 'text-inc' : tone === 'exp' ? 'text-exp' : ''}`}>{value}</p>
    {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
  </div>
)
export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h1 className="font-display text-2xl font-bold sm:text-3xl">{title}</h1><div className="flex flex-wrap items-center gap-2">{children}</div></div>
}
export function YearSelect({ value, onChange }: { value: number; onChange: (y: number) => void }) {
  return <select aria-label="Ano" className="input !w-auto" value={value} onChange={(e) => onChange(+e.target.value)}>{yearOptions().map((y) => <option key={y}>{y}</option>)}</select>
}
export function MonthSelect({ value, onChange, all }: { value: number; onChange: (m: number) => void; all?: boolean }) {
  return (
    <select aria-label="Mês" className="input !w-auto" value={value} onChange={(e) => onChange(+e.target.value)}>
      {all && <option value={-1}>Todos os meses</option>}
      {MESES.map((m, i) => <option key={m} value={i}>{m}</option>)}
    </select>
  )
}
export function Breakdown({ items, tone }: { items: { id: string; name: string; color: string; value: number; pct: number }[]; tone: string }) {
  if (!items.length) return <p className="py-6 text-center text-sm text-muted">Sem dados neste mês.</p>
  return (
    <ul className="space-y-4">
      {items.map((i) => (
        <li key={i.id}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 font-medium"><span className="h-2.5 w-2.5 rounded-full" style={{ background: i.color }} />{i.name}</span>
            <span className="num text-muted">{brl(i.value)} — <b className={tone}>{i.pct}%</b></span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full" style={{ width: `${Math.max(i.pct, 2)}%`, background: i.color }} /></div>
        </li>
      ))}
    </ul>
  )
}
