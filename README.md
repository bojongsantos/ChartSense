# ChartSense

ChartSense adalah MVP analisis teknikal kripto berbasis aturan. Aplikasi mendeteksi zona supply/demand, menyusun level risiko, menjalankan backtest walk-forward sederhana, dan membandingkan urutan harga historis. Produk ini tidak memakai model AI/ML dan tidak mengeksekusi transaksi.

## Arsitektur

Kode aplikasi berada di `src/` dan mengikuti Clean Architecture pragmatis:

```text
src/
├── app/               # Routing dan composition root Next.js
├── config/            # Konfigurasi statis
├── core/
│   ├── application/   # Use case dan ports
│   └── domain/        # Model dan aturan bisnis murni
├── infrastructure/    # Adapter HTTP dan persistence
├── presentation/      # React UI, hooks, layout, dan features
└── shared/            # Utilitas murni lintas fitur
```

Aturan dependensi dan panduan kontribusi tersedia di
[`docs/architecture.md`](docs/architecture.md) dan
[`docs/development/agent-guidelines.md`](docs/development/agent-guidelines.md).

`AGENTS.md` dan `CLAUDE.md` tetap di root sebagai discovery entrypoint tooling.
Isi panduan lengkap berada di `docs/`.

## Arsitektur data

- Chart pasangan terpilih mengambil spot kline dan ticker Binance setiap empat detik.
- Scanner lintas watchlist berjalan melalui route server dengan konkurensi terbatas.
- Hasil scanner dideduplikasi dan disimpan selama 60 detik pada proses server.
- Market context dan health check memanggil penyedia eksternal dari server.
- Penyedia data: Binance Spot/Futures, CoinGecko, dan Alternative.me.

## Menjalankan lokal

Persyaratan: Node.js 22 dan npm.

```bash
npm ci
npm run dev
```

Buka `http://localhost:3000`.

Salin `.env.example` menjadi `.env.local` hanya jika fitur demo internal diperlukan. Nilai default menonaktifkan admin dan simulasi paket Pro.

```env
ENABLE_ADMIN_DEMO=false
NEXT_PUBLIC_ENABLE_DEMO_CONTROLS=false
```

`/admin` adalah alat demo lokal, bukan panel terautentikasi. Jangan aktifkan pada deployment publik. ChartSense belum memiliki identitas pengguna, billing, database, atau entitlement produksi.

## Route utama

- `/` — dashboard dan analisis setup teratas.
- `/analysis?symbol=BTCUSDT` — analisis pasangan tertentu.
- `/scanner` — peluang scanner yang tersedia untuk mode Free.
- `/patterns` — signals Pro pada mode demo.
- `/watchlist` — konfigurasi watchlist lokal.
- `/api/market-context`, `/api/health` — agregasi data server.
- `/api/scanner`, `/api/signals` — scanner server tervalidasi.

## Verifikasi

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run check
npm audit
```

CI menjalankan lint, typecheck, unit test, tes batas arsitektur, dan production build.

## Batasan

- Data pasar publik dapat terlambat atau tidak tersedia.
- Backtest memakai sampel candle terbatas dan bukan jaminan hasil.
- Status setup lokal disimpan per simbol dan timeframe pada localStorage.
- Cache proses server tidak menggantikan Redis pada deployment multi-instance.
- Seluruh keluaran hanya untuk riset, bukan saran finansial.
