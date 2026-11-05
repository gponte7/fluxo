import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import type { Tx } from '../types'

interface UI { newTx: (t?: Tx) => void; toast: (msg: string, kind?: 'ok' | 'erro') => void; editing: Tx | null | undefined; close: () => void }
const Ctx = createContext<UI>(null!)
export function UIProvider({ children }: { children: ReactNode }) {
  const [editing, setEditing] = useState<Tx | null | undefined>(undefined) // undefined = fechado, null = novo
  const [toasts, setToasts] = useState<{ id: number; msg: string; kind: 'ok' | 'erro' }[]>([])
  const toast = useCallback((msg: string, kind: 'ok' | 'erro' = 'ok') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, msg, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500)
  }, [])
  return (
    <Ctx.Provider value={{ newTx: (t) => setEditing(t ?? null), toast, editing, close: () => setEditing(undefined) }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto flex items-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm text-bg shadow-lg">
            {t.kind === 'ok' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}{t.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
export const useUI = () => useContext(Ctx)
