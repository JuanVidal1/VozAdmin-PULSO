import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/resumen";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/resumen";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=confirmation", requestUrl.origin));
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(new URL("/login?error=confirmation", requestUrl.origin));
  }

  // Google does not provide business_name metadata. Ensure a first workspace
  // exists before opening the dashboard; email registration already creates it
  // from the registration form metadata trigger.
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.redirect(new URL("/login?error=confirmation", requestUrl.origin));
  }

  const { data: memberships, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1);

  if (membershipError) {
    return NextResponse.redirect(new URL("/login?error=workspace", requestUrl.origin));
  }

  if (!memberships?.length) {
    const metadataName = typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : "";
    const workspaceName = metadataName ? `Negocio de ${metadataName}` : "Mi negocio";
    const { error: organizationError } = await supabase
      .from("organizations")
      .insert({ name: workspaceName.slice(0, 120), created_by: user.id });

    if (organizationError) {
      return NextResponse.redirect(new URL("/login?error=workspace", requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL(safeNext, requestUrl.origin));
}
