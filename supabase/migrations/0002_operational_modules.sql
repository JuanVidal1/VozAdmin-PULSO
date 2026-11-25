-- VozAdmin: operational modules and role-aware authorization.
-- Apply after 0001_initial_schema.sql in Supabase SQL Editor.

create or replace function public.has_organization_role(
  target_organization uuid,
  allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = target_organization
      and m.user_id = (select auth.uid())
      and m.role = any(allowed_roles)
  );
$$;

-- Tighten write permissions on core records. Viewers remain read-only.
drop policy if exists "Members can manage contacts" on public.contacts;
create policy "Authorized roles can manage contacts" on public.contacts
for all to authenticated
using (public.has_organization_role(organization_id, array['owner','admin','manager','operator']))
with check (public.has_organization_role(organization_id, array['owner','admin','manager','operator']));

drop policy if exists "Members can manage products" on public.products;
create policy "Authorized roles can manage products" on public.products
for all to authenticated
using (public.has_organization_role(organization_id, array['owner','admin','manager']))
with check (public.has_organization_role(organization_id, array['owner','admin','manager']));

drop policy if exists "Members can manage transactions" on public.transactions;
create policy "Authorized roles can manage transactions" on public.transactions
for all to authenticated
using (
  public.has_organization_role(organization_id, array['owner','admin','manager','operator'])
  and created_by = (select auth.uid())
)
with check (
  public.has_organization_role(organization_id, array['owner','admin','manager','operator'])
  and created_by = (select auth.uid())
);

-- Sales and line items.
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  customer_id uuid references public.contacts(id) on delete set null,
  sale_number text,
  status text not null default 'completed' check (status in ('draft','completed','cancelled','refunded')),
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  discount numeric(14,2) not null default 0 check (discount >= 0),
  tax numeric(14,2) not null default 0 check (tax >= 0),
  total numeric(14,2) not null check (total >= 0),
  payment_method text check (payment_method in ('cash','bank_transfer','card','credit','other')),
  sold_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, sale_number)
);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  description text not null,
  quantity numeric(14,3) not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  discount numeric(14,2) not null default 0 check (discount >= 0),
  line_total numeric(14,2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

-- Supplier purchases and their line items.
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  supplier_id uuid references public.contacts(id) on delete set null,
  purchase_number text,
  status text not null default 'received' check (status in ('draft','ordered','received','cancelled')),
  subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
  tax numeric(14,2) not null default 0 check (tax >= 0),
  total numeric(14,2) not null check (total >= 0),
  purchased_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, purchase_number)
);

create table if not exists public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  description text not null,
  quantity numeric(14,3) not null check (quantity > 0),
  unit_cost numeric(14,2) not null check (unit_cost >= 0),
  line_total numeric(14,2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

-- Stock ledger: every adjustment is traceable to a source and user.
create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  movement_type text not null check (movement_type in ('opening','purchase','sale','adjustment_in','adjustment_out','return')),
  quantity numeric(14,3) not null check (quantity > 0),
  unit_cost numeric(14,2) check (unit_cost is null or unit_cost >= 0),
  source_type text,
  source_id uuid,
  notes text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Cash and bank accounts.
create table if not exists public.cash_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 100),
  account_type text not null check (account_type in ('cash','bank','digital_wallet','other')),
  opening_balance numeric(14,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Accounts receivable and payment history.
create table if not exists public.receivables (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.contacts(id) on delete restrict,
  sale_id uuid references public.sales(id) on delete set null,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  description text not null,
  amount numeric(14,2) not null check (amount > 0),
  balance numeric(14,2) not null check (balance >= 0 and balance <= amount),
  due_date date,
  status text not null default 'open' check (status in ('open','partial','paid','overdue','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.receivable_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  receivable_id uuid not null references public.receivables(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  payment_method text not null check (payment_method in ('cash','bank_transfer','card','other')),
  paid_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_sales_org_date on public.sales(organization_id, sold_at desc);
create index if not exists idx_sale_items_sale on public.sale_items(sale_id);
create index if not exists idx_purchases_org_date on public.purchases(organization_id, purchased_at desc);
create index if not exists idx_purchase_items_purchase on public.purchase_items(purchase_id);
create index if not exists idx_inventory_org_product_date on public.inventory_movements(organization_id, product_id, occurred_at desc);
create index if not exists idx_cash_accounts_org_active on public.cash_accounts(organization_id, is_active);
create index if not exists idx_receivables_org_status_due on public.receivables(organization_id, status, due_date);
create index if not exists idx_receivable_payments_receivable on public.receivable_payments(receivable_id, paid_at desc);

alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.cash_accounts enable row level security;
alter table public.receivables enable row level security;
alter table public.receivable_payments enable row level security;

-- Every query is tenant-scoped by PostgreSQL RLS, not by frontend filtering.
create policy "Members read sales" on public.sales
for select to authenticated using (public.is_organization_member(organization_id));
create policy "Operators create sales" on public.sales
for insert to authenticated with check (
  public.has_organization_role(organization_id, array['owner','admin','manager','operator'])
  and created_by = (select auth.uid())
);
create policy "Managers update sales" on public.sales
for update to authenticated using (public.has_organization_role(organization_id, array['owner','admin','manager']))
with check (public.has_organization_role(organization_id, array['owner','admin','manager']));

create policy "Members read sale items" on public.sale_items
for select to authenticated using (public.is_organization_member(organization_id));
create policy "Operators manage sale items" on public.sale_items
for all to authenticated using (public.has_organization_role(organization_id, array['owner','admin','manager','operator']))
with check (public.has_organization_role(organization_id, array['owner','admin','manager','operator']));

create policy "Members read purchases" on public.purchases
for select to authenticated using (public.is_organization_member(organization_id));
create policy "Managers manage purchases" on public.purchases
for all to authenticated using (public.has_organization_role(organization_id, array['owner','admin','manager']))
with check (public.has_organization_role(organization_id, array['owner','admin','manager']));

create policy "Members read purchase items" on public.purchase_items
for select to authenticated using (public.is_organization_member(organization_id));
create policy "Managers manage purchase items" on public.purchase_items
for all to authenticated using (public.has_organization_role(organization_id, array['owner','admin','manager']))
with check (public.has_organization_role(organization_id, array['owner','admin','manager']));

create policy "Members read inventory movements" on public.inventory_movements
for select to authenticated using (public.is_organization_member(organization_id));
create policy "Managers manage inventory movements" on public.inventory_movements
for all to authenticated using (public.has_organization_role(organization_id, array['owner','admin','manager']))
with check (
  public.has_organization_role(organization_id, array['owner','admin','manager'])
  and created_by = (select auth.uid())
);

create policy "Members read cash accounts" on public.cash_accounts
for select to authenticated using (public.is_organization_member(organization_id));
create policy "Managers manage cash accounts" on public.cash_accounts
for all to authenticated using (public.has_organization_role(organization_id, array['owner','admin','manager']))
with check (public.has_organization_role(organization_id, array['owner','admin','manager']));

create policy "Members read receivables" on public.receivables
for select to authenticated using (public.is_organization_member(organization_id));
create policy "Operators manage receivables" on public.receivables
for all to authenticated using (public.has_organization_role(organization_id, array['owner','admin','manager','operator']))
with check (
  public.has_organization_role(organization_id, array['owner','admin','manager','operator'])
  and created_by = (select auth.uid())
);

create policy "Members read receivable payments" on public.receivable_payments
for select to authenticated using (public.is_organization_member(organization_id));
create policy "Operators create receivable payments" on public.receivable_payments
for insert to authenticated with check (
  public.has_organization_role(organization_id, array['owner','admin','manager','operator'])
  and created_by = (select auth.uid())
);
