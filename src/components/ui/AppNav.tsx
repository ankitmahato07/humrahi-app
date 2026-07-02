import Link from "next/link";
import Image from "next/image";

interface AppNavProps {
  userName?: string | null;
}

export function AppNav({ userName }: AppNavProps) {
  return (
    <header className="sticky top-0 z-40 bg-whisper border-b border-sand">
      <nav
        className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between"
        aria-label="Main navigation"
      >
        {/* Brand mark + wordmark */}
        <Link
          href="/"
          className="flex items-center gap-2 text-ink hover:text-red transition-colors"
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
          <span className="font-lora text-base font-semibold tracking-wide">
            Humrahi
          </span>
        </Link>

        {/* Right side: account or sign-in */}
        <div className="flex items-center gap-4">
          <Link
            href="https://www.myhumrahi.org"
            className="text-sm text-soft hover:text-red transition-colors hidden sm:block"
            target="_blank"
            rel="noopener"
          >
            Our work ↗
          </Link>
          {userName ? (
            <Link
              href="/account"
              className="text-sm font-medium text-soft hover:text-red transition-colors"
            >
              {userName}
            </Link>
          ) : (
            <Link
              href="/auth/login"
              className="text-sm font-medium text-red hover:text-crimson transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
