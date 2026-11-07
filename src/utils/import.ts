export interface Parsed { date: string; amount: number; desc: string; ext: string }

export function decodeBuffer(buf: ArrayBuffer): string {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf) } catch { return new TextDecoder('windows-1252').decode(buf) }
}
export function parseMoney(s: string): number {
  let v = s.replace(/[^\d,.\-+()]/g, '')
  const neg = /^\(.*\)$/.test(v)
  v = v.replace(/[()]/g, '')
  const lc = v.lastIndexOf(','), ld = v.lastIndexOf('.')
  if (lc >= 0 && ld >= 0) v = lc > ld ? v.replace(/\./g, '').replace(',', '.') : v.replace(/,/g, '') // o último separador é o decimal
  else if (lc >= 0) v = v.split(',').length > 2 ? v.replace(/,/g, '') : v.replace(',', '.')
  else if (ld >= 0 && v.split('.').length > 2) v = v.replace(/\./g, '')
  const n = parseFloat(v)
  return neg ? -n : n
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

const otag = (b: string, t: string) => b.match(new RegExp(`<${t}>([^<\\r\\n]*)`, 'i'))?.[1].trim() ?? ''

export function cleanDesc(memo: string, name: string): string {
  const m = memo.replace(/"/g, '').trim()
  const head = m.split(':')[0].trim()
  if (/^pix|transfer[eê]ncia/i.test(head) && name) return `${head}: ${name}`.slice(0, 80)
  const out = m.replace(/Cp\s*:\s*[\d-]+\s*/i, '').replace(/No estabelecimento\s+/i, '').trim()
  return (out || name || 'Sem descrição').slice(0, 80)
}

export interface OfxInfo { bank: string; acct: string; kind: 'conta' | 'cartao'; start: string; end: string; balance: number | null; statements: number }
export function ofxInfo(text: string): OfxInfo {
  const d = (v: string) => (v.length >= 8 ? `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}` : '')
  const bal = parseMoney(otag(text, 'BALAMT'))
  return {
    bank: otag(text, 'ORG'), acct: otag(text, 'ACCTID').slice(-4), kind: /<CCSTMTRS>/i.test(text) ? 'cartao' : 'conta',
    start: d(otag(text, 'DTSTART')), end: d(otag(text, 'DTEND')), balance: Number.isFinite(bal) ? bal : null,
    statements: (text.match(/<(STMTRS|CCSTMTRS)>/gi) ?? []).length,
  }
}

// Lê OFX em SGML (sem tags de fechamento) ou XML; extrato de conta (STMTRS) e de cartão (CCSTMTRS), com 1 ou mais contas.
export function parseOFX(text: string): Parsed[] {
  const stmts = text.match(/<(?:STMTRS|CCSTMTRS)>[\s\S]*?(?=<(?:STMTRS|CCSTMTRS)>|$)/gi) ?? [text]
  const multi = stmts.length > 1
  const rows: Omit<Parsed, 'ext'>[] = []; const ids: string[] = []
  for (const st of stmts) {
    const acct = otag(st, 'ACCTID')
    const blocks = st.match(/<STMTTRN>[\s\S]*?(?=<\/STMTTRN>|<STMTTRN>|<\/BANKTRANLIST>)/gi) ?? []
    for (const b of blocks) {
      const dt = otag(b, 'DTPOSTED'); const date = `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}`
      let amount = parseMoney(otag(b, 'TRNAMT'))
      if (!valid(date) || !Number.isFinite(amount) || amount === 0) continue
      if (/^(DEBIT|PAYMENT|CHECK|ATM|POS|FEE|SRVCHG|DIRECTDEBIT|REPEATPMT|CASH)$/i.test(otag(b, 'TRNTYPE')) && amount > 0) amount = -amount
      rows.push({ date, amount, desc: cleanDesc(otag(b, 'MEMO'), otag(b, 'NAME')) })
      const fit = otag(b, 'FITID'); ids.push(fit ? (multi ? `${acct}:${fit}` : fit) : '')
    }
  }
  const unique = ids.length > 0 && ids.every(Boolean) && new Set(ids).size === ids.length
  return withKeys(rows, 'ofx', unique ? ids : undefined)
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
// Alguns bancos colocam linhas de título antes do cabeçalho real; procura a linha com "data" e "valor".
export function findHeader(rows: string[][]): number {
  const i = rows.findIndex((r) => r.filter(Boolean).length >= 3 && r.some((c) => /data/i.test(c)) && r.some((c) => /valor|amount|quantia/i.test(c)))
  return i >= 0 ? i : Math.max(0, rows.findIndex((r) => r.filter(Boolean).length >= 3))
}
export function guessColumns(header: string[]) {
  const pick = (...res: RegExp[]) => { for (const re of res) { const i = header.findIndex((h) => re.test(h)); if (i >= 0) return i } return -1 }
  const date = pick(/data/i)
  const amount = pick(/^valor/i, /valor(?!.*saldo)/i, /amount|quantia/i)
  const desc = pick(/descri/i, /hist[oó]rico|memo|lan[cç]amento|estabelec|title|t[ií]tulo/i)
  const lastNonSaldo = header.map((h, i) => (/saldo/i.test(h) ? -1 : i)).filter((i) => i >= 0).pop() ?? 0
  return { date: date < 0 ? 0 : date, desc: desc < 0 ? Math.min(1, header.length - 1) : desc, amount: amount < 0 ? lastNonSaldo : amount }
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

// Movimentos que costumam aparecer nas duas pontas (saída aqui, entrada ali) e inflam os totais.
export const looksInternal = (desc: string) =>
  /aplica[cç][aã]o|resgate|\brdb\b|\bcdb\b|entre contas|mesma titularidade|pag(amento|to)\.? (de )?fatura|pgto fatura|fatura cart/i.test(desc)
