-- VozAdmin: initial multi-tenant schema for Supabase/PostgreSQL.
-- Apply this migration in the Supabase SQL Editor or with Supabase CLI.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  legal_name text,
  tax_id text,
  country_code char(2) not null default 'CO',
  currency_code char(3) not null default 'COP',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','admin','manager','operator','viewer')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create or replace function public.is_organization_member(target_organization uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = target_organization
      and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_organization_admin(target_organization uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = target_organization
      and m.user_id = (select auth.uid())
      and m.role in ('owner','admin')
  );
$;

create or replace function public.add_organization_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.organization_members (organization_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict (organization_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_organization_created on public.organizations;
create trigger on_organization_created
after insert on public.organizations
for each row execute function public.add_organization_owner();

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_type text not null check (contact_type in ('customer','supplier','both')),
  name text not null check (char_length(trim(name)) between 1 and 160),
  document_type text,
  document_number text,
  email text,
  phone text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sku text,
  name text not null check (char_length(trim(name)) between 1 and 180),
  description text,
  unit text not null default 'unidad',
  sale_price numeric(14,2) not null default 0 check (sale_price >= 0),
  cost_price numeric(14,2) not null default 0 check (cost_price >= 0),
  stock_quantity numeric(14,3) not null default 0,
  minimum_stock numeric(14,3) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  transaction_type text not null check (transaction_type in ('income','expense')),
  category text not null default 'general',
  description text not null check (char_length(trim(description)) between 1 and 240),
  amount numeric(14,2) not null check (amount > 0),
  payment_method text check (payment_method in ('cash','bank_transfer','card','other')),
  transaction_date date not null default current_date,
  contact_id uuid references public.contacts(id) on delete set null,
  notes text,
  source text not null default 'manual' check (source in ('manual','pulso','import')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_org_members_user on public.organization_members(user_id);
create index if not exists idx_contacts_org_type on public.contacts(organization_id, contact_type);
create index if not exists idx_products_org_active on public.products(organization_id, is_active);
create index if not exists idx_transactions_org_date on public.transactions(organization_id, transaction_date desc);
create index if not exists idx_audit_logs_org_created on public.audit_logs(organization_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.contacts enable row level security;
alter table public.products enable row level security;
alter table public.transactions enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles
for select to authenticated using (id = (select auth.uid()));
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "Members can read organizations" on public.organizations;
create policy "Members can read organizations" on public.organizations
for select to authenticated using (public.is_organization_member(id));
drop policy if exists "Authenticated users can create organizations" on public.organizations;
create policy "Authenticated users can create organizations" on public.organizations
for insert to authenticated with check (created_by = (select auth.uid()));
drop policy if exists "Owners and admins can update organizations" on public.organizations;
create policy "Owners and admins can update organizations" on public.organizations
for update to authenticated using (
  exists (select 1 from public.organization_members m where m.organization_id = id and m.user_id = (select auth.uid()) and m.role in ('owner','admin'))
) with check (public.is_organization_member(id));

drop policy if exists "Members can read memberships" on public.organization_members;
create policy "Members can read memberships" on public.organization_members
for select to authenticated using (public.is_organization_member(organization_id));
drop policy if exists "Owners and admins can manage memberships" on public.organization_members;
create policy "Owners and admins can manage memberships" on public.organization_members
for all to authenticated using (public.is_organization_admin(organization_id))
with check (public.is_organization_admin(organization_id));

drop policy if exists "Members can manage contacts" on public.contacts;
create policy "Members can manage contacts" on public.contacts
for all to authenticated using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));

drop policy if exists "Members can manage products" on public.products;
create policy "Members can manage products" on public.products
for all to authenticated using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));

drop policy if exists "Members can manage transactions" on public.transactions;
create policy "Members can manage transactions" on public.transactions
for all to authenticated using (public.is_organization_member(organization_id))
with check (
  public.is_organization_member(organization_id)
  and created_by = (select auth.uid())
);

drop policy if exists "Members can read audit logs" on public.audit_logs;
create policy "Members can read audit logs" on public.audit_logs
for select to authenticated using (public.is_organization_member(organization_id));
drop policy if exists "Members can append audit logs" on public.audit_logs;
create policy "Members can append audit logs" on public.audit_logs
for insert to authenticated with check (
  public.is_organization_member(organization_id)
  and actor_user_id = (select auth.uid())
);

-- Keep profile rows in sync with Supabase Auth users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;

  if nullif(trim(new.raw_user_meta_data ->> 'business_name'), '') is not null then
    insert into public.organizations (name, created_by)
    values (trim(new.raw_user_meta_data ->> 'business_name'), new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
