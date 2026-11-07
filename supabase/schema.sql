-- Execute no SQL Editor do Supabase.
create extension if not exists pgcrypto;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  type text not null check (type in ('entrada','saida')),
  color text not null default '#64748b' check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz not null default now(),
  unique (user_id, type, name)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type text not null check (type in ('entrada','saida')),
  amount numeric(14,2) not null check (amount > 0),
  category_id uuid not null references public.categories(id) on delete restrict,
  description text check (char_length(description) <= 80),
  note text check (char_length(note) <= 300),
  date date not null,
  external_id text,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tx_user on public.transactions (user_id);
create index if not exists idx_tx_user_date on public.transactions (user_id, date desc);
create index if not exists idx_tx_type on public.transactions (user_id, type);
-- Evita importar o mesmo lançamento duas vezes (NULL = lançamento manual).
create unique index if not exists uq_tx_user_external on public.transactions (user_id, external_id);
create index if not exists idx_tx_category on public.transactions (category_id);
create index if not exists idx_cat_user on public.categories (user_id);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_tx_updated on public.transactions;
create trigger trg_tx_updated before update on public.transactions
  for each row execute function public.touch_updated_at();

alter table public.categories enable row level security;
alter table public.transactions enable row level security;

create policy "categorias: dono lê" on public.categories for select using (auth.uid() = user_id);
create policy "categorias: dono cria" on public.categories for insert with check (auth.uid() = user_id);
create policy "categorias: dono edita" on public.categories for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "categorias: dono exclui" on public.categories for delete using (auth.uid() = user_id);

-- A categoria usada precisa ser do mesmo usuário e do mesmo tipo da movimentação.
create policy "movimentações: dono lê" on public.transactions for select using (auth.uid() = user_id);
create policy "movimentações: dono cria" on public.transactions for insert with check (
  auth.uid() = user_id and exists (select 1 from public.categories c where c.id = category_id and c.user_id = auth.uid() and c.type = transactions.type));
create policy "movimentações: dono edita" on public.transactions for update using (auth.uid() = user_id) with check (
  auth.uid() = user_id and exists (select 1 from public.categories c where c.id = category_id and c.user_id = auth.uid() and c.type = transactions.type));
create policy "movimentações: dono exclui" on public.transactions for delete using (auth.uid() = user_id);

-- Categorias padrão para cada novo usuário.
create or replace function public.seed_default_categories(uid uuid) returns void
language sql security definer set search_path = public as $$
  insert into public.categories (user_id, name, type, color) values
    (uid,'Salário','entrada','#16a34a'),(uid,'Freelance','entrada','#0d9488'),(uid,'Investimentos','entrada','#2563eb'),
    (uid,'Rendimentos','entrada','#7c3aed'),(uid,'Venda','entrada','#ca8a04'),(uid,'Outros','entrada','#64748b'),
    (uid,'Alimentação','saida','#ea580c'),(uid,'Moradia','saida','#4f46e5'),(uid,'Transporte','saida','#0891b2'),
    (uid,'Farmácia','saida','#db2777'),(uid,'Saúde','saida','#e11d48'),(uid,'Educação','saida','#7c3aed'),
    (uid,'Lazer','saida','#d97706'),(uid,'Compras','saida','#c026d3'),(uid,'Assinaturas','saida','#2563eb'),
    (uid,'Contas','saida','#0d9488'),(uid,'Cartão de crédito','saida','#475569'),(uid,'Outros','saida','#64748b')
  on conflict do nothing;
$$;
revoke all on function public.seed_default_categories(uuid) from public, anon, authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin perform public.seed_default_categories(new.id); return new; end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Usuários que já existiam antes deste script:
-- select public.seed_default_categories(id) from auth.users;
