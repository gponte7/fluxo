import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, FileUp } from 'lucide-react'
import { useData } from '../hooks/useData'
import { useUI } from '../hooks/useUI'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/ui'
import { brl, fmtDate, friendly } from '../utils/format'
import { csvToParsed, decodeBuffer, findHeader, guessColumns, looksInternal, ofxInfo, parseCSV, parseOFX, suggestName, type OfxInfo, type Parsed } from '../utils/import'

export default function ImportPage() {
  const { cats, years, importTxs, ensureYear } = useData()
  const nav = useNavigate()
  const [info, setInfo] = useState<OfxInfo | null>(null)
  const { toast } = useUI()
  const [file, setFile] = useState('')
  const [text, setText] = useState('')
  const [kind, setKind] = useState<'ofx' | 'csv' | null>(null)
  const [headerRow, setHeaderRow] = useState(0)
  const [col, setCol] = useState({ date: 0, desc: 1, amount: 2 })
  const [flip, setFlip] = useState(false)
  const [dups, setDups] = useState<Set<string>>(new Set())
  const [over, setOver] = useState<Record<string, { cat?: string; on?: boolean }>>({})
  const [busy, setBusy] = useState(false)

  const table = useMemo(() => (kind === 'csv' ? parseCSV(text) : []), [kind, text])
  const header = table[headerRow] ?? []
  const parsed: Parsed[] = useMemo(() => {
    if (kind === 'ofx') return parseOFX(text).map((p) => (flip ? { ...p, amount: -p.amount } : p))
    if (kind === 'csv') return csvToParsed(table.slice(headerRow + 1), col, flip)
    return []
  }, [kind, text, table, headerRow, col, flip])

  // Sugere a categoria pelo histórico (mesma descrição) e, na falta, por palavras-chave.
  const history = useMemo(() => {
    const m = new Map<string, string>()
    Object.values(years).forEach((y) => y.txs.forEach((t) => t.description && m.set(`${t.type}|${t.description.toLowerCase()}`, t.category_id)))
    return m
  }, [years])
  useEffect(() => { new Set(parsed.map((p) => +p.date.slice(0, 4))).forEach((y) => ensureYear(y)) }, [parsed, ensureYear])
  // Lançamentos que já existem (mesma data, tipo e valor), vindos de importação anterior em outro formato ou digitados à mão.
  const existing = useMemo(() => {
    const ext = new Set(parsed.map((p) => p.ext)); const m = new Map<string, number>()
    Object.values(years).forEach((y) => y.txs.forEach((t) => { if (t.external_id && ext.has(t.external_id)) return; const k = `${t.date}|${t.type}|${t.amount.toFixed(2)}`; m.set(k, (m.get(k) ?? 0) + 1) }))
    return m
  }, [years, parsed])
  const rows = useMemo(() => { const left = new Map(existing); return parsed.map((p) => {
    const type = p.amount > 0 ? ('entrada' as const) : ('saida' as const)
    const fallback = cats.find((c) => c.type === type && c.name === suggestName(p.desc, type)) ?? cats.find((c) => c.type === type)
    const cat = over[p.ext]?.cat ?? history.get(`${type}|${p.desc.toLowerCase()}`) ?? fallback?.id ?? ''
    const k = `${p.date}|${type}|${Math.abs(p.amount).toFixed(2)}`
    const dup = dups.has(p.ext)
    const likely = !dup && (left.get(k) ?? 0) > 0
    if (likely) left.set(k, (left.get(k) ?? 0) - 1)
    return { ...p, type, internal: looksInternal(p.desc), abs: Math.abs(p.amount), cat, dup, likely, on: over[p.ext]?.on ?? !(dup || likely) }
  }) }, [parsed, cats, history, over, dups, existing])

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

  const pickHeader = (n: number) => { setHeaderRow(n); setCol(guessColumns(table[n] ?? [])) }
  const onFile = async (f?: File) => {
    if (!f) return
    if (f.size > 5_000_000) return toast('Arquivo grande demais (máx. 5 MB).', 'erro')
    const t = decodeBuffer(await f.arrayBuffer())
    const isOfx = /\.ofx$/i.test(f.name) || /<OFX>/i.test(t)
    setFile(f.name); setText(t); setKind(isOfx ? 'ofx' : 'csv'); setOver({})
    if (isOfx) {
      const i = ofxInfo(t); setInfo(i)
      const ps = parseOFX(t)
      setFlip(i.kind === 'cartao' && ps.length > 0 && ps.filter((p) => p.amount > 0).length / ps.length > 0.6)
    } else { setInfo(null); setFlip(false) }
    if (!isOfx) { const tb = parseCSV(t); const h = findHeader(tb); setHeaderRow(h); setCol(guessColumns(tb[h] ?? [])) }
  }

  const setAll = (pred: (r: (typeof rows)[number]) => boolean) =>
    setOver(Object.fromEntries(rows.map((r) => [r.ext, { ...over[r.ext], on: pred(r) }])))
  const sel = rows.filter((r) => r.on && r.cat)
  const allOn = rows.length > 0 && rows.every((r) => r.on)
  const totIn = sel.filter((r) => r.type === 'entrada').reduce((a, r) => a + r.abs, 0)
  const totOut = sel.filter((r) => r.type === 'saida').reduce((a, r) => a + r.abs, 0)
  const internals = rows.filter((r) => r.internal && r.on)
  const huge = rows.some((r) => r.abs >= 1_000_000)

  const go = async () => {
    setBusy(true)
    try {
      const n = await importTxs(sel.map((r) => ({ type: r.type, amount: r.abs, category_id: r.cat, date: r.date, description: r.desc, external_id: r.ext })))
      const skipped = sel.length - n
      toast(`${n} importadas${skipped > 0 ? `, ${skipped} ignoradas por já existirem` : ''}.`)
      const y = Math.max(...sel.map((r) => +r.date.slice(0, 4)))
      setText(''); setKind(null); setFile(''); setInfo(null)
      nav(`/movimentacoes?ano=${y}&mes=-1`)
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
        {kind === 'ofx' && <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={flip} onChange={(e) => setFlip(e.target.checked)} />Inverter entradas e saídas (use se as compras apareceram como entradas, comum em fatura de cartão)</label>}
        {kind === 'csv' && table.length > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <div><label className="label">Linha do cabeçalho</label><select className="input" value={headerRow} onChange={(e) => pickHeader(+e.target.value)}>{table.slice(0, 15).map((r, i) => <option key={i} value={i}>{i + 1}: {r.filter(Boolean).slice(0, 3).join(' | ').slice(0, 40)}</option>)}</select></div>
            {colSel('date', 'Coluna da data')}{colSel('desc', 'Coluna da descrição')}{colSel('amount', 'Coluna do valor')}
            <label className="flex items-center gap-2 text-sm sm:col-span-4"><input type="checkbox" checked={flip} onChange={(e) => setFlip(e.target.checked)} />Valores positivos são saídas (comum em fatura de cartão)</label>
          </div>
        )}
      </div>
      {info && <p className="card mb-4 text-sm">{info.kind === 'cartao' ? 'Fatura de cartão' : 'Conta'}{info.bank ? ` · ${info.bank}` : ''}{info.acct ? ` · final ${info.acct}` : ''}{info.start && info.end ? ` · ${fmtDate(info.start)} a ${fmtDate(info.end)}` : ''}{info.balance !== null ? ` · saldo final ${brl(info.balance)}` : ''}{info.statements > 1 ? ` · ${info.statements} contas no arquivo` : ''}</p>}
      {huge && <p className="card mb-4 flex items-start gap-2 border-exp text-sm text-exp" role="alert"><AlertTriangle size={18} className="mt-0.5 shrink-0" />Há valores acima de R$ 1.000.000. Confira se a coluna do valor está certa (não use a coluna de saldo).</p>}
      {kind && !rows.length && <p className="card text-sm text-muted">Nenhuma movimentação reconhecida. {kind === 'csv' ? 'Confira a linha do cabeçalho e as colunas acima.' : 'Confira se o arquivo é um extrato OFX válido.'}</p>}
      {rows.length > 0 && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">{rows.length} no arquivo · {rows.filter((r) => r.dup).length} já importadas · {rows.filter((r) => r.likely).length} parecem já lançadas · {sel.length} selecionadas</span>
            <button className="btn-ghost !py-1.5" onClick={() => setAll(() => true)}>Selecionar todas</button>
            <button className="btn-ghost !py-1.5" onClick={() => setAll((r) => !r.dup && !r.likely)}>Só as novas</button>
            <button className="btn-ghost !py-1.5" onClick={() => setAll(() => false)}>Limpar seleção</button>
            {internals.length > 0 && <button className="btn-ghost !py-1.5" onClick={() => setOver(Object.fromEntries(rows.map((r) => [r.ext, { ...over[r.ext], on: r.on && !r.internal }])))}>Desmarcar transferências e aplicações ({internals.length})</button>}
          </div>
          <div className="mb-3 grid grid-cols-3 gap-2 text-sm">
            <div className="card !p-3"><p className="text-xs text-muted">Entradas selecionadas</p><p className="num font-bold text-inc">{brl(totIn)}</p></div>
            <div className="card !p-3"><p className="text-xs text-muted">Saídas selecionadas</p><p className="num font-bold text-exp">{brl(totOut)}</p></div>
            <div className="card !p-3"><p className="text-xs text-muted">Saldo</p><p className="num font-bold">{brl(totIn - totOut)}</p></div>
          </div>
          <p className="mb-3 text-xs text-muted">Compare estes totais com o extrato do banco antes de importar.</p>
          <div className="card overflow-x-auto !p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-line text-left text-muted"><th className="p-3"><input type="checkbox" aria-label="Selecionar todas" checked={allOn} onChange={(e) => setAll(() => e.target.checked)} /></th><th className="p-3 font-medium">Data</th><th className="p-3 font-medium">Descrição</th><th className="p-3 font-medium">Categoria</th><th className="p-3 text-right font-medium">Valor</th></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.ext} className={`border-b border-line/60 last:border-0 ${r.on ? '' : 'opacity-50'}`}>
                  <td className="p-3"><input type="checkbox" aria-label="Importar" checked={r.on} onChange={(e) => setOver({ ...over, [r.ext]: { ...over[r.ext], on: e.target.checked } })} /></td>
                  <td className="whitespace-nowrap p-3">{fmtDate(r.date)}</td>
                  <td className="max-w-[14rem] truncate p-3">{r.desc}{r.dup && <span className="ml-2 rounded-full bg-line px-2 py-0.5 text-xs">já importada</span>}{r.likely && <span className="ml-2 rounded-full bg-line px-2 py-0.5 text-xs" title="Já existe lançamento com a mesma data, tipo e valor">parece já lançada</span>}{r.internal && <span className="ml-2 rounded-full bg-line px-2 py-0.5 text-xs" title="Pode aparecer como entrada e saída ao mesmo tempo">transferência?</span>}</td>
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
