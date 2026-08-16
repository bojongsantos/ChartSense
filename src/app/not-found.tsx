import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <section className="card max-w-md p-6 text-center">
        <p className="text-3xl font-bold">404</p>
        <h1 className="mt-2 text-sm font-semibold">Halaman tidak ditemukan.</h1>
        <p className="mt-2 text-xs text-muted">Alamat tidak tersedia pada ChartSense.</p>
        <Link href="/" className="mt-4 inline-flex rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white">
          Kembali ke dashboard
        </Link>
      </section>
    </main>
  );
}
