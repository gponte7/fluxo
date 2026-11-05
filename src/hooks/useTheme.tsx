import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
const Ctx = createContext({ dark: false, toggle: () => {} })
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(() => localStorage.getItem('tema') === 'escuro')
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('tema', dark ? 'escuro' : 'claro') // apenas preferência visual
  }, [dark])
  return <Ctx.Provider value={{ dark, toggle: () => setDark((d) => !d) }}>{children}</Ctx.Provider>
}
export const useTheme = () => useContext(Ctx)
export const useColors = () => {
  const { dark } = useTheme()
  return dark
    ? { inc: '#3ec98d', exp: '#f47286', brand: '#84a2f5', line: '#26332e', muted: '#94a39b' }
    : { inc: '#178a5b', exp: '#c83952', brand: '#27407f', line: '#dde3de', muted: '#5e6b64' }
}
