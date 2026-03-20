import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AppToaster } from "@/components/Layout/AppToaster";
import { Navbar } from "@/components/Layout/Navbar";

export const metadata: Metadata = {
  title: "Fullstack Next.js App",
  description: "Next.js 14 + TypeScript + Prisma + SQLite + Tailwind",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen">
        <Providers>
          <AppToaster />
          <Navbar />
          <div className="min-h-[calc(100vh-3.5rem)] lg:min-h-[calc(100vh-4rem)]">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
