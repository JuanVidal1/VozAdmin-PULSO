import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function redirectWithCookies(destination: URL, source: NextResponse) {
  const redirected = NextResponse.redirect(destination);
  source.cookies.getAll().forEach((cookie) => redirected.cookies.set(cookie));
  return redirected;
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }
  });

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const isPublicPage = pathname === "/login" || pathname === "/registro" || pathname === "/auth/callback";
  const isApiRoute = pathname.startsWith("/api/");

  if (!user && !isPublicPage && !isApiRoute) {
    const destination = request.nextUrl.clone();
    destination.pathname = "/login";
    destination.search = "";
    destination.searchParams.set("next", pathname);
    return redirectWithCookies(destination, response);
  }

  if (user && (pathname === "/login" || pathname === "/registro")) {
    const destination = request.nextUrl.clone();
    destination.pathname = "/resumen";
    destination.search = "";
    return redirectWithCookies(destination, response);
  }

  return response;
}

export const config = {
  runtime: "nodejs",
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest\\.webmanifest|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"]
};
