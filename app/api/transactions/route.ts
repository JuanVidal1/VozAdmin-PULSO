import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type TransactionInput = {
  organization_id?: string;
  transaction_type?: "income" | "expense";
  category?: string;
  description?: string;
  amount?: number;
  payment_method?: "cash" | "bank_transfer" | "card" | "other";
  transaction_date?: string;
  notes?: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function colombiaToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function validDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organization_id");
  if (!organizationId || !UUID_PATTERN.test(organizationId)) {
    return NextResponse.json({ error: "La empresa indicada no es válida." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("transactions")
    .select("id, organization_id, transaction_type, category, description, amount, payment_method, transaction_date, notes, created_at")
    .eq("organization_id", organizationId)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: "No fue posible consultar los movimientos." }, { status: 403 });
  }

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  let body: TransactionInput;
  try {
    body = await request.json() as TransactionInput;
  } catch {
    return NextResponse.json({ error: "El cuerpo JSON no es válido." }, { status: 400 });
  }

  if (
    !body.organization_id ||
    !UUID_PATTERN.test(body.organization_id) ||
    !body.description?.trim() ||
    body.description.trim().length > 240 ||
    !Number.isFinite(body.amount) ||
    Number(body.amount) <= 0 ||
    Number(body.amount) > 999999999999.99 ||
    !["income", "expense"].includes(body.transaction_type ?? "") ||
    (body.payment_method !== undefined &&
      body.payment_method !== null &&
      !["cash", "bank_transfer", "card", "other"].includes(body.payment_method)) ||
    (body.transaction_date !== undefined && !validDate(body.transaction_date)) ||
    (body.category !== undefined && body.category.length > 60) ||
    (body.notes !== undefined && body.notes.length > 2000)
  ) {
    return NextResponse.json({ error: "Datos del movimiento incompletos o inválidos." }, { status: 422 });
  }

  const { data, error } = await supabase.rpc("create_transaction_with_audit", {
    p_organization_id: body.organization_id,
    p_transaction_type: body.transaction_type,
    p_category: body.category?.trim() || "general",
    p_description: body.description.trim(),
    p_amount: body.amount,
    p_payment_method: body.payment_method ?? null,
    p_transaction_date: body.transaction_date ?? colombiaToday(),
    p_notes: body.notes?.trim() || null
  });

  if (error) {
    const forbidden = error.code === "42501";
    return NextResponse.json(
      { error: forbidden ? "No tienes permisos para registrar en esta empresa." : "No fue posible guardar el movimiento." },
      { status: forbidden ? 403 : 400 }
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}
