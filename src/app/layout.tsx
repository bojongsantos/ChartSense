import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PlanProvider } from "@/presentation/features/access/plan-provider";
import { preferencesScript } from "@/shared/lib/ui-preferences";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Coin Secret — Crypto Technical Analysis",
  description: "Rule-based crypto chart analysis, supply-demand detection, and market scanning.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The preference script rewrites these attributes before React hydrates, so
    // the server markup is expected to differ from what the browser holds.
    <html
      lang="id"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Runs before the first paint. Restoring the theme afterwards would
            show the default one first, and a page that flashes white on a dark
            theme is the most visible bug a theme toggle can have. */}
        <script dangerouslySetInnerHTML={{ __html: preferencesScript() }} />
      </head>
      <body className="h-full">
        <PlanProvider>{children}</PlanProvider>
      </body>
    </html>
  );
}
