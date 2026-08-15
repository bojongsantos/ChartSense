import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PlanProvider } from "@/components/plan/plan-provider";
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
  title: "ChartSense — AI Trading Copilot",
  description: "AI-powered crypto chart analysis, pattern detection and trade readiness scoring.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full">
        <PlanProvider>{children}</PlanProvider>
      </body>
    </html>
  );
}
