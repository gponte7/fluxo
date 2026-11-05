export interface Parsed { date: string; amount: number; desc: string; ext: string }

export function decodeBuffer(buf: ArrayBuffer): string {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf) } catch { return new TextDecoder('windows-1252').decode(buf) }
}
export function parseMoney(s: string): number {
  let v = s.replace(/[^\d,.\-+]/g, '')
  if (v.includes(',')) v = v.replace(/\./g, '').replace(',', '.')
  return parseFloat(v)
}
export function parseDate(s: string): string | null {
  const t = s.trim()
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/)
  if (!m) return null
  const y = m[3].length === 2 ? `20${m[3]}` : m[3]
  return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
}
const valid = (d: string | null) => !!d && !Number.isNaN(new Date(d + 'T00:00:00').getTime())

// Chave estável: lançamentos idênticos no mesmo arquivo recebem sufixo de ocorrência.
export function withKeys(rows: Omit<Parsed, 'ext'>[], prefix: string, fitids?: string[]): Parsed[] {
  const seen = new Map<string, number>()
  return rows.map((r, i) => {
    let ext: string
    if (fitids?.[i]) ext = `${prefix}:${fitids[i]}`
    else {
      const base = `${r.date}|${r.amount.toFixed(2)}|${r.desc.toLowerCase().slice(0, 60)}`
      const n = (seen.get(base) ?? 0) + 1
      seen.set(base, n); ext = `${prefix}:${base}|${n}`
    }
    return { ...r, ext }
  })
}

export function parseOFX(text: string): Parsed[] {
  const blocks = text.match(/<STMTTRN>[\s\S]*?(?=<\/STMTTRN>|<STMTTRN>|<\/BANKTRANLIST>)/gi) ?? []
  const tag = (b: string, t: string) => b.match(new RegExp(`<${t}>([^<\\r\\n]*)`, 'i'))?.[1].trim() ?? ''
  const rows: Omit<Parsed, 'ext'>[] = []; const ids: string[] = []
  for (const b of blocks) {
    const d = tag(b, 'DTPOSTED'); const date = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
    const amount = parseMoney(tag(b, 'TRNAMT'))
    if (!valid(date) || !Number.isFinite(amount) || amount === 0) continue
    rows.push({ date, amount, desc: tag(b, 'MEMO') || tag(b, 'NAME') || 'Sem descrição' }); ids.push(tag(b, 'FITID'))
  }
  return withKeys(rows, 'ofx', ids)
}

export function parseCSV(text: string): string[][] {
  const first = text.split(/\r?\n/).find((l) => l.trim()) ?? ''
  const delim = [';', '\t', ','].map((d) => [d, first.split(d).length] as const).sort((a, b) => b[1] - a[1])[0][0]
  const out: string[][] = []; let row: string[] = []; let cell = ''; let q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++ } else q = false } else cell += c }
    else if (c === '"') q = true
    else if (c === delim) { row.push(cell.trim()); cell = '' }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell.trim()); if (row.some(Boolean)) out.push(row); row = []; cell = '' }
    else cell += c
  }
  row.push(cell.trim()); if (row.some(Boolean)) out.push(row)
  return out
}
export function guessColumns(header: string[]) {
  const find = (re: RegExp) => Math.max(0, header.findIndex((h) => re.test(h.toLowerCase())))
  const date = header.findIndex((h) => /data/i.test(h)), amount = header.findIndex((h) => /valor|amount|quantia/i.test(h))
  const desc = header.findIndex((h) => /descri|hist[oó]rico|memo|lan[cç]amento|estabelec|title|t[ií]tulo/i.test(h))
  return { date: date < 0 ? 0 : date, desc: desc < 0 ? find(/./) + 1 : desc, amount: amount < 0 ? header.length - 1 : amount }
}
export function csvToParsed(rows: string[][], col: { date: number; desc: number; amount: number }, flip: boolean): Parsed[] {
  const out: Omit<Parsed, 'ext'>[] = []
  for (const r of rows) {
    const date = parseDate(r[col.date] ?? ''); let amount = parseMoney(r[col.amount] ?? '')
    if (!valid(date) || !Number.isFinite(amount) || amount === 0) continue
    if (flip) amount = -amount
    out.push({ date: date!, amount, desc: (r[col.desc] ?? '').slice(0, 80) || 'Sem descrição' })
  }
  return withKeys(out, 'csv')
}

const OUT: [RegExp, string][] = [
  [/uber|99 ?pop|taxi|combust|posto |shell|ipiranga|ped[aá]gio|metr[oô]|sem parar|estaciona/i, 'Transporte'],
  [/ifood|restaur|lanch|padaria|mercado|supermerc|carrefour|assa[ií]|atacad|a[cç]ougue|pizza|burger|caf[eé]/i, 'Alimentação'],
  [/farm[aá]c|drogar|droga ?raia|pacheco|drogasil/i, 'Farmácia'],
  [/netflix|spotify|disney|prime video|youtube|hbo|apple\.com|google (one|play)|assinatura/i, 'Assinaturas'],
  [/alugu|condom[ií]nio|imobili/i, 'Moradia'],
  [/energia|enel|cemig|light|sabesp|[aá]gua|internet|claro|vivo|tim |boleto|iptu/i, 'Contas'],
  [/escola|curso|faculdade|udemy|mensalidade|livraria/i, 'Educação'],
  [/cl[ií]nica|hospital|consulta|unimed|laborat|odonto/i, 'Saúde'],
  [/cinema|ingresso|show|bar |steam|playstation|xbox/i, 'Lazer'],
  [/fatura|cart[aã]o de cr/i, 'Cartão de crédito'],
]
const IN: [RegExp, string][] = [
  [/sal[aá]rio|folha|proventos/i, 'Salário'], [/rendimento|juros|dividend|cdb|rdb/i, 'Rendimentos'], [/freela|servi[cç]o prestado/i, 'Freelance'],
]
export const suggestName = (desc: string, type: 'entrada' | 'saida') => ((type === 'entrada' ? IN : OUT).find(([re]) => re.test(desc))?.[1]) ?? 'Outros'
