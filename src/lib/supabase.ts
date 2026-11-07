import { createClient } from '@supabase/supabase-js'

// Limpa erros comuns no .env: aspas, espaços, "/" no final e caminhos como /rest/v1.
const clean = (v?: string) => v?.trim().replace(/^["']|["']$/g, '').trim()
let url: string | undefined
try { const raw = clean(import.meta.env.VITE_SUPABASE_URL as string | undefined); url = raw ? new URL(raw).origin : undefined } catch { url = undefined }
const key = clean(import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)

export const configured = Boolean(url && key)
export const supabase = createClient(url || 'http://localhost', key || 'anon')
