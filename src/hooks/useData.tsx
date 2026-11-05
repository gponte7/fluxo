import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { Category, Tx } from '../types'
import type { CategoryForm, TxForm } from '../schemas'

type Status = 'loading' | 'ok' | 'error'
interface YearState { status: Status; txs: Tx[] }
interface DataCtx {
  cats: Category[]; catsStatus: Status; years: Record<number, YearState>
  ensureYear: (y: number, force?: boolean) => void
  saveTx: (v: TxForm, id?: string) => Promise<void>; removeTx: (id: string) => Promise<void>
  saveCat: (v: CategoryForm, id?: string) => Promise<void>; removeCat: (id: string) => Promise<void>
  importTxs: (rows: ImportRow[]) => Promise<number>
  reloadCats: () => void
}
export interface ImportRow { type: 'entrada' | 'saida'; amount: number; category_id: string; date: string; description: string; external_id: string }
const Ctx = createContext<DataCtx>(null!)
const norm = (r: Tx): Tx => ({ ...r, amount: Number(r.amount) })
const order = (a: Tx, b: Tx) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at)

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [cats, setCats] = useState<Category[]>([])
  const [catsStatus, setCatsStatus] = useState<Status>('loading')
  const [years, setYears] = useState<Record<number, YearState>>({})
  const inflight = useRef(new Set<number>())

  const reloadCats = useCallback(async () => {
    if (!user) return
    setCatsStatus('loading')
    const { data, error } = await supabase.from('categories').select('*').order('name')
    if (error) return setCatsStatus('error')
    setCats((data ?? []) as Category[]); setCatsStatus('ok')
  }, [user])

  useEffect(() => { setYears({}); setCats([]); inflight.current.clear(); reloadCats() }, [user?.id, reloadCats])

  const ensureYear = useCallback(async (y: number, force = false) => {
    if (!user || inflight.current.has(y)) return
    inflight.current.add(y)
    setYears((s) => ({ ...s, [y]: { status: 'loading', txs: force ? [] : s[y]?.txs ?? [] } }))
    const { data, error } = await supabase.from('transactions').select('*')
      .gte('date', `${y}-01-01`).lte('date', `${y}-12-31`)
      .order('date', { ascending: false }).order('created_at', { ascending: false })
    inflight.current.delete(y)
    setYears((s) => ({ ...s, [y]: error ? { status: 'error', txs: [] } : { status: 'ok', txs: ((data ?? []) as Tx[]).map(norm) } }))
  }, [user])

  // Atualiza só o necessário no estado local, sem recarregar nada.
  const place = (tx: Tx) => setYears((s) => {
    const n: Record<number, YearState> = {}
    for (const k of Object.keys(s)) n[+k] = { ...s[+k], txs: s[+k].txs.filter((t) => t.id !== tx.id) }
    const y = +tx.date.slice(0, 4)
    if (n[y]?.status === 'ok') n[y] = { ...n[y], txs: [tx, ...n[y].txs].sort(order) }
    return n
  })

  const saveTx = async (v: TxForm, id?: string) => {
    if (!user) throw new Error('Sessão expirada.')
    const row = { user_id: user.id, type: v.type, amount: v.amount, category_id: v.category_id, date: v.date, description: v.description || null, note: v.note || null }
    const q = id ? supabase.from('transactions').update(row).eq('id', id) : supabase.from('transactions').insert(row)
    const { data, error } = await q.select().single()
    if (error) throw error
    place(norm(data as Tx))
  }
  const removeTx = async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) throw error
    setYears((s) => Object.fromEntries(Object.entries(s).map(([k, v]) => [k, { ...v, txs: v.txs.filter((t) => t.id !== id) }])))
  }
  const saveCat = async (v: CategoryForm, id?: string) => {
    if (!user) throw new Error('Sessão expirada.')
    const q = id ? supabase.from('categories').update({ name: v.name, color: v.color }).eq('id', id) : supabase.from('categories').insert({ ...v, user_id: user.id })
    const { data, error } = await q.select().single()
    if (error) throw error
    setCats((c) => [...c.filter((x) => x.id !== id), data as Category].sort((a, b) => a.name.localeCompare(b.name)))
  }
  const removeCat = async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) throw error
    setCats((c) => c.filter((x) => x.id !== id))
  }
  const importTxs = async (rows: ImportRow[]) => {
    if (!user) throw new Error('Sessão expirada.')
    let n = 0
    for (let i = 0; i < rows.length; i += 300) {
      const chunk = rows.slice(i, i + 300).map((r) => ({ ...r, description: r.description.slice(0, 80), user_id: user.id, source: 'import' }))
      const { data, error } = await supabase.from('transactions').upsert(chunk, { onConflict: 'user_id,external_id', ignoreDuplicates: true }).select('id')
      if (error) throw error
      n += data?.length ?? 0
    }
    new Set(rows.map((r) => +r.date.slice(0, 4))).forEach((y) => { if (years[y]) ensureYear(y, true) })
    return n
  }
  return <Ctx.Provider value={{ cats, catsStatus, years, ensureYear, saveTx, removeTx, saveCat, removeCat, importTxs, reloadCats }}>{children}</Ctx.Provider>
}
export const useData = () => useContext(Ctx)

export function useYear(y: number) {
  const { years, ensureYear } = useData()
  const st = years[y]
  useEffect(() => { if (!st) ensureYear(y) }, [y, st, ensureYear])
  return { txs: st?.txs ?? [], status: (st?.status ?? 'loading') as Status, retry: () => ensureYear(y, true) }
}
