"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface AppNavProps {
  userName?: string | null;
}

const NAV_LINKS = [
  { href: "/", label: "Overview" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/donations", label: "Your giving" },
  { href: "/receipts", label: "Receipts" },
  { href: "/account", label: "Account" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`text-sm font-medium pb-1 border-b-2 transition-colors ${
        active ? "text-red border-red" : "text-soft border-transparent hover:text-red"
      }`}
    >
      {label}
    </Link>
  );
}

export function AppNav({ userName }: AppNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <header className="sticky top-0 z-30 bg-whisper border-b border-sand">
      <nav
        className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4"
        aria-label="Main navigation"
      >
        <Link
          href="/"
          className="flex items-center gap-2 text-ink hover:text-red transition-colors flex-shrink-0"
          aria-label="Humrahi — home"
        >
          <Image
            src="/logo-submark.png"
            alt="Humrahi"
            width={30}
            height={24}
            priority
            className="h-6 w-auto"
          />
          <span className="font-lora text-base font-semibold tracking-wide">Humrahi</span>
        </Link>

        {/* Desktop links — "giving-nav" tour anchor wraps Your giving + Receipts,
            step 3 of the first-login tour. */}
        <div className="hidden sm:flex items-center gap-6 flex-1 justify-center">
          <NavLink href="/" label="Overview" active={isActive(pathname, "/")} />
          <NavLink href="/campaigns" label="Campaigns" active={isActive(pathname, "/campaigns")} />
          <span data-tour="giving-nav" className="flex items-center gap-6">
            <NavLink
              href="/donations"
              label="Your giving"
              active={isActive(pathname, "/donations")}
            />
            <NavLink href="/receipts" label="Receipts" active={isActive(pathname, "/receipts")} />
          </span>
          <NavLink href="/account" label="Account" active={isActive(pathname, "/account")} />
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {userName ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="hidden sm:block text-sm font-medium text-soft hover:text-red transition-colors"
            >
              Log out
            </button>
          ) : (
            <Link
              href="/auth/login"
              className="text-sm font-medium text-red hover:text-crimson transition-colors"
            >
              Sign in
            </Link>
          )}
          <button
            type="button"
            className="sm:hidden p-2 -mr-2"
            aria-label={drawerOpen ? "Close menu" : "Open menu"}
            aria-expanded={drawerOpen}
            aria-controls="app-mobile-menu"
            onClick={() => setDrawerOpen((v) => !v)}
          >
            <div className="w-5 h-4 flex flex-col justify-between">
              <span className="block h-0.5 bg-ink" aria-hidden="true" />
              <span className="block h-0.5 bg-ink" aria-hidden="true" />
              <span className="block h-0.5 bg-ink" aria-hidden="true" />
            </div>
          </button>
        </div>
      </nav>

      {drawerOpen && (
        <div className="sm:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-ink/50"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <nav
            id="app-mobile-menu"
            aria-label="Mobile navigation"
            className="absolute top-0 right-0 h-full w-64 bg-whisper border-l border-sand p-6 flex flex-col gap-5"
          >
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setDrawerOpen(false)}
                className={`text-base font-medium ${
                  isActive(pathname, href) ? "text-red" : "text-ink"
                }`}
              >
                {label}
              </Link>
            ))}
            {userName && (
              <button
                type="button"
                onClick={handleSignOut}
                className="text-base font-medium text-soft text-left mt-4"
              >
                Log out
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
