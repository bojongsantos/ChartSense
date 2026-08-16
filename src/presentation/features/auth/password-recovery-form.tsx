"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { authClient } from "@/infrastructure/auth/auth-client";

export function PasswordRecoveryForm({ mode }: { mode: "request" | "reset" }) {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(params.get("error"));

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(null);
    if (mode === "request") {
      const result = await authClient.requestPasswordReset({ email, redirectTo: `${window.location.origin}/reset-password` });
      if (result.error) setError(result.error.message ?? "Permintaan gagal.");
      else setMessage("Jika akun tersedia, tautan reset telah dikirim.");
      return;
    }
    const token = params.get("token");
    if (!token) { setError("Token reset tidak valid."); return; }
    const result = await authClient.resetPassword({ newPassword: password, token });
    if (result.error) setError(result.error.message ?? "Password gagal diubah.");
    else setMessage("Password berhasil diubah. Silakan login kembali.");
  }

  return <main className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground"><div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6"><h1 className="text-xl font-bold">{mode === "request" ? "Lupa password" : "Atur password baru"}</h1><p className="mt-1 text-sm text-muted">{mode === "request" ? "Kami akan mengirim tautan reset ke email terdaftar." : "Gunakan minimal 10 karakter."}</p><form onSubmit={submit} className="mt-6 space-y-4">{mode === "request" ? <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" /> : <input required type="password" minLength={10} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password baru" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />}{error && <p className="text-xs text-negative">{error}</p>}{message && <p className="text-xs text-positive">{message}</p>}<button className="w-full rounded-lg bg-accent py-2.5 text-sm font-bold text-white">{mode === "request" ? "Kirim tautan reset" : "Simpan password"}</button></form><Link href="/login" className="mt-5 block text-center text-xs font-semibold text-accent-2">Kembali ke login</Link></div></main>;
}
