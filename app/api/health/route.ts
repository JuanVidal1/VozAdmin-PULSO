import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  if (!configured) {
    return NextResponse.json(
      {
        status: "degraded",
        application: "VozAdmin",
        assistant: "PULSO",
        integrations: { supabase: "missing_environment_variables" }
      },
      { status: 503 }
    );
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("organizations")
      .select("id")
      .limit(1);

    if (error) {
      return NextResponse.json(
        {
          status: "degraded",
          application: "VozAdmin",
          assistant: "PULSO",
          integrations: { supabase: "connection_error" },
          message: error.message
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: "ok",
      application: "VozAdmin",
      assistant: "PULSO",
      stage: "foundation",
      integrations: { supabase: "connected" },
      timestamp: new Date().toISOString()
    });
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        application: "VozAdmin",
        assistant: "PULSO",
        integrations: { supabase: "connection_error" }
      },
      { status: 503 }
    );
  }
}
