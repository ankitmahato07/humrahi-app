import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the session cookie on every request so it doesn't expire mid-session.
// Also enforces auth guards: unauthenticated users are redirected to /auth/login,
// and non-admin users are blocked from /admin.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — do not add logic between createServerClient and getUser.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Public paths that never require auth
  const publicPaths = [
    "/auth/login",
    "/auth/callback",
    "/auth/confirm",
    "/api/auth",
    // Public donate URL — now a permanent redirect to the static site; donors
    // are not signed in, so it must not be bounced to the login page.
    "/donate",
  ];
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // The /admin admin-gate lives in src/app/admin/layout.tsx via requireAdmin(),
  // whose single source of truth is the humrahis.role column. We don't repeat it
  // here because the reliable signal isn't in the JWT (app_metadata.role is never
  // set), and querying the DB on every middleware request would be wasteful.

  return supabaseResponse;
}
