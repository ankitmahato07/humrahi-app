import Link from "next/link";
import Image from "next/image";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/donors", label: "Donors" },
  { href: "/admin/donations", label: "Donations" },
  { href: "/admin/volunteers", label: "Volunteers" },
  { href: "/admin/drives", label: "Drives" },
  { href: "/admin/reveals", label: "Impact reveals" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/compliance", label: "Compliance" },
];

export function AdminNav({ userName }: { userName: string }) {
  return (
    <header className="bg-ink text-white border-b border-soft">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="h-14 flex items-center justify-between gap-6">
          <Link href="/admin" className="flex items-center gap-2 flex-shrink-0">
            <Image
              src="/logo-submark-dark.png"
              alt="Humrahi"
              width={41}
              height={28}
              priority
              className="h-7 w-auto"
            />
            <span className="font-lora text-sm font-semibold text-white">Admin</span>
          </Link>

          <nav className="flex items-center gap-1 overflow-x-auto" aria-label="Admin navigation">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-1.5 text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors whitespace-nowrap"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-xs text-white/50 hidden sm:block">{userName}</span>
            <Link
              href="/"
              className="text-xs text-white/50 hover:text-white transition-colors"
            >
              ← Site
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
