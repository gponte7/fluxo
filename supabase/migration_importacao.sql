-- Rode apenas se você já executou o schema.sql anterior (sem importação).
alter table public.transactions add column if not exists external_id text;
alter table public.transactions add column if not exists source text not null default 'manual';
create unique index if not exists uq_tx_user_external on public.transactions (user_id, external_id);
