"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("ChartSense route error", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <section className="card max-w-md p-6 text-center">
        <p className="text-sm font-bold">Halaman tidak dapat dimuat.</p>
        <p className="mt-2 text-xs text-muted">Gangguan dapat berasal dari koneksi atau layanan data pasar.</p>
        {error.digest && <p className="mt-2 text-[10px] text-muted-2">Reference: {error.digest}</p>}
        <button
          type="button"
          onClick={retry}
          className="mt-4 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white"
        >
          Coba lagi
        </button>
      </section>
    </main>
  );
}
