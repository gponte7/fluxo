import { useEffect, useMemo, useState } from 'react'
import { FileUp } from 'lucide-react'
import { useData } from '../hooks/useData'
import { useUI } from '../hooks/useUI'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/ui'
import { brl, fmtDate, friendly } from '../utils/format'
import { csvToParsed, decodeBuffer, guessColumns, parseCSV, parseOFX, suggestName, type Parsed } from '../utils/import'

export default function ImportPage() {
  const { cats, years, importTxs } = useData()
  const { toast } = useUI()
  const [file, setFile] = useState('')
  const [text, setText] = useState('')
  const [kind, setKind] = useState<'ofx' | 'csv' | null>(null)
  const [col, setCol] = useState({ date: 0, desc: 1, amount: 2 })
  const [flip, setFlip] = useState(false)
  const [dups, setDups] = useState<Set<string>>(new Set())
  const [over, setOver] = useState<Record<string, { cat?: string; on?: boolean }>>({})
  const [busy, setBusy] = useState(false)

  const table = useMemo(() => (kind === 'csv' ? parseCSV(text) : []), [kind, text])
  const header = table[0] ?? []
  const parsed: Parsed[] = useMemo(() => {
    if (kind === 'ofx') return parseOFX(text)
    if (kind === 'csv') return csvToParsed(table.slice(1), col, flip)
    return []
  }, [kind, text, table, col, flip])

  // Sugere a categoria pelo histórico (mesma descrição) e, na falta, por palavras-chave.
  const history = useMemo(() => {
    const m = new Map<string, string>()
    Object.values(years).forEach((y) => y.txs.forEach((t) => t.description && m.set(`${t.type}|${t.description.toLowerCase()}`, t.category_id)))
    return m
  }, [years])
  const rows = useMemo(() => parsed.map((p) => {
    const type = p.amount > 0 ? ('entrada' as const) : ('saida' as const)
    const fallback = cats.find((c) => c.type === type && c.name === suggestName(p.desc, type)) ?? cats.find((c) => c.type === type)
    const cat = over[p.ext]?.cat ?? history.get(`${type}|${p.desc.toLowerCase()}`) ?? fallback?.id ?? ''
    return { ...p, type, abs: Math.abs(p.amount), cat, dup: dups.has(p.ext), on: over[p.ext]?.on ?? !dups.has(p.ext) }
  }), [parsed, cats, history, over, dups])

  useEffect(() => { // marca o que já foi importado antes
    setDups(new Set())
    const ids = parsed.map((p) => p.ext)
    if (!ids.length) return
    let live = true
    ;(async () => {
      const found = new Set<string>()
      for (let i = 0; i < ids.length; i += 100) {
        const { data } = await supabase.from('transactions').select('external_id').in('external_id', ids.slice(i, i + 100))
        data?.forEach((r) => found.add(r.external_id as string))
      }
      if (live) setDups(found)
    })()
    return () => { live = false }
  }, [parsed])

  const onFile = async (f?: File) => {
    if (!f) return
    if (f.size > 5_000_000) return toast('Arquivo grande demais (máx. 5 MB).', 'erro')
    const t = decodeBuffer(await f.arrayBuffer())
    const isOfx = /\.ofx$/i.test(f.name) || /<OFX>/i.test(t)
    setFile(f.name); setText(t); setKind(isOfx ? 'ofx' : 'csv'); setOver({})
    if (!isOfx) { const g = guessColumns(parseCSV(t)[0] ?? []); setCol(g) }
  }
  const sel = rows.filter((r) => r.on && r.cat)
  const go = async () => {
    setBusy(true)
    try {
      const n = await importTxs(sel.map((r) => ({ type: r.type, amount: r.abs, category_id: r.cat, date: r.date, description: r.desc, external_id: r.ext })))
      toast(`${n} movimentações importadas.`); setText(''); setKind(null); setFile('')
    } catch (e) { toast(friendly(e), 'erro') } finally { setBusy(false) }
  }
  const colSel = (k: 'date' | 'desc' | 'amount', label: string) => (
    <div><label className="label">{label}</label><select className="input" value={col[k]} onChange={(e) => setCol({ ...col, [k]: +e.target.value })}>{header.map((h, i) => <option key={i} value={i}>{h || `Coluna ${i + 1}`}</option>)}</select></div>
  )
  return (
    <>
      <PageHeader title="Importar extrato" />
      <div className="card mb-4">
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-line py-8 text-center hover:bg-line/30">
          <FileUp className="text-brand" /><span className="text-sm font-medium">{file || 'Escolha um arquivo OFX ou CSV do seu banco'}</span>
          <span className="text-xs text-muted">O arquivo é lido no seu navegador; só as movimentações escolhidas são salvas.</span>
          <input type="file" accept=".ofx,.csv,.txt" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        {kind === 'csv' && header.length > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">{colSel('date', 'Coluna da data')}{colSel('desc', 'Coluna da descrição')}{colSel('amount', 'Coluna do valor')}
            <label className="flex items-center gap-2 text-sm sm:col-span-3"><input type="checkbox" checked={flip} onChange={(e) => setFlip(e.target.checked)} />Valores positivos são saídas (comum em fatura de cartão)</label></div>
        )}
      </div>
      {kind && !rows.length && <p className="card text-sm text-muted">Nenhuma movimentação reconhecida. {kind === 'csv' ? 'Confira as colunas acima.' : 'Confira se o arquivo é um extrato OFX válido.'}</p>}
      {rows.length > 0 && (
        <>
          <div className="card overflow-x-auto !p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-line text-left text-muted"><th className="p-3" /><th className="p-3 font-medium">Data</th><th className="p-3 font-medium">Descrição</th><th className="p-3 font-medium">Categoria</th><th className="p-3 text-right font-medium">Valor</th></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.ext} className={`border-b border-line/60 last:border-0 ${r.on ? '' : 'opacity-50'}`}>
                  <td className="p-3"><input type="checkbox" aria-label="Importar" checked={r.on} onChange={(e) => setOver({ ...over, [r.ext]: { ...over[r.ext], on: e.target.checked } })} /></td>
                  <td className="whitespace-nowrap p-3">{fmtDate(r.date)}</td>
                  <td className="max-w-[14rem] truncate p-3">{r.desc}{r.dup && <span className="ml-2 rounded-full bg-line px-2 py-0.5 text-xs">já importada</span>}</td>
                  <td className="p-3"><select aria-label="Categoria" className="input !w-40 !py-1.5" value={r.cat} onChange={(e) => setOver({ ...over, [r.ext]: { ...over[r.ext], cat: e.target.value } })}>{cats.filter((c) => c.type === r.type).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></td>
                  <td className={`num whitespace-nowrap p-3 text-right font-semibold ${r.type === 'entrada' ? 'text-inc' : 'text-exp'}`}>{r.type === 'entrada' ? '+' : '-'} {brl(r.abs)}</td>
                </tr>))}</tbody>
            </table>
          </div>
          <div className="sticky bottom-20 mt-4 flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-3 md:bottom-4">
            <span className="text-sm text-muted">{sel.length} de {rows.length} selecionadas</span>
            <button className="btn-primary" disabled={busy || !sel.length} onClick={go}>{busy ? 'Importando…' : `Importar ${sel.length}`}</button>
          </div>
        </>
      )}
    </>
  )
}
