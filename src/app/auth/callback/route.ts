import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Magic-link callback — exchanges the code for a session, then routes:
//   • new users (no profile name yet) → /auth/setup
//   • returning users                → next
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const intent = searchParams.get("intent");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("humrahis")
          .select("first_name")
          .eq("id", user.id)
          .single();

        if (!profile?.first_name) {
          const params = new URLSearchParams({ next });
          if (intent) params.set("intent", intent);
          return NextResponse.redirect(`${origin}/auth/setup?${params.toString()}`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
}
