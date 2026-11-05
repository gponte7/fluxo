import { useMemo, useState } from 'react'
import { useYear } from '../hooks/useData'
import { EmptyState, ErrorBox, PageHeader, Skeleton, Stat, YearSelect } from '../components/ui'
import { EvolutionChart } from '../components/EvolutionChart'
import { monthly } from '../utils/calc'
import { brl, MESES } from '../utils/format'

export default function Annual() {
  const [year, setYear] = useState(new Date().getFullYear())
  const { txs, status, retry } = useYear(year)
  const s = useMemo(() => monthly(txs), [txs])
  const active = s.filter((m) => m.count > 0)
  const ent = s.reduce((a, m) => a + m.entradas, 0), sai = s.reduce((a, m) => a + m.saidas, 0)
  const n = active.length || 1
  const best = active.length ? active.reduce((a, b) => (b.saldo > a.saldo ? b : a)) : null
  const worst = active.length ? active.reduce((a, b) => (b.saldo < a.saldo ? b : a)) : null
  return (
    <>
      <PageHeader title="Visão Anual"><YearSelect value={year} onChange={setYear} /></PageHeader>
      {status === 'error' ? <ErrorBox onRetry={retry} /> : status === 'loading' ? <Skeleton className="h-64" /> : !txs.length ? <EmptyState text={`Você ainda não possui movimentações em ${year}.`} /> : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Entradas no ano" value={brl(ent)} tone="inc" />
            <Stat label="Saídas no ano" value={brl(sai)} tone="exp" />
            <Stat label="Saldo anual" value={brl(ent - sai)} tone={ent - sai < 0 ? 'exp' : undefined} />
            <Stat label="Média mensal" value={brl((ent - sai) / n)} hint={`Entradas ${brl(ent / n)} · Saídas ${brl(sai / n)}`} />
            <Stat label="Melhor mês" value={best ? MESES[best.m] : '—'} tone="inc" hint={best ? `Saldo ${brl(best.saldo)}` : undefined} />
            <Stat label="Pior mês" value={worst ? MESES[worst.m] : '—'} tone="exp" hint={worst ? `Saldo ${brl(worst.saldo)}` : undefined} />
          </div>
          <section className="card"><h2 className="mb-3 font-display text-lg font-bold">Mês a mês</h2><EvolutionChart data={s} /></section>
          <section className="card overflow-x-auto !p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-line text-left text-muted"><th className="p-3 font-medium">Mês</th><th className="p-3 text-right font-medium">Entradas</th><th className="p-3 text-right font-medium">Saídas</th><th className="p-3 text-right font-medium">Saldo</th><th className="p-3 text-right font-medium">Acumulado</th></tr></thead>
              <tbody>{s.map((m) => (
                <tr key={m.m} className="border-b border-line/60 last:border-0">
                  <td className="p-3">{MESES[m.m]}</td><td className="num p-3 text-right text-inc">{brl(m.entradas)}</td><td className="num p-3 text-right text-exp">{brl(m.saidas)}</td>
                  <td className={`num p-3 text-right font-semibold ${m.saldo < 0 ? 'text-exp' : ''}`}>{brl(m.saldo)}</td><td className="num p-3 text-right">{brl(m.acumulado)}</td>
                </tr>))}</tbody>
            </table>
          </section>
        </div>
      )}
    </>
  )
}
