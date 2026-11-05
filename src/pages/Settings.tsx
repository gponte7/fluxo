import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LogOut, Moon, Sun } from 'lucide-react'
import { emailSchema, nameSchema, newPasswordSchema } from '../schemas'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { useUI } from '../hooks/useUI'
import { PageHeader } from '../components/ui'
import { friendly } from '../utils/format'

export default function Settings() {
  const { user, name } = useAuth()
  const { dark, toggle } = useTheme()
  const { toast } = useUI()
  const nav = useNavigate()
  const n = useForm<{ name: string }>({ resolver: zodResolver(nameSchema), defaultValues: { name } })
  const e = useForm<{ email: string }>({ resolver: zodResolver(emailSchema), defaultValues: { email: user?.email } })
  const p = useForm<{ password: string }>({ resolver: zodResolver(newPasswordSchema) })
  useEffect(() => { n.reset({ name }) }, [name]) // eslint-disable-line
  const run = async (fn: () => Promise<{ error: unknown }>, ok: string, after?: () => void) => {
    const { error } = await fn(); if (error) toast(friendly(error), 'erro'); else { toast(ok); after?.() }
  }
  const Sec = ({ title, children }: { title: string; children: React.ReactNode }) => <section className="card"><h2 className="mb-3 font-display text-lg font-bold">{title}</h2>{children}</section>
  return (
    <>
      <PageHeader title="Configurações" />
      <div className="grid max-w-2xl gap-4">
        <Sec title="Perfil">
          <form className="space-y-3" noValidate onSubmit={n.handleSubmit((v) => run(() => supabase.auth.updateUser({ data: { full_name: v.name } }), 'Nome atualizado.'))}>
            <div><label className="label" htmlFor="nm">Nome</label><input id="nm" className="input" {...n.register('name')} />{n.formState.errors.name && <p className="err">{n.formState.errors.name.message}</p>}</div>
            <button className="btn-primary">Salvar nome</button>
          </form>
        </Sec>
        <Sec title="E-mail">
          <form className="space-y-3" noValidate onSubmit={e.handleSubmit((v) => run(() => supabase.auth.updateUser({ email: v.email }), 'Enviamos um link de confirmação para o novo e-mail.'))}>
            <input aria-label="E-mail" type="email" className="input" {...e.register('email')} />{e.formState.errors.email && <p className="err">{e.formState.errors.email.message}</p>}
            <button className="btn-primary">Alterar e-mail</button>
          </form>
        </Sec>
        <Sec title="Senha">
          <form className="space-y-3" noValidate onSubmit={p.handleSubmit((v) => run(() => supabase.auth.updateUser({ password: v.password }), 'Senha alterada.', () => p.reset()))}>
            <input aria-label="Nova senha" type="password" autoComplete="new-password" placeholder="Nova senha" className="input" {...p.register('password')} />{p.formState.errors.password && <p className="err">{p.formState.errors.password.message}</p>}
            <button className="btn-primary">Alterar senha</button>
          </form>
        </Sec>
        <Sec title="Aparência e categorias">
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost" onClick={toggle}>{dark ? <Sun size={16} /> : <Moon size={16} />}{dark ? 'Usar tema claro' : 'Usar tema escuro'}</button>
            <Link to="/categorias" className="btn-ghost">Gerenciar categorias</Link>
          </div>
        </Sec>
        <button className="btn-ghost w-fit text-exp" onClick={async () => { await supabase.auth.signOut(); nav('/entrar') }}><LogOut size={16} />Sair da conta</button>
      </div>
    </>
  )
}
