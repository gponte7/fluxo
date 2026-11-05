import type { Category, Tx, TxType } from '../types'
import { pct } from './format'
export const sum = (txs: Tx[], type: TxType) => txs.reduce((a, t) => (t.type === type ? a + t.amount : a), 0)
export function byCategory(txs: Tx[], type: TxType, cats: Category[]) {
  const map = new Map<string, number>()
  txs.filter((t) => t.type === type).forEach((t) => map.set(t.category_id, (map.get(t.category_id) ?? 0) + t.amount))
  const total = [...map.values()].reduce((a, b) => a + b, 0)
  return [...map.entries()].map(([id, value]) => {
    const c = cats.find((x) => x.id === id)
    return { id, name: c?.name ?? 'Sem categoria', color: c?.color ?? '#64748b', value, pct: pct(value, total) }
  }).sort((a, b) => b.value - a.value)
}
export function monthly(txs: Tx[]) {
  let acc = 0
  return Array.from({ length: 12 }, (_, m) => {
    const list = txs.filter((t) => +t.date.slice(5, 7) - 1 === m)
    const entradas = sum(list, 'entrada'), saidas = sum(list, 'saida')
    acc += entradas - saidas
    return { m, count: list.length, entradas, saidas, saldo: entradas - saidas, acumulado: acc }
  })
}
