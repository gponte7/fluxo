import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
export type ThemePref = 'sistema' | 'claro' | 'escuro'
const KEY = 'preferencia-tema'
const query = '(prefers-color-scheme: dark)'
const Ctx = createContext<{ dark: boolean; pref: ThemePref; setPref: (p: ThemePref) => void }>({ dark: false, pref: 'sistema', setPref: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPref] = useState<ThemePref>(() => { try { const v = localStorage.getItem(KEY); return v === 'claro' || v === 'escuro' ? v : 'sistema' } catch { return 'sistema' } })
  const [sys, setSys] = useState(() => window.matchMedia(query).matches)
  useEffect(() => { // acompanha o tema do aparelho em tempo real
    const mq = window.matchMedia(query); const on = () => setSys(mq.matches)
    mq.addEventListener('change', on); return () => mq.removeEventListener('change', on)
  }, [])
  const dark = pref === 'escuro' || (pref === 'sistema' && sys)
  useEffect(() => { document.documentElement.classList.toggle('dark', dark); document.documentElement.style.colorScheme = dark ? 'dark' : 'light' }, [dark])
  useEffect(() => { try { localStorage.setItem(KEY, pref) } catch { /* ignora */ } }, [pref])
  return <Ctx.Provider value={{ dark, pref, setPref }}>{children}</Ctx.Provider>
}
export const useTheme = () => useContext(Ctx)
export const useColors = () => {
  const { dark } = useTheme()
  return dark
    ? { inc: '#3ec98d', exp: '#f47286', brand: '#84a2f5', line: '#26332e', muted: '#94a39b' }
    : { inc: '#178a5b', exp: '#c83952', brand: '#27407f', line: '#dde3de', muted: '#5e6b64' }
}
