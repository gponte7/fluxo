import { useState } from 'react'
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useColors } from '../hooks/useTheme'
import { brl, brlCompact, MESES_CURTOS } from '../utils/format'
import type { monthly } from '../utils/calc'

export function EvolutionChart({ data }: { data: ReturnType<typeof monthly> }) {
  const C = useColors()
  const [show, setShow] = useState({ entradas: true, saidas: true, saldo: true })
  const [acc, setAcc] = useState(false)
  const rows = data.map((d) => ({ ...d, mes: MESES_CURTOS[d.m] }))
  const toggle = (k: keyof typeof show, label: string) => (
    <button key={k} onClick={() => setShow((s) => ({ ...s, [k]: !s[k] }))} aria-pressed={show[k]}
      className={`rounded-full border px-3 py-1 text-xs font-medium ${show[k] ? 'border-brand bg-brand/10' : 'border-line text-muted'}`}>{label}</button>
  )
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {toggle('entradas', 'Entradas')}{toggle('saidas', 'Saídas')}{toggle('saldo', 'Saldo')}
        <button onClick={() => setAcc((a) => !a)} aria-pressed={acc} className={`rounded-full border px-3 py-1 text-xs font-medium ${acc ? 'border-brand bg-brand/10' : 'border-line text-muted'}`}>Saldo acumulado</button>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ left: -10, right: 4, top: 4 }}>
            <CartesianGrid vertical={false} stroke={C.line} />
            <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fill: C.muted, fontSize: 12 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: C.muted, fontSize: 12 }} tickFormatter={(v) => brlCompact(Number(v))} />
            <Tooltip formatter={(v) => brl(Number(v))} contentStyle={{ borderRadius: 12, border: `1px solid ${C.line}` }} />
            <Legend />
            {show.entradas && <Bar dataKey="entradas" name="Entradas" fill={C.inc} radius={[4, 4, 0, 0]} />}
            {show.saidas && <Bar dataKey="saidas" name="Saídas" fill={C.exp} radius={[4, 4, 0, 0]} />}
            {show.saldo && <Line type="monotone" dataKey={acc ? 'acumulado' : 'saldo'} name={acc ? 'Saldo acumulado' : 'Saldo'} stroke={C.brand} strokeWidth={2.5} dot={{ r: 3 }} />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
