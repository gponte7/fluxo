import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Wallet } from 'lucide-react'
import { newPasswordSchema, loginSchema, recoverSchema, signupSchema } from '../schemas'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { friendly } from '../utils/format'

type Mode = 'login' | 'signup' | 'recover'
const copy = {
  login: { title: 'Entrar', btn: 'Entrar', schema: loginSchema },
  signup: { title: 'Criar conta', btn: 'Criar conta', schema: signupSchema },
  recover: { title: 'Recuperar senha', btn: 'Enviar link', schema: recoverSchema },
}
function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-sm !p-6">
        <div className="mb-6 flex items-center gap-2 font-display text-xl font-bold"><Wallet className="text-brand" />Fluxo</div>
        <h1 className="mb-4 text-lg font-semibold">{title}</h1>{children}
      </div>
    </div>
  )
}
export function AuthPage({ mode }: { mode: Mode }) {
  const { user } = useAuth()
  const nav = useNavigate()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const c = copy[mode]
  const { register, handleSubmit, formState: { errors } } = useForm<Record<string, string>>({ resolver: zodResolver(c.schema) as never })
  if (user) return <Navigate to="/" replace />
  const onSubmit = handleSubmit(async (v) => {
    setBusy(true); setMsg(null)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: v.email, password: v.password })
        if (error) throw error
        nav('/')
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email: v.email, password: v.password, options: { data: { full_name: v.name } } })
        if (error) throw error
        if (!data.session) setMsg({ ok: true, text: 'Conta criada! Confirme seu e-mail para entrar.' }); else nav('/')
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(v.email, { redirectTo: `${window.location.origin}/redefinir-senha` })
        if (error) throw error
        setMsg({ ok: true, text: 'Se o e-mail existir, enviamos um link para redefinir a senha.' })
      }
    } catch (e) { setMsg({ ok: false, text: friendly(e) }) } finally { setBusy(false) }
  })
  const field = (name: string, label: string, type = 'text', auto?: string) => (
    <div><label className="label" htmlFor={name}>{label}</label><input id={name} type={type} autoComplete={auto} className="input" {...register(name)} />{errors[name] && <p className="err">{String(errors[name]?.message)}</p>}</div>
  )
  return (
    <Shell title={c.title}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {mode === 'signup' && field('name', 'Nome', 'text', 'name')}
        {field('email', 'E-mail', 'email', 'email')}
        {mode === 'signup' && field('confirmEmail', 'Confirme o e-mail', 'email', 'off')}
        {mode !== 'recover' && field('password', 'Senha', 'password', mode === 'login' ? 'current-password' : 'new-password')}
        {mode === 'signup' && field('confirmPassword', 'Confirme a senha', 'password', 'new-password')}
        {msg && <p className={`text-sm ${msg.ok ? 'text-inc' : 'text-exp'}`} role="alert">{msg.text}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Aguarde…' : c.btn}</button>
      </form>
      <div className="mt-4 flex flex-col gap-1 text-sm text-muted">
        {mode === 'login' && <><Link className="text-brand" to="/recuperar">Esqueci minha senha</Link><span>Novo por aqui? <Link className="text-brand" to="/cadastro">Criar conta</Link></span></>}
        {mode !== 'login' && <Link className="text-brand" to="/entrar">Voltar para o login</Link>}
      </div>
    </Shell>
  )
}
export function ResetPassword() {
  const nav = useNavigate()
  const { user, loading } = useAuth()
  const [msg, setMsg] = useState('')
  const { register, handleSubmit, formState: { errors } } = useForm<{ password: string; confirmPassword: string }>({ resolver: zodResolver(newPasswordSchema) })
  const onSubmit = handleSubmit(async ({ password }) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setMsg(friendly(error)); else nav('/')
  })
  return (
    <Shell title="Nova senha">
      {!loading && !user ? <p className="text-sm text-exp">Link inválido ou expirado. <Link className="text-brand" to="/recuperar">Solicitar outro</Link></p> : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div><label className="label" htmlFor="p">Nova senha</label><input id="p" type="password" autoComplete="new-password" className="input" {...register('password')} />{errors.password && <p className="err">{errors.password.message}</p>}</div>
          <div><label className="label" htmlFor="p2">Confirme a nova senha</label><input id="p2" type="password" autoComplete="new-password" className="input" {...register('confirmPassword')} />{errors.confirmPassword && <p className="err">{errors.confirmPassword.message}</p>}</div>
          {msg && <p className="text-sm text-exp" role="alert">{msg}</p>}
          <button className="btn-primary w-full">Salvar nova senha</button>
        </form>)}
    </Shell>
  )
}
