import { useMemo, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { Plus } from 'lucide-react'
import { useData, useYear } from '../hooks/useData'
import { useUI } from '../hooks/useUI'
import { useColors } from '../hooks/useTheme'
import { Breakdown, EmptyState, ErrorBox, MonthSelect, PageHeader, Skeleton, Stat, YearSelect } from '../components/ui'
import { EvolutionChart } from '../components/EvolutionChart'
import { byCategory, monthly, sum } from '../utils/calc'
import { brl, MESES, pct } from '../utils/format'

export default function Dashboard() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const { txs, status, retry } = useYear(year)
  const { cats, catsStatus } = useData()
  const { newTx } = useUI()
  const C = useColors()
  const list = useMemo(() => txs.filter((t) => +t.date.slice(5, 7) - 1 === month), [txs, month])
  const series = useMemo(() => monthly(txs), [txs])
  const ent = sum(list, 'entrada'), sai = sum(list, 'saida'), total = ent + sai
  const fontes = useMemo(() => byCategory(list, 'entrada', cats), [list, cats])
  const gastos = useMemo(() => byCategory(list, 'saida', cats), [list, cats])
  const pe = pct(ent, total), ps = total ? 100 - pe : 0

  return (
    <>
      <PageHeader title="Dashboard">
        <YearSelect value={year} onChange={setYear} /><MonthSelect value={month} onChange={setMonth} />
        <button className="btn-primary hidden md:inline-flex" onClick={() => newTx()}><Plus size={16} />Nova movimentação</button>
      </PageHeader>
      {status === 'error' || catsStatus === 'error' ? <ErrorBox onRetry={retry} /> : status === 'loading' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} />)}</div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Saldo" value={brl(ent - sai)} tone={ent - sai < 0 ? 'exp' : undefined} hint={`Acumulado no ano: ${brl(series[month].acumulado)}`} />
            <Stat label="Entradas" value={brl(ent)} tone="inc" />
            <Stat label="Saídas" value={brl(sai)} tone="exp" />
            <Stat label="Movimentações" value={String(list.length)} hint={`${MESES[month]} de ${year}`} />
          </div>
          {!list.length ? <EmptyState text="Você ainda não possui movimentações neste mês." onAdd={() => newTx()} /> : (
            <>
              <div className="grid gap-4 lg:grid-cols-3">
                <section className="card">
                  <h2 className="mb-2 font-display text-lg font-bold">Entradas x saídas</h2>
                  <div className="relative h-44">
                    <ResponsiveContainer><PieChart><Pie data={[{ v: ent }, { v: sai }]} dataKey="v" innerRadius="68%" outerRadius="95%" stroke="none" paddingAngle={2}><Cell fill={C.inc} /><Cell fill={C.exp} /></Pie></PieChart></ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="num text-2xl font-bold">{pe}%</span><span className="text-xs text-muted">entradas</span></div>
                  </div>
                  <ul className="mt-3 space-y-1 text-sm">
                    <li className="flex justify-between"><span className="text-inc">Entradas: {brl(ent)}</span><b>{pe}%</b></li>
                    <li className="flex justify-between"><span className="text-exp">Saídas: {brl(sai)}</span><b>{ps}%</b></li>
                  </ul>
                </section>
                <section className="card"><h2 className="mb-4 font-display text-lg font-bold">De onde vem meu dinheiro?</h2><Breakdown items={fontes} tone="text-inc" /></section>
                <section className="card"><h2 className="mb-4 font-display text-lg font-bold">Para onde meu dinheiro está indo?</h2><Breakdown items={gastos} tone="text-exp" /></section>
              </div>
            </>
          )}
          <section className="card"><h2 className="mb-3 font-display text-lg font-bold">Evolução em {year}</h2><EvolutionChart data={series} /></section>
        </div>
      )}
    </>
  )
}
