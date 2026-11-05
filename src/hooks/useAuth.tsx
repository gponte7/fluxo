import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthCtx { session: Session | null; user: User | null; loading: boolean; name: string }
const Ctx = createContext<AuthCtx>({ session: null, user: null, loading: true, name: '' })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  const user = session?.user ?? null
  const name = (user?.user_metadata?.full_name as string) || user?.email?.split('@')[0] || ''
  return <Ctx.Provider value={{ session, user, loading, name }}>{children}</Ctx.Provider>
}
export const useAuth = () => useContext(Ctx)
