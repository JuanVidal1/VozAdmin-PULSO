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

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organization_id");
  if (!organizationId) return NextResponse.json({ error: "Falta organization_id." }, { status: 400 });

  const { data, error } = await supabase
    .from("transactions")
    .select("id, transaction_type, category, description, amount, payment_method, transaction_date, notes, created_at")
    .eq("organization_id", organizationId)
    .order("transaction_date", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: "No fue posible consultar los movimientos." }, { status: 400 });
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  let body: TransactionInput;
  try {
    body = await request.json() as TransactionInput;
  } catch {
    return NextResponse.json({ error: "El cuerpo JSON no es válido." }, { status: 400 });
  }

  const validTypes = ["income", "expense"];
  const validMethods = ["cash", "bank_transfer", "card", "other"];
  if (!body.organization_id || !body.description?.trim() ||
      !Number.isFinite(body.amount) || Number(body.amount) <= 0 ||
      !validTypes.includes(body.transaction_type ?? "") ||
      (body.payment_method && !validMethods.includes(body.payment_method))) {
    return NextResponse.json({ error: "Datos del movimiento incompletos o inválidos." }, { status: 422 });
  }

  const { data, error } = await supabase.from("transactions").insert({
    organization_id: body.organization_id,
    created_by: user.id,
    transaction_type: body.transaction_type,
    category: body.category?.trim() || "general",
    description: body.description.trim(),
    amount: body.amount,
    payment_method: body.payment_method ?? null,
    transaction_date: body.transaction_date ?? new Date().toISOString().slice(0, 10),
    notes: body.notes?.trim() || null,
    source: "manual"
  }).select("id, transaction_type, description, amount, transaction_date, created_at").single();

  if (error) return NextResponse.json({ error: "No fue posible guardar el movimiento. Verifica la empresa y sus permisos." }, { status: 400 });
  await supabase.from("audit_logs").insert({
    organization_id: body.organization_id,
    actor_user_id: user.id,
    action: "transaction.created",
    entity_type: "transaction",
    entity_id: data.id,
    details: { transaction_type: body.transaction_type, amount: body.amount }
  });

  return NextResponse.json({ data }, { status: 201 });
}