import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Silver DBA Study",
  description: "Oracle Master Silver DBA 学習アプリ（オリジナル問題・未検証）",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#121418" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full">
        <main className="mx-auto max-w-2xl px-3 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-10">
          {children}
        </main>
      </body>
    </html>
  );
}
