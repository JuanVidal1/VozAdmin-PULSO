-- VozAdmin migration 0003: explicit tenant permissions and atomic financial entries.
-- Apply after 0002_operational_modules.sql.

-- Members may read contacts/products; only operational roles may mutate them.
drop policy if exists "Authorized roles can manage contacts" on public.contacts;
drop policy if exists "Members can read contacts" on public.contacts;
drop policy if exists "Operators can insert contacts" on public.contacts;
drop policy if exists "Managers can update contacts" on public.contacts;
drop policy if exists "Managers can delete contacts" on public.contacts;

create policy "Members can read contacts" on public.contacts
for select to authenticated using (public.is_organization_member(organization_id));
create policy "Operators can insert contacts" on public.contacts
for insert to authenticated with check (
  public.has_organization_role(organization_id, array['owner','admin','manager','operator'])
);
create policy "Managers can update contacts" on public.contacts
for update to authenticated
using (public.has_organization_role(organization_id, array['owner','admin','manager']))
with check (public.has_organization_role(organization_id, array['owner','admin','manager']));
create policy "Managers can delete contacts" on public.contacts
for delete to authenticated using (
  public.has_organization_role(organization_id, array['owner','admin','manager'])
);

drop policy if exists "Authorized roles can manage products" on public.products;
drop policy if exists "Members can read products" on public.products;
drop policy if exists "Managers can insert products" on public.products;
drop policy if exists "Managers can update products" on public.products;
drop policy if exists "Managers can delete products" on public.products;

create policy "Members can read products" on public.products
for select to authenticated using (public.is_organization_member(organization_id));
create policy "Managers can insert products" on public.products
for insert to authenticated with check (
  public.has_organization_role(organization_id, array['owner','admin','manager'])
);
create policy "Managers can update products" on public.products
for update to authenticated
using (public.has_organization_role(organization_id, array['owner','admin','manager']))
with check (public.has_organization_role(organization_id, array['owner','admin','manager']));
create policy "Managers can delete products" on public.products
for delete to authenticated using (
  public.has_organization_role(organization_id, array['owner','admin','manager'])
);

-- Financial movements are readable by every member, but append-only.
drop policy if exists "Authorized roles can manage transactions" on public.transactions;
drop policy if exists "Members can read transactions" on public.transactions;
drop policy if exists "Operators can insert transactions" on public.transactions;
create policy "Members can read transactions" on public.transactions
for select to authenticated using (public.is_organization_member(organization_id));
create policy "Operators can insert transactions" on public.transactions
for insert to authenticated with check (
  public.has_organization_role(organization_id, array['owner','admin','manager','operator'])
  and created_by = (select auth.uid())
);

-- Audit history is immutable to application users.
drop policy if exists "Members can read audit logs" on public.audit_logs;
drop policy if exists "Members can append audit logs" on public.audit_logs;
create policy "Members can read audit logs" on public.audit_logs
for select to authenticated using (public.is_organization_member(organization_id));
create policy "Members can append audit logs" on public.audit_logs
for insert to authenticated with check (
  public.has_organization_role(organization_id, array['owner','admin','manager','operator'])
  and actor_user_id = (select auth.uid())
);

-- One RPC guarantees that the financial movement and its audit event commit together.
create or replace function public.create_transaction_with_audit(
  p_organization_id uuid,
  p_transaction_type text,
  p_category text,
  p_description text,
  p_amount numeric,
  p_payment_method text,
  p_transaction_date date,
  p_notes text
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_transaction public.transactions%rowtype;
begin
  if v_user_id is null then
    raise exception 'No autenticado.' using errcode = '42501';
  end if;

  if not public.has_organization_role(
    p_organization_id,
    array['owner','admin','manager','operator']
  ) then
    raise exception 'No tienes permisos para registrar movimientos en esta empresa.'
      using errcode = '42501';
  end if;

  if p_transaction_type not in ('income','expense')
     or p_amount is null or p_amount <= 0
     or length(trim(coalesce(p_description, ''))) not between 1 and 240
     or (p_payment_method is not null and p_payment_method not in ('cash','bank_transfer','card','other')) then
    raise exception 'Los datos del movimiento no son válidos.' using errcode = '22023';
  end if;

  insert into public.transactions (
    organization_id, created_by, transaction_type, category, description,
    amount, payment_method, transaction_date, notes, source
  ) values (
    p_organization_id, v_user_id, p_transaction_type,
    coalesce(nullif(trim(p_category), ''), 'general'),
    trim(p_description), p_amount, p_payment_method,
    coalesce(p_transaction_date, current_date), nullif(trim(p_notes), ''), 'manual'
  )
  returning * into v_transaction;

  insert into public.audit_logs (
    organization_id, actor_user_id, action, entity_type, entity_id, details
  ) values (
    p_organization_id, v_user_id, 'transaction.created', 'transaction',
    v_transaction.id::text,
    jsonb_build_object(
      'transaction_type', v_transaction.transaction_type,
      'amount', v_transaction.amount,
      'source', v_transaction.source
    )
  );

  return jsonb_build_object(
    'id', v_transaction.id,
    'organization_id', v_transaction.organization_id,
    'transaction_type', v_transaction.transaction_type,
    'category', v_transaction.category,
    'description', v_transaction.description,
    'amount', v_transaction.amount,
    'payment_method', v_transaction.payment_method,
    'transaction_date', v_transaction.transaction_date,
    'notes', v_transaction.notes,
    'created_at', v_transaction.created_at
  );
end;
$$;

revoke all on function public.create_transaction_with_audit(uuid,text,text,text,numeric,text,date,text) from public;
grant execute on function public.create_transaction_with_audit(uuid,text,text,text,numeric,text,date,text) to authenticated;

-- Helpful indexes for the most common tenant-scoped views.
create index if not exists idx_transactions_org_type_date
  on public.transactions(organization_id, transaction_type, transaction_date desc);
create index if not exists idx_audit_logs_org_entity
  on public.audit_logs(organization_id, entity_type, entity_id);
