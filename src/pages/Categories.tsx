import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Trash2 } from 'lucide-react'
import { categorySchema, type CategoryForm } from '../schemas'
import { useData } from '../hooks/useData'
import { useUI } from '../hooks/useUI'
import { ErrorBox, PageHeader, Skeleton } from '../components/ui'
import { friendly } from '../utils/format'
import type { Category } from '../types'

export default function Categories() {
  const { cats, catsStatus, saveCat, removeCat, reloadCats } = useData()
  const { toast } = useUI()
  const [editing, setEditing] = useState<Category | null>(null)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CategoryForm>({ resolver: zodResolver(categorySchema), defaultValues: { type: 'saida', color: '#2563eb', name: '' } })
  const submit = handleSubmit(async (v) => {
    try { await saveCat(v, editing?.id); toast(editing ? 'Categoria atualizada.' : 'Categoria criada.'); setEditing(null); reset({ type: v.type, color: v.color, name: '' }) }
    catch (e) { toast(friendly(e), 'erro') }
  })
  const edit = (c: Category) => { setEditing(c); reset({ name: c.name, type: c.type, color: c.color }) }
  const del = async (c: Category) => {
    if (!window.confirm(`Excluir a categoria "${c.name}"?`)) return
    try { await removeCat(c.id); toast('Categoria excluída.') } catch (e) { toast(friendly(e), 'erro') }
  }
  const col = (type: 'entrada' | 'saida', title: string) => (
    <section className="card"><h2 className="mb-3 font-display text-lg font-bold">{title}</h2>
      <ul className="divide-y divide-line">{cats.filter((c) => c.type === type).map((c) => (
        <li key={c.id} className="flex items-center gap-3 py-2"><span className="h-3 w-3 rounded-full" style={{ background: c.color }} /><span className="flex-1 text-sm">{c.name}</span>
          <button aria-label={`Editar ${c.name}`} className="rounded-lg p-2 hover:bg-line/50" onClick={() => edit(c)}><Pencil size={16} /></button>
          <button aria-label={`Excluir ${c.name}`} className="rounded-lg p-2 text-exp hover:bg-line/50" onClick={() => del(c)}><Trash2 size={16} /></button></li>))}</ul>
    </section>
  )
  return (
    <>
      <PageHeader title="Categorias" />
      <form onSubmit={submit} className="card mb-4 grid items-end gap-3 sm:grid-cols-[1fr_auto_auto_auto]" noValidate>
        <div><label className="label" htmlFor="cn">{editing ? 'Editar categoria' : 'Nova categoria'}</label><input id="cn" className="input" placeholder="Nome" {...register('name')} />{errors.name && <p className="err">{errors.name.message}</p>}</div>
        <select aria-label="Tipo" className="input" disabled={!!editing} {...register('type')}><option value="saida">Saída</option><option value="entrada">Entrada</option></select>
        <input type="color" aria-label="Cor" className="h-11 w-14 cursor-pointer rounded-xl border border-line bg-surface p-1" {...register('color')} />
        <div className="flex gap-2"><button className="btn-primary" disabled={isSubmitting}>{editing ? 'Salvar' : 'Adicionar'}</button>{editing && <button type="button" className="btn-ghost" onClick={() => { setEditing(null); reset({ name: '', type: 'saida', color: '#2563eb' }) }}>Cancelar</button>}</div>
      </form>
      {catsStatus === 'error' ? <ErrorBox onRetry={reloadCats} /> : catsStatus === 'loading' ? <Skeleton className="h-64" /> : <div className="grid gap-4 md:grid-cols-2">{col('entrada', 'Entradas')}{col('saida', 'Saídas')}</div>}
    </>
  )
}
