export const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
export const MESES_CURTOS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const f = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const brl = (n: number) => f.format(n)
export const brlCompact = (n: number) => new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
export const fmtDate = (iso: string) => iso.split('-').reverse().join('/')
export const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
export const pct = (v: number, total: number) => (total > 0 ? Math.round((v / total) * 100) : 0)
export const yearOptions = () => { const y = new Date().getFullYear(); return Array.from({ length: 9 }, (_, i) => y - 5 + i) }
export const friendly = (e: unknown) => {
  const m = (e as { message?: string })?.message ?? ''
  if (/Invalid login/i.test(m)) return 'E-mail ou senha incorretos.'
  if (/already registered/i.test(m)) return 'Este e-mail já possui cadastro.'
  if (/foreign key|violates/i.test(m)) return 'Esta categoria possui movimentações. Mova ou exclua-as antes.'
  if (/duplicate key/i.test(m)) return 'Já existe uma categoria com esse nome.'
  if (/fetch|network/i.test(m)) return 'Falha na conexão. Verifique sua internet e tente de novo.'
  return m || 'Algo deu errado. Tente novamente.'
}
