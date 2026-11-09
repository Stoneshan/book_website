import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isAdminEmail } from "@/lib/auth/allowlist";
import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "@/lib/env";

function copyCookies(from: NextResponse, to: NextResponse): NextResponse {
  const headers = from.headers as Headers & { getSetCookie?: () => string[] };
  const cookies = headers.getSetCookie?.() ?? [];
  if (cookies.length > 0) {
    for (const cookie of cookies) {
      to.headers.append("set-cookie", cookie);
    }
  } else {
    for (const cookie of from.cookies.getAll()) {
      to.cookies.set(cookie);
    }
  }
  return to;
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!isSupabaseConfigured()) {
    const response = NextResponse.next({ request });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  let authorized = false;
  try {
    const { data, error } = await supabase.auth.getClaims();
    const email = String(data?.claims?.email ?? "");
    authorized = !error && Boolean(data?.claims) && isAdminEmail(email);
  } catch {
    authorized = false;
  }

  if (pathname === "/admin/login") {
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  if (!authorized && pathname.startsWith("/api/admin")) {
    const unauthorized = NextResponse.json({ error: "unauthorized" }, { status: 401 });
    unauthorized.headers.set("Cache-Control", "private, no-store");
    return copyCookies(response, unauthorized);
  }

  if (!authorized && pathname.startsWith("/admin")) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    url.searchParams.set("next", `${pathname}${search}`);
    const redirectResponse = NextResponse.redirect(url);
    redirectResponse.headers.set("Cache-Control", "private, no-store");
    return copyCookies(response, redirectResponse);
  }

  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
