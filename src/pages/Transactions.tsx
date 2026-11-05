import { useMemo, useState } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useData, useYear } from '../hooks/useData'
import { useUI } from '../hooks/useUI'
import { EmptyState, ErrorBox, MonthSelect, PageHeader, Skeleton, YearSelect } from '../components/ui'
import { brl, fmtDate, friendly } from '../utils/format'
import type { Tx } from '../types'

export default function Transactions() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [type, setType] = useState('')
  const [cat, setCat] = useState('')
  const [q, setQ] = useState('')
  const [min, setMin] = useState('')
  const [max, setMax] = useState('')
  const { txs, status, retry } = useYear(year)
  const { cats, removeTx } = useData()
  const { newTx, toast } = useUI()
  const catMap = useMemo(() => new Map(cats.map((c) => [c.id, c])), [cats])

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return txs.filter((t) =>
      (month < 0 || +t.date.slice(5, 7) - 1 === month) && (!type || t.type === type) && (!cat || t.category_id === cat) &&
      (!min || t.amount >= Number(min)) && (!max || t.amount <= Number(max)) &&
      (!s || `${t.description ?? ''} ${t.note ?? ''} ${catMap.get(t.category_id)?.name ?? ''}`.toLowerCase().includes(s)))
  }, [txs, month, type, cat, min, max, q, catMap])

  const del = async (t: Tx) => {
    if (!window.confirm('Excluir esta movimentação?')) return
    try { await removeTx(t.id); toast('Movimentação excluída.') } catch (e) { toast(friendly(e), 'erro') }
  }
  const amount = (t: Tx) => <span className={`num font-semibold ${t.type === 'entrada' ? 'text-inc' : 'text-exp'}`}>{t.type === 'entrada' ? '+' : '-'} {brl(t.amount)}</span>
  const catChip = (t: Tx) => { const c = catMap.get(t.category_id); return <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c?.color }} />{c?.name}</span> }
  const actions = (t: Tx) => <div className="flex gap-1"><button aria-label="Editar" className="rounded-lg p-2 hover:bg-line/50" onClick={() => newTx(t)}><Pencil size={16} /></button><button aria-label="Excluir" className="rounded-lg p-2 text-exp hover:bg-line/50" onClick={() => del(t)}><Trash2 size={16} /></button></div>

  return (
    <>
      <PageHeader title="Movimentações"><button className="btn-primary" onClick={() => newTx()}><Plus size={16} />Nova movimentação</button></PageHeader>
      <div className="card mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2"><Search size={16} className="absolute left-3 top-3 text-muted" /><input className="input !pl-9" placeholder="Pesquisar por descrição, observação ou categoria" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Pesquisar" /></div>
        <div className="flex gap-2"><YearSelect value={year} onChange={setYear} /><MonthSelect all value={month} onChange={setMonth} /></div>
        <select className="input" aria-label="Tipo" value={type} onChange={(e) => { setType(e.target.value); setCat('') }}><option value="">Entradas e saídas</option><option value="entrada">Entradas</option><option value="saida">Saídas</option></select>
        <select className="input" aria-label="Categoria" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">Todas as categorias</option>{cats.filter((c) => !type || c.type === type).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <input className="input" type="number" min="0" step="0.01" placeholder="Valor mínimo" aria-label="Valor mínimo" value={min} onChange={(e) => setMin(e.target.value)} />
        <input className="input" type="number" min="0" step="0.01" placeholder="Valor máximo" aria-label="Valor máximo" value={max} onChange={(e) => setMax(e.target.value)} />
      </div>
      {status === 'error' ? <ErrorBox onRetry={retry} /> : status === 'loading' ? <Skeleton className="h-64" /> : !rows.length ? (
        <EmptyState text={txs.length ? 'Nenhuma movimentação com esses filtros.' : 'Você ainda não possui movimentações neste período.'} onAdd={() => newTx()} />
      ) : (
        <>
          <div className="card hidden overflow-x-auto !p-0 md:block">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-line text-left text-muted"><th className="p-3 font-medium">Data</th><th className="p-3 font-medium">Tipo</th><th className="p-3 font-medium">Categoria</th><th className="p-3 font-medium">Descrição</th><th className="p-3 text-right font-medium">Valor</th><th className="p-3" /></tr></thead>
              <tbody>{rows.map((t) => (
                <tr key={t.id} className="border-b border-line/60 last:border-0">
                  <td className="p-3 whitespace-nowrap">{fmtDate(t.date)}</td>
                  <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${t.type === 'entrada' ? 'bg-inc/15 text-inc' : 'bg-exp/15 text-exp'}`}>{t.type === 'entrada' ? 'Entrada' : 'Saída'}</span></td>
                  <td className="p-3">{catChip(t)}</td>
                  <td className="max-w-xs truncate p-3">{t.description}{t.description && t.note ? ' · ' : ''}<span className="text-muted">{t.note}</span></td>
                  <td className="p-3 text-right whitespace-nowrap">{amount(t)}</td><td className="p-3">{actions(t)}</td>
                </tr>))}</tbody>
            </table>
          </div>
          <ul className="space-y-2 md:hidden">{rows.map((t) => (
            <li key={t.id} className={`card flex items-center gap-3 border-l-4 !p-3 ${t.type === 'entrada' ? 'border-l-inc' : 'border-l-exp'}`}>
              <div className="min-w-0 flex-1"><p className="truncate font-medium">{t.description || catMap.get(t.category_id)?.name}</p><p className="truncate text-xs text-muted">{fmtDate(t.date)} · {catMap.get(t.category_id)?.name}{t.note ? ` · ${t.note}` : ''}</p></div>
              <div className="text-right text-sm">{amount(t)}</div>{actions(t)}
            </li>))}</ul>
        </>
      )}
    </>
  )
}
