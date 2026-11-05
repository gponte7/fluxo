import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './hooks/useAuth'
import { ThemeProvider } from './hooks/useTheme'
import AppLayout from './layouts/AppLayout'
import { AuthPage, ResetPassword } from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Annual from './pages/Annual'
import Categories from './pages/Categories'
import Reports from './pages/Reports'
import ImportPage from './pages/Import'
import Settings from './pages/Settings'
import { configured } from './lib/supabase'

function Setup() {
  return <div className="mx-auto max-w-lg p-8"><h1 className="font-display text-2xl font-bold">Configure o Supabase</h1><p className="mt-2 text-sm text-muted">Crie o arquivo <code>.env</code> a partir do <code>.env.example</code>, preencha <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> e reinicie o servidor.</p></div>
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      {!configured ? <Setup /> : (
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/entrar" element={<AuthPage mode="login" />} />
              <Route path="/cadastro" element={<AuthPage mode="signup" />} />
              <Route path="/recuperar" element={<AuthPage mode="recover" />} />
              <Route path="/redefinir-senha" element={<ResetPassword />} />
              <Route element={<AppLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="movimentacoes" element={<Transactions />} />
                <Route path="visao-anual" element={<Annual />} />
                <Route path="relatorios" element={<Reports />} />
                <Route path="importar" element={<ImportPage />} />
                <Route path="categorias" element={<Categories />} />
                <Route path="configuracoes" element={<Settings />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      )}
    </ThemeProvider>
  </StrictMode>,
)
