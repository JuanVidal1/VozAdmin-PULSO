import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type OrganizationInput = {
  name?: string;
  legal_name?: string;
  tax_id?: string;
  country_code?: string;
  currency_code?: string;
};

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("organization_members")
    .select("role, organization:organizations(id, name, legal_name, tax_id, country_code, currency_code, created_at)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "No fue posible consultar tus empresas." }, { status: 403 });
  }

  return NextResponse.json({
    data: (data ?? []).map((membership) => ({
      role: membership.role,
      organization: membership.organization
    }))
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  let body: OrganizationInput;
  try {
    body = await request.json() as OrganizationInput;
  } catch {
    return NextResponse.json({ error: "El cuerpo JSON no es válido." }, { status: 400 });
  }

  const name = body.name?.trim();
  const countryCode = (body.country_code || "CO").trim().toUpperCase();
  const currencyCode = (body.currency_code || "COP").trim().toUpperCase();

  if (!name || name.length < 2 || name.length > 120 ||
      !/^[A-Z]{2}$/.test(countryCode) || !/^[A-Z]{3}$/.test(currencyCode) ||
      (body.legal_name && body.legal_name.trim().length > 180) ||
      (body.tax_id && body.tax_id.trim().length > 40)) {
    return NextResponse.json({ error: "Los datos de la empresa no son válidos." }, { status: 422 });
  }

  const { data, error } = await supabase
    .from("organizations")
    .insert({
      name,
      legal_name: body.legal_name?.trim() || null,
      tax_id: body.tax_id?.trim() || null,
      country_code: countryCode,
      currency_code: currencyCode,
      created_by: user.id
    })
    .select("id, name, legal_name, tax_id, country_code, currency_code, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "No fue posible crear la empresa. Verifica los datos y permisos." }, { status: 403 });
  }

  return NextResponse.json({ data, role: "owner" }, { status: 201 });
}
