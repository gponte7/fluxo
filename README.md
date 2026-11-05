# Meu Dinheiro — organização financeira pessoal

React + TypeScript + Vite + Tailwind + Supabase.

## Como rodar
1. Crie um projeto no Supabase e rode `supabase/schema.sql` no SQL Editor (tabelas, índices, RLS e categorias padrão automáticas para novos usuários).
2. Em Authentication > URL Configuration, adicione `http://localhost:5173/redefinir-senha` às Redirect URLs.
3. `cp .env.example .env` e preencha URL e anon key.
4. `npm install && npm run dev`

Usuários criados antes do script: `select public.seed_default_categories(id) from auth.users;`
