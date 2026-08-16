# Development Guidelines

## Next.js

Versi Next.js proyek dapat memiliki breaking changes. Baca panduan relevan di
`node_modules/next/dist/docs/` sebelum menulis atau memindahkan kode framework.
Patuhi seluruh deprecation notice dari versi yang terpasang.

## Workflow

1. Pertahankan dependency direction dalam `docs/architecture.md`.
2. Jangan menaruh business rule di route atau komponen React.
3. Tambahkan test untuk perubahan domain dan application.
4. Jalankan `npm run check` sebelum menyerahkan perubahan.
5. Jalankan `npm audit` setelah perubahan dependensi.

## Integritas produk

- Jangan menyebut rule-based analysis sebagai AI atau machine learning.
- Jangan menampilkan data fallback sebagai data live.
- Jangan memakai client-side hiding sebagai entitlement produksi.
- Admin dan simulasi paket hanya boleh aktif melalui flag demo lokal.
