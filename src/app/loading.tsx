export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <div role="status" className="card w-full max-w-md p-6">
        <div className="h-4 w-32 animate-pulse rounded bg-surface-3" />
        <div className="mt-4 h-2 w-full animate-pulse rounded bg-surface-3" />
        <div className="mt-2 h-2 w-4/5 animate-pulse rounded bg-surface-3" />
        <span className="sr-only">Memuat Coin Secret…</span>
      </div>
    </main>
  );
}
