import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Download, Printer } from 'lucide-react'
import { useData, useYear } from '../hooks/useData'
import { useColors } from '../hooks/useTheme'
import { Breakdown, EmptyState, ErrorBox, MonthSelect, PageHeader, Skeleton, Stat, YearSelect } from '../components/ui'
import { byCategory } from '../utils/calc'
import { categoryCompare, download, recurring, summary, toCSV, topExpenses, variation, weekdays } from '../utils/report'
import { brl, brlCompact, fmtDate, MESES } from '../utils/format'

const trend = (v: number | null, goodWhenDown = true) => v === null ? <span className="text-muted">—</span>
  : <span className={v === 0 ? 'text-muted' : (v < 0) === goodWhenDown ? 'text-inc' : 'text-exp'}>{v > 0 ? '+' : ''}{v}%</span>

export default function Reports() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()) // -1 = ano inteiro
  const cur = useYear(year), prevY = useYear(year - 1)
  const { cats } = useData()
  const C = useColors()
  const inMonth = (t: { date: string }, m: number) => +t.date.slice(5, 7) - 1 === m
  const { list, prev, label, prevLabel, days } = useMemo(() => {
    if (month < 0) return { list: cur.txs, prev: prevY.txs, label: String(year), prevLabel: String(year - 1), days: 365 }
    const pm = month === 0 ? 11 : month - 1
    const isNow = year === now.getFullYear() && month === now.getMonth()
    return { list: cur.txs.filter((t) => inMonth(t, month)), prev: (month === 0 ? prevY.txs : cur.txs).filter((t) => inMonth(t, pm)),
      label: `${MESES[month]} de ${year}`, prevLabel: MESES[pm], days: isNow ? now.getDate() : new Date(year, month + 1, 0).getDate() }
  }, [cur.txs, prevY.txs, month, year]) // eslint-disable-line
  const s = summary(list, days), p = summary(prev, days)
  const cmp = useMemo(() => categoryCompare(list, prev, cats), [list, prev, cats])
  const fontes = useMemo(() => byCategory(list, 'entrada', cats), [list, cats])
  const top = useMemo(() => topExpenses(list), [list])
  const week = useMemo(() => weekdays(list), [list])
  const rec = useMemo(() => recurring([...cur.txs, ...prevY.txs]), [cur.txs, prevY.txs])
  const rise = cmp.filter((c) => c.diff > 0 && c.prev > 0).sort((a, b) => b.diff - a.diff)[0]
  const catName = (id: string) => cats.find((c) => c.id === id)?.name ?? ''

  return (
    <>
      <PageHeader title="Relatórios">
        <div className="flex flex-wrap gap-2 print:hidden">
          <YearSelect value={year} onChange={setYear} /><MonthSelect all value={month} onChange={setMonth} />
          <button className="btn-ghost" onClick={() => download(`movimentacoes-${year}${month < 0 ? '' : `-${String(month + 1).padStart(2, '0')}`}.csv`, toCSV(list, cats))} disabled={!list.length}><Download size={16} />CSV</button>
          <button className="btn-ghost" onClick={() => window.print()}><Printer size={16} />Imprimir / PDF</button>
        </div>
      </PageHeader>
      {cur.status === 'error' ? <ErrorBox onRetry={cur.retry} /> : cur.status === 'loading' ? <Skeleton className="h-64" /> : !list.length ? <EmptyState text={`Sem movimentações em ${label}.`} /> : (
        <div className="space-y-4">
          <p className="text-sm text-muted">Período: {label} · comparado com {prevLabel}</p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Entradas" value={brl(s.entradas)} tone="inc" hint={`vs. anterior: ${p.entradas ? (variation(s.entradas, p.entradas) ?? 0) + '%' : '—'}`} />
            <Stat label="Saídas" value={brl(s.saidas)} tone="exp" hint={`vs. anterior: ${p.saidas ? (variation(s.saidas, p.saidas) ?? 0) + '%' : '—'}`} />
            <Stat label="Taxa de poupança" value={s.poupanca === null ? '—' : `${s.poupanca}%`} tone={s.poupanca !== null && s.poupanca < 0 ? 'exp' : undefined} hint="Quanto da renda sobrou" />
            <Stat label="Gasto médio por dia" value={brl(s.mediaDia)} hint={`${s.count} movimentações`} />
          </div>
          {rise && <p className="card text-sm">Maior aumento de gastos: <b>{rise.name}</b>, {brl(rise.diff)} a mais que em {prevLabel} ({rise.var}%).</p>}

          <section className="card overflow-x-auto"><h2 className="mb-3 font-display text-lg font-bold">Gastos por categoria</h2>
            <table className="w-full text-sm"><thead><tr className="text-left text-muted"><th className="pb-2 font-medium">Categoria</th><th className="pb-2 text-right font-medium">Valor</th><th className="pb-2 text-right font-medium">% dos gastos</th><th className="pb-2 text-right font-medium">Anterior</th><th className="pb-2 text-right font-medium">Variação</th></tr></thead>
              <tbody>{cmp.map((c) => <tr key={c.id} className="border-t border-line/60"><td className="py-2"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />{c.name}</td><td className="num py-2 text-right">{brl(c.value)}</td><td className="py-2 text-right">{c.share}%</td><td className="num py-2 text-right text-muted">{brl(c.prev)}</td><td className="py-2 text-right">{trend(c.var)}</td></tr>)}</tbody></table>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="card"><h2 className="mb-3 font-display text-lg font-bold">Gastos por dia da semana</h2>
              <div className="h-52"><ResponsiveContainer><BarChart data={week} margin={{ left: -10 }}><CartesianGrid vertical={false} stroke={C.line} /><XAxis dataKey="dia" tickLine={false} axisLine={false} tick={{ fill: C.muted, fontSize: 12 }} /><YAxis tickLine={false} axisLine={false} tick={{ fill: C.muted, fontSize: 12 }} tickFormatter={(v) => brlCompact(Number(v))} /><Tooltip formatter={(v) => brl(Number(v))} /><Bar dataKey="total" name="Total" fill={C.exp} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
            </section>
            <section className="card"><h2 className="mb-4 font-display text-lg font-bold">Fontes de entrada</h2><Breakdown items={fontes} tone="text-inc" /></section>
          </div>

          <section className="card"><h2 className="mb-3 font-display text-lg font-bold">Maiores gastos</h2>
            <ul className="divide-y divide-line text-sm">{top.map((t) => <li key={t.id} className="flex items-center justify-between gap-3 py-2"><span className="min-w-0 truncate">{t.description || catName(t.category_id)} <span className="text-muted">· {fmtDate(t.date)} · {catName(t.category_id)}</span></span><span className="num font-semibold text-exp">{brl(t.amount)}</span></li>)}</ul>
          </section>

          <section className="card"><h2 className="mb-1 font-display text-lg font-bold">Gastos recorrentes</h2>
            <p className="mb-3 text-xs text-muted">Saídas com o mesmo título em 3 ou mais meses e valores parecidos (assinaturas, mensalidades, contas fixas).</p>
            {!rec.length ? <p className="text-sm text-muted">Nada recorrente encontrado ainda. Use títulos consistentes nas movimentações.</p> : (
              <><ul className="divide-y divide-line text-sm">{rec.map((r) => <li key={r.name} className="flex items-center justify-between gap-3 py-2"><span className="min-w-0 truncate">{r.name} <span className="text-muted">· {r.months} meses · último em {fmtDate(r.last)}</span></span><span className="num font-semibold">{brl(r.avg)}/mês</span></li>)}</ul>
                <p className="mt-3 text-sm">Total estimado por mês: <b className="num">{brl(rec.reduce((a, r) => a + r.avg, 0))}</b></p></>)}
          </section>
        </div>
      )}
    </>
  )
}
