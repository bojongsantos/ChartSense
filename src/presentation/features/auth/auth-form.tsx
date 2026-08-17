"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LineChart, Loader2 } from "lucide-react";
import { authClient, notifyAuthStateChanged } from "@/infrastructure/auth/auth-client";
import { safeRedirectPath } from "@/shared/lib/safe-redirect";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const result = mode === "register"
      ? await authClient.signUp.email({ name: name.trim(), email: email.trim(), password })
      : await authClient.signIn.email({ email: email.trim(), password });
    setLoading(false);
    if (result.error) {
      setError(result.error.message ?? "Autentikasi gagal.");
      return;
    }
    notifyAuthStateChanged();
    router.replace(safeRedirectPath(params.get("next")));
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-blue"><LineChart className="size-5 text-white" /></span>
          <span className="text-xl font-bold">Chart<span className="gradient-text">Sense</span></span>
        </Link>
        <h1 className="text-xl font-bold">{mode === "login" ? "Masuk ke akun" : "Buat akun baru"}</h1>
        <p className="mt-1 text-sm text-muted">{mode === "login" ? "Lanjutkan ke dashboard ChartSense." : "Paket Free aktif setelah registrasi."}</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "register" && <label className="block text-xs font-semibold">Nama<input required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:border-accent/60 focus:outline-none" /></label>}
          <label className="block text-xs font-semibold">Email<input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:border-accent/60 focus:outline-none" /></label>
          <label className="block text-xs font-semibold">Password<input required type="password" minLength={10} maxLength={128} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:border-accent/60 focus:outline-none" /></label>
          {mode === "login" && <Link href="/forgot-password" className="block text-right text-xs font-semibold text-accent-2">Lupa password?</Link>}
          {error && <p role="alert" className="rounded-lg border border-negative/30 bg-negative/10 p-3 text-xs text-negative">{error}</p>}
          <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-accent to-accent-blue py-2.5 text-sm font-bold text-white disabled:opacity-60">{loading && <Loader2 className="size-4 animate-spin" />}{mode === "login" ? "Masuk" : "Daftar"}</button>
        </form>
        <p className="mt-5 text-center text-xs text-muted">{mode === "login" ? "Belum memiliki akun?" : "Sudah memiliki akun?"} <Link className="font-semibold text-accent-2 hover:underline" href={mode === "login" ? "/register" : "/login"}>{mode === "login" ? "Daftar" : "Masuk"}</Link></p>
      </div>
    </main>
  );
}
