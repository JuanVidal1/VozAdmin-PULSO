import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ProductInput = {
  organization_id?: string;
  sku?: string;
  name?: string;
  description?: string;
  unit?: string;
  sale_price?: number;
  cost_price?: number;
  stock_quantity?: number;
  minimum_stock?: number;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });

  const organizationId = new URL(request.url).searchParams.get("organization_id");
  if (!organizationId || !UUID_PATTERN.test(organizationId)) {
    return NextResponse.json({ error: "La empresa indicada no es válida." }, { status: 400 });
  }

  const { data, error } = await supabase.from("products")
    .select("id, organization_id, sku, name, description, unit, sale_price, cost_price, stock_quantity, minimum_stock, is_active, created_at, updated_at")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(500);

  if (error) return NextResponse.json({ error: "No fue posible consultar los productos." }, { status: 403 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });

  let body: ProductInput;
  try { body = await request.json() as ProductInput; }
  catch { return NextResponse.json({ error: "El cuerpo JSON no es válido." }, { status: 400 }); }

  const name = body.name?.trim();
  const salePrice = body.sale_price ?? 0;
  const costPrice = body.cost_price ?? 0;
  const stock = body.stock_quantity ?? 0;
  const minimumStock = body.minimum_stock ?? 0;

  if (!body.organization_id || !UUID_PATTERN.test(body.organization_id) ||
      !name || name.length > 180 ||
      !Number.isFinite(salePrice) || salePrice < 0 ||
      !Number.isFinite(costPrice) || costPrice < 0 ||
      !Number.isFinite(stock) || stock < 0 ||
      !Number.isFinite(minimumStock) || minimumStock < 0 ||
      (body.sku && body.sku.length > 80) ||
      (body.unit && body.unit.length > 30) ||
      (body.description && body.description.length > 1000)) {
    return NextResponse.json({ error: "Los datos del producto no son válidos." }, { status: 422 });
  }

  const { data, error } = await supabase.from("products").insert({
    organization_id: body.organization_id,
    sku: body.sku?.trim() || null,
    name,
    description: body.description?.trim() || null,
    unit: body.unit?.trim() || "unidad",
    sale_price: salePrice,
    cost_price: costPrice,
    stock_quantity: stock,
    minimum_stock: minimumStock
  }).select("id, organization_id, sku, name, unit, sale_price, cost_price, stock_quantity, minimum_stock, is_active, created_at").single();

  if (error) return NextResponse.json({ error: "No fue posible guardar el producto. Verifica tus permisos." }, { status: 403 });
  return NextResponse.json({ data }, { status: 201 });
}
