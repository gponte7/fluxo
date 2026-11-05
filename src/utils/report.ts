import type { Category, Tx } from '../types'
import { sum } from './calc'
import { pct } from './format'

export const variation = (cur: number, prev: number) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null)

export function summary(list: Tx[], days: number) {
  const entradas = sum(list, 'entrada'), saidas = sum(list, 'saida'), saldo = entradas - saidas
  return { entradas, saidas, saldo, poupanca: entradas > 0 ? Math.round((saldo / entradas) * 100) : null, mediaDia: days > 0 ? saidas / days : 0, count: list.length }
}
export function categoryCompare(cur: Tx[], prev: Tx[], cats: Category[]) {
  const agg = (l: Tx[]) => { const m = new Map<string, number>(); l.filter((t) => t.type === 'saida').forEach((t) => m.set(t.category_id, (m.get(t.category_id) ?? 0) + t.amount)); return m }
  const a = agg(cur), b = agg(prev), total = [...a.values()].reduce((x, y) => x + y, 0)
  return [...new Set([...a.keys(), ...b.keys()])].map((id) => {
    const c = cats.find((x) => x.id === id); const v = a.get(id) ?? 0, p = b.get(id) ?? 0
    return { id, name: c?.name ?? 'Sem categoria', color: c?.color ?? '#64748b', value: v, share: pct(v, total), prev: p, diff: v - p, var: variation(v, p) }
  }).filter((r) => r.value > 0 || r.prev > 0).sort((x, y) => y.value - x.value)
}
export const topExpenses = (list: Tx[], n = 10) => list.filter((t) => t.type === 'saida').sort((a, b) => b.amount - a.amount).slice(0, n)
export function weekdays(list: Tx[]) {
  const names = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const tot = Array(7).fill(0) as number[], days = Array.from({ length: 7 }, () => new Set<string>())
  list.filter((t) => t.type === 'saida').forEach((t) => { const d = new Date(t.date + 'T00:00:00').getDay(); tot[d] += t.amount; days[d].add(t.date) })
  return names.map((dia, i) => ({ dia, total: tot[i], media: days[i].size ? tot[i] / days[i].size : 0 }))
}
// Saídas com a mesma descrição em 3+ meses e valores parecidos (variação ≤ 20%).
export function recurring(txs: Tx[]) {
  const g = new Map<string, Tx[]>()
  for (const t of txs) {
    if (t.type !== 'saida' || !t.description) continue
    const k = t.description.toLowerCase().replace(/\d+/g, '').replace(/\s+/g, ' ').trim()
    if (k.length < 3) continue
    const arr = g.get(k) ?? []; arr.push(t); g.set(k, arr)
  }
  return [...g.values()].map((l) => {
    const a = l.map((t) => t.amount), min = Math.min(...a), max = Math.max(...a)
    return { name: l[0].description as string, months: new Set(l.map((t) => t.date.slice(0, 7))).size, avg: a.reduce((x, y) => x + y, 0) / a.length, min, max, last: l.map((t) => t.date).sort().pop() as string }
  }).filter((r) => r.months >= 3 && r.max <= r.min * 1.2).sort((x, y) => y.avg - x.avg)
}
const esc = (v: string) => `"${(/^[=+\-@\t\r]/.test(v) ? `'${v}` : v).replace(/"/g, '""')}"` // evita injeção de fórmula
export function toCSV(list: Tx[], cats: Category[]) {
  const head = ['Data', 'Tipo', 'Categoria', 'Título', 'Observação', 'Valor']
  const lines = list.map((t) => [t.date.split('-').reverse().join('/'), t.type === 'entrada' ? 'Entrada' : 'Saída', cats.find((c) => c.id === t.category_id)?.name ?? '', t.description ?? '', t.note ?? '']
    .map(esc).concat(`${t.type === 'entrada' ? '' : '-'}${t.amount.toFixed(2).replace('.', ',')}`).join(';'))
  return '\uFEFF' + [head.join(';'), ...lines].join('\r\n')
}
export function download(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url)
}
