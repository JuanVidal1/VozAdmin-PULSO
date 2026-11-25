-- VozAdmin migration 0005: audited contact creation and inventory opening balances.
-- Apply after 0004_tenant_integrity.sql.

create or replace function public.create_contact_with_audit(
  p_organization_id uuid,
  p_contact_type text,
  p_name text,
  p_document_type text,
  p_document_number text,
  p_email text,
  p_phone text,
  p_address text,
  p_notes text
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_contact public.contacts%rowtype;
begin
  if v_user_id is null then
    raise exception 'No autenticado.' using errcode = '42501';
  end if;
  if p_contact_type not in ('customer','supplier','both')
     or length(trim(coalesce(p_name,''))) not between 1 and 160 then
    raise exception 'Los datos del contacto no son válidos.' using errcode = '22023';
  end if;

  insert into public.contacts (
    organization_id, contact_type, name, document_type, document_number,
    email, phone, address, notes
  ) values (
    p_organization_id, p_contact_type, trim(p_name),
    nullif(trim(p_document_type), ''), nullif(trim(p_document_number), ''),
    nullif(lower(trim(p_email)), ''), nullif(trim(p_phone), ''),
    nullif(trim(p_address), ''), nullif(trim(p_notes), '')
  )
  returning * into v_contact;

  insert into public.audit_logs (
    organization_id, actor_user_id, action, entity_type, entity_id, details
  ) values (
    p_organization_id, v_user_id, 'contact.created', 'contact',
    v_contact.id::text,
    jsonb_build_object('contact_type',v_contact.contact_type,'name',v_contact.name)
  );

  return jsonb_build_object(
    'id',v_contact.id,
    'organization_id',v_contact.organization_id,
    'contact_type',v_contact.contact_type,
    'name',v_contact.name,
    'document_type',v_contact.document_type,
    'document_number',v_contact.document_number,
    'email',v_contact.email,
    'phone',v_contact.phone,
    'address',v_contact.address,
    'notes',v_contact.notes,
    'created_at',v_contact.created_at
  );
end;
$$;

revoke all on function public.create_contact_with_audit(uuid,text,text,text,text,text,text,text,text) from public;
grant execute on function public.create_contact_with_audit(uuid,text,text,text,text,text,text,text,text) to authenticated;

create or replace function public.create_product_with_opening_stock(
  p_organization_id uuid,
  p_sku text,
  p_name text,
  p_description text,
  p_unit text,
  p_sale_price numeric,
  p_cost_price numeric,
  p_stock_quantity numeric,
  p_minimum_stock numeric
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_product public.products%rowtype;
begin
  if v_user_id is null then
    raise exception 'No autenticado.' using errcode = '42501';
  end if;
  if not public.has_organization_role(
    p_organization_id, array['owner','admin','manager']
  ) then
    raise exception 'No tienes permisos para administrar el inventario.'
      using errcode = '42501';
  end if;
  if length(trim(coalesce(p_name,''))) not between 1 and 180
     or coalesce(p_sale_price,0) < 0
     or coalesce(p_cost_price,0) < 0
     or coalesce(p_stock_quantity,0) < 0
     or coalesce(p_minimum_stock,0) < 0 then
    raise exception 'Los datos del producto no son válidos.' using errcode = '22023';
  end if;

  insert into public.products (
    organization_id, sku, name, description, unit, sale_price,
    cost_price, stock_quantity, minimum_stock
  ) values (
    p_organization_id, nullif(trim(p_sku), ''), trim(p_name),
    nullif(trim(p_description), ''), coalesce(nullif(trim(p_unit), ''),'unidad'),
    coalesce(p_sale_price,0), coalesce(p_cost_price,0),
    coalesce(p_stock_quantity,0), coalesce(p_minimum_stock,0)
  )
  returning * into v_product;

  if v_product.stock_quantity > 0 then
    insert into public.inventory_movements (
      organization_id, product_id, created_by, movement_type,
      quantity, unit_cost, source_type, source_id, notes
    ) values (
      p_organization_id, v_product.id, v_user_id, 'opening',
      v_product.stock_quantity, v_product.cost_price,
      'product_opening', v_product.id, 'Saldo inicial al crear el producto'
    );
  end if;

  insert into public.audit_logs (
    organization_id, actor_user_id, action, entity_type, entity_id, details
  ) values (
    p_organization_id, v_user_id, 'product.created', 'product',
    v_product.id::text,
    jsonb_build_object(
      'name',v_product.name,
      'sku',v_product.sku,
      'opening_stock',v_product.stock_quantity
    )
  );

  return jsonb_build_object(
    'id',v_product.id,
    'organization_id',v_product.organization_id,
    'sku',v_product.sku,
    'name',v_product.name,
    'description',v_product.description,
    'unit',v_product.unit,
    'sale_price',v_product.sale_price,
    'cost_price',v_product.cost_price,
    'stock_quantity',v_product.stock_quantity,
    'minimum_stock',v_product.minimum_stock,
    'is_active',v_product.is_active,
    'created_at',v_product.created_at
  );
end;
$$;

revoke all on function public.create_product_with_opening_stock(uuid,text,text,text,text,numeric,numeric,numeric,numeric) from public;
grant execute on function public.create_product_with_opening_stock(uuid,text,text,text,text,numeric,numeric,numeric,numeric) to authenticated;
