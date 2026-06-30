import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Humrahi — Your Impact",
    template: "%s | Humrahi",
  },
  description:
    "Sign in to see how your gifts are feeding families, building health, and funding school terms in Siliguri.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://app.myhumrahi.org"
  ),
  openGraph: {
    siteName: "Humrahi Foundation",
    locale: "en_IN",
    type: "website",
  },
  robots: {
    // The app (dashboard + admin) should not be indexed
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable}`}>
      <body className="min-h-screen font-inter text-ink bg-cloud antialiased">
        {children}
      </body>
    </html>
  );
}
