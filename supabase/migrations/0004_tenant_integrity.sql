-- VozAdmin migration 0004: enforce tenant consistency across relational records.
-- Apply after 0003_security_and_atomic_transactions.sql.
-- NOT VALID protects all new writes immediately while allowing a separate audit
-- of any legacy rows before validating historical data.

create unique index if not exists uq_contacts_organization_id_id
  on public.contacts(organization_id, id);
create unique index if not exists uq_products_organization_id_id
  on public.products(organization_id, id);
create unique index if not exists uq_sales_organization_id_id
  on public.sales(organization_id, id);
create unique index if not exists uq_purchases_organization_id_id
  on public.purchases(organization_id, id);
create unique index if not exists uq_receivables_organization_id_id
  on public.receivables(organization_id, id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'transactions_contact_same_org_fkey') then
    alter table public.transactions
      add constraint transactions_contact_same_org_fkey
      foreign key (organization_id, contact_id)
      references public.contacts(organization_id, id)
      on delete set null (contact_id) not valid;
  end if;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'sales_customer_same_org_fkey') then
    alter table public.sales
      add constraint sales_customer_same_org_fkey
      foreign key (organization_id, customer_id)
      references public.contacts(organization_id, id)
      on delete set null (customer_id) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'purchases_supplier_same_org_fkey') then
    alter table public.purchases
      add constraint purchases_supplier_same_org_fkey
      foreign key (organization_id, supplier_id)
      references public.contacts(organization_id, id)
      on delete set null (supplier_id) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'sale_items_sale_same_org_fkey') then
    alter table public.sale_items
      add constraint sale_items_sale_same_org_fkey
      foreign key (organization_id, sale_id)
      references public.sales(organization_id, id)
      on delete cascade not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'sale_items_product_same_org_fkey') then
    alter table public.sale_items
      add constraint sale_items_product_same_org_fkey
      foreign key (organization_id, product_id)
      references public.products(organization_id, id)
      on delete set null (product_id) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'purchase_items_purchase_same_org_fkey') then
    alter table public.purchase_items
      add constraint purchase_items_purchase_same_org_fkey
      foreign key (organization_id, purchase_id)
      references public.purchases(organization_id, id)
      on delete cascade not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'purchase_items_product_same_org_fkey') then
    alter table public.purchase_items
      add constraint purchase_items_product_same_org_fkey
      foreign key (organization_id, product_id)
      references public.products(organization_id, id)
      on delete set null (product_id) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'inventory_product_same_org_fkey') then
    alter table public.inventory_movements
      add constraint inventory_product_same_org_fkey
      foreign key (organization_id, product_id)
      references public.products(organization_id, id)
      on delete restrict not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'receivables_customer_same_org_fkey') then
    alter table public.receivables
      add constraint receivables_customer_same_org_fkey
      foreign key (organization_id, customer_id)
      references public.contacts(organization_id, id)
      on delete restrict not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'receivables_sale_same_org_fkey') then
    alter table public.receivables
      add constraint receivables_sale_same_org_fkey
      foreign key (organization_id, sale_id)
      references public.sales(organization_id, id)
      on delete set null (sale_id) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'receivable_payments_receivable_same_org_fkey') then
    alter table public.receivable_payments
      add constraint receivable_payments_receivable_same_org_fkey
      foreign key (organization_id, receivable_id)
      references public.receivables(organization_id, id)
      on delete cascade not valid;
  end if;
end;
$$;

-- Keep modification timestamps consistent for mutable business entities.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'profiles',
    'organizations',
    'contacts',
    'products',
    'transactions',
    'sales',
    'purchases',
    'cash_accounts',
    'receivables'
  ]
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', target_table);
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      target_table
    );
  end loop;
end;
$$;
