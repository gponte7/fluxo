import { z } from 'zod'
export const txSchema = z.object({
  type: z.enum(['entrada', 'saida']),
  amount: z.number({ invalid_type_error: 'Informe o valor' }).positive('O valor deve ser maior que zero').max(999_999_999, 'Valor muito alto'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe uma data válida'),
  category_id: z.string().uuid('Escolha uma categoria'),
  description: z.string().trim().max(80, 'Máximo de 80 caracteres').optional(),
  note: z.string().trim().max(300, 'Máximo de 300 caracteres').optional(),
})
export type TxForm = z.infer<typeof txSchema>
const email = z.string().trim().email('E-mail inválido')
const senha = z.string().min(8, 'Use pelo menos 8 caracteres')
export const loginSchema = z.object({ email, password: z.string().min(1, 'Informe a senha') })
export const signupSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome').max(60),
  email, confirmEmail: z.string().trim().min(1, 'Confirme o e-mail'),
  password: senha, confirmPassword: z.string().min(1, 'Confirme a senha'),
}).superRefine((v, ctx) => {
  if (v.email.toLowerCase() !== v.confirmEmail.toLowerCase()) ctx.addIssue({ code: 'custom', path: ['confirmEmail'], message: 'Os e-mails não coincidem' })
  if (v.password !== v.confirmPassword) ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'As senhas não coincidem' })
})
export const recoverSchema = z.object({ email })
export const newPasswordSchema = z.object({ password: senha, confirmPassword: z.string().min(1, 'Confirme a senha') })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'As senhas não coincidem' })
export const nameSchema = z.object({ name: z.string().trim().min(2, 'Informe seu nome').max(60) })
export const emailSchema = z.object({ email })
export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome').max(40, 'Máximo de 40 caracteres'),
  type: z.enum(['entrada', 'saida']),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida'),
})
export type CategoryForm = z.infer<typeof categorySchema>
