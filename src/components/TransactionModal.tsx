import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X } from 'lucide-react'
import { txSchema, type TxForm } from '../schemas'
import { useData } from '../hooks/useData'
import { useUI } from '../hooks/useUI'
import { friendly, todayISO } from '../utils/format'

const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export function CurrencyInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return <input inputMode="numeric" className="input num text-lg" value={fmt.format(value || 0)} aria-label="Valor"
    onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, '') || 0) / 100)} />
}

export default function TransactionModal() {
  const { editing, close, toast } = useUI()
  const { cats, saveTx } = useData()
  const [busy, setBusy] = useState(false)
  const open = editing !== undefined
  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } = useForm<TxForm>({ resolver: zodResolver(txSchema), defaultValues: { type: 'saida', amount: 0, date: todayISO() } })
  const type = watch('type')
  const list = useMemo(() => cats.filter((c) => c.type === type), [cats, type])

  useEffect(() => {
    if (!open) return
    reset(editing ? { type: editing.type, amount: editing.amount, date: editing.date, category_id: editing.category_id, description: editing.description ?? '', note: editing.note ?? '' }
      : { type: 'saida', amount: 0, date: todayISO(), category_id: '', description: '', note: '' })
  }, [open, editing, reset])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])
  if (!open) return null

  const submit = handleSubmit(async (v) => {
    setBusy(true)
    try { await saveTx(v, editing?.id); toast(editing ? 'Movimentação atualizada.' : 'Movimentação salva.'); close() }
    catch (e) { toast(friendly(e), 'erro') } finally { setBusy(false) }
  })
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <form onSubmit={submit} role="dialog" aria-modal="true" aria-label="Movimentação" className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-surface p-5 sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">{editing ? 'Editar movimentação' : 'Nova movimentação'}</h2>
          <button type="button" onClick={close} aria-label="Fechar" className="rounded-lg p-1 hover:bg-line/50"><X /></button>
        </div>
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-line/50 p-1">
          {(['saida', 'entrada'] as const).map((t) => (
            <button key={t} type="button" onClick={() => { setValue('type', t); setValue('category_id', '') }}
              className={`rounded-lg py-2 text-sm font-semibold ${type === t ? (t === 'entrada' ? 'bg-inc text-surface' : 'bg-exp text-surface') : 'text-muted'}`}>{t === 'entrada' ? 'Entrada' : 'Saída'}</button>
          ))}
        </div>
        <div className="space-y-4">
          <div><label className="label">Valor</label><Controller control={control} name="amount" render={({ field }) => <CurrencyInput value={field.value} onChange={field.onChange} />} />{errors.amount && <p className="err">{errors.amount.message}</p>}</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="data">Data</label><input id="data" type="date" className="input" {...register('date')} />{errors.date && <p className="err">{errors.date.message}</p>}</div>
            <div><label className="label" htmlFor="cat">Categoria</label>
              <select id="cat" className="input" {...register('category_id')}><option value="">Selecione…</option>{list.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              {errors.category_id && <p className="err">{errors.category_id.message}</p>}</div>
          </div>
          <div><label className="label" htmlFor="desc">Título (opcional)</label><input id="desc" className="input" placeholder="Ex.: Almoço" {...register('description')} />{errors.description && <p className="err">{errors.description.message}</p>}</div>
          <div><label className="label" htmlFor="obs">Observação (opcional)</label><textarea id="obs" rows={2} className="input" {...register('note')} />{errors.note && <p className="err">{errors.note.message}</p>}</div>
        </div>
        <div className="mt-6 flex gap-2"><button type="button" className="btn-ghost flex-1" onClick={close}>Cancelar</button><button className="btn-primary flex-1" disabled={busy}>{busy ? 'Salvando…' : 'Salvar'}</button></div>
      </form>
    </div>
  )
}
