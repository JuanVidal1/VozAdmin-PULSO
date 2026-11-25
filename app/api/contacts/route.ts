import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ContactInput = {
  organization_id?: string;
  contact_type?: "customer" | "supplier" | "both";
  name?: string;
  document_type?: string;
  document_number?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const organizationId = params.get("organization_id");
  const type = params.get("type");
  if (!organizationId || !UUID_PATTERN.test(organizationId)) {
    return NextResponse.json({ error: "La empresa indicada no es válida." }, { status: 400 });
  }
  if (type && !["customer", "supplier", "both"].includes(type)) {
    return NextResponse.json({ error: "El tipo de contacto no es válido." }, { status: 400 });
  }

  let query = supabase.from("contacts")
    .select("id, organization_id, contact_type, name, document_type, document_number, email, phone, address, notes, created_at, updated_at")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true })
    .limit(250);
  if (type) query = query.eq("contact_type", type);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "No fue posible consultar los contactos." }, { status: 403 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });

  let body: ContactInput;
  try { body = await request.json() as ContactInput; }
  catch { return NextResponse.json({ error: "El cuerpo JSON no es válido." }, { status: 400 }); }

  const name = body.name?.trim();
  if (!body.organization_id || !UUID_PATTERN.test(body.organization_id) ||
      !name || name.length > 160 ||
      !["customer", "supplier", "both"].includes(body.contact_type ?? "") ||
      (body.email && (body.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))) ||
      (body.phone && body.phone.length > 40) ||
      (body.document_number && body.document_number.length > 40) ||
      (body.address && body.address.length > 240) ||
      (body.notes && body.notes.length > 2000)) {
    return NextResponse.json({ error: "Los datos del contacto no son válidos." }, { status: 422 });
  }

  const { data, error } = await supabase.from("contacts").insert({
    organization_id: body.organization_id,
    contact_type: body.contact_type,
    name,
    document_type: body.document_type?.trim() || null,
    document_number: body.document_number?.trim() || null,
    email: body.email?.trim().toLowerCase() || null,
    phone: body.phone?.trim() || null,
    address: body.address?.trim() || null,
    notes: body.notes?.trim() || null
  }).select("id, organization_id, contact_type, name, document_number, email, phone, address, created_at").single();

  if (error) return NextResponse.json({ error: "No fue posible guardar el contacto. Verifica tus permisos." }, { status: 403 });
  return NextResponse.json({ data }, { status: 201 });
}
