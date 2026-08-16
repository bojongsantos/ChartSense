"use client";

export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="id">
      <body style={{ margin: 0, background: "#080b12", color: "#f4f7ff", fontFamily: "sans-serif" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
          <section style={{ maxWidth: 440, textAlign: "center" }}>
            <h1 style={{ fontSize: 20 }}>ChartSense mengalami gangguan.</h1>
            <p style={{ color: "#9ca3af", fontSize: 13 }}>Muat ulang aplikasi untuk mencoba pemulihan.</p>
            <button
              type="button"
              onClick={retry}
              style={{ marginTop: 12, border: 0, borderRadius: 8, padding: "9px 16px", background: "#5b67f1", color: "white" }}
            >
              Muat ulang
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
