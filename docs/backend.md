# Backend ChartSense

## Model akses

Role dan paket tidak dicampur:

- Role `USER` memakai aplikasi biasa.
- Role `ADMIN` dapat membuka backoffice.
- Plan `FREE` memiliki watchlist maksimal 20 simbol.
- Plan `PREMIUM` memiliki watchlist maksimal 200 simbol dan fitur premium.

Seluruh endpoint mutasi memeriksa session pada server. Resource watchlist selalu difilter berdasarkan `userId` untuk mencegah IDOR. Panel admin melakukan pemeriksaan role pada layout dan setiap route API.

## Auth

Better Auth menyimpan user, credential account, session, verification token, dan rate limit di PostgreSQL. Cookie session memakai `HttpOnly`, `SameSite=Lax`, dan `Secure` pada production. Password minimal 10 karakter dan session berlaku tujuh hari.

Aktifkan `REQUIRE_EMAIL_VERIFICATION=true` setelah Resend terkonfigurasi. Reset password mencabut session lain.

## Billing Midtrans

Checkout menentukan harga dari `PREMIUM_PRICE_IDR` pada server. Browser tidak dapat menentukan nominal atau mengaktifkan paket.

Webhook production:

```text
https://DOMAIN/api/billing/webhook/midtrans
```

Handler memverifikasi `SHA512(order_id + status_code + gross_amount + server_key)`, nominal, status, dan fraud status. Event settlement diproses idempotent. Pembayaran sukses menambah 30 hari pada periode aktif.

Konfigurasikan Notification URL tersebut pada Midtrans MAP. Gunakan Sandbox key sampai QA pembayaran selesai.

## Alerts, notifikasi, dan riwayat setup

`PriceAlert` menyimpan level harga per pengguna. Plan `FREE` memiliki lima alert aktif, `PREMIUM` memiliki seratus. Alert yang sudah `TRIGGERED` tidak menghitung kuota.

`SetupJournalEntry` menyimpan setup yang disimpan pengguna. Kolom `signature` membuat penyimpanan berulang atas rencana yang sama menjadi satu baris. Plan `FREE` dibatasi lima puluh entri, `PREMIUM` lima ratus. Batas ini juga bersifat operasional: setiap entri `OPEN` menambah pekerjaan sweep terjadwal, sehingga jurnal tanpa batas memungkinkan satu akun memperlambat sweep bagi seluruh pengguna.

`Notification` menampung pemberitahuan hasil evaluasi. Seluruh query difilter berdasarkan `userId`. Sweep memangkas feed setiap pengguna hingga dua ratus notifikasi terbaru agar tabel tidak tumbuh tanpa henti.

Evaluasi berjalan pada endpoint cron:

```text
GET https://DOMAIN/api/cron/market-watch
```

Handler memerlukan header `Authorization: Bearer $CRON_SECRET`. Tanpa `CRON_SECRET` endpoint menolak seluruh permintaan dengan status 503, bukan terbuka.

Penjadwalan memakai dua sumber karena paket Vercel Hobby hanya mengizinkan satu eksekusi cron per hari:

- `vercel.json` menjadwalkan satu sweep harian sebagai jaring pengaman.
- `.github/workflows/market-watch.yml` memanggil endpoint yang sama setiap tiga puluh menit. Interval tersebut menjaga penggunaan tetap berada dalam kuota GitHub Actions gratis untuk repositori privat.

Workflow memerlukan dua repository secret, yaitu `PRODUCTION_URL` dan `CRON_SECRET`, dan sengaja gagal secara nyaring bila keduanya kosong atau endpoint membalas non-2xx. Sweep yang berhenti diam-diam berarti alert tidak lagi dievaluasi tanpa ada yang mengetahui.

Setelah proyek berpindah ke Vercel Pro, workflow tersebut dapat dihapus dan jadwal dikembalikan ke `vercel.json`.

Alert dievaluasi terhadap harga ticker terkini. Setup dievaluasi terhadap rentang harga harian sejak setup disimpan. Bila target dan stop tersentuh pada rentang yang sama, hasil dicatat sebagai `STOPPED_OUT` karena urutan intrabar tidak dapat dipastikan. Sweep bersifat idempotent sehingga eksekusi ganda tidak menduplikasi notifikasi.

## Pembatasan endpoint mahal

`/api/scanner` dan `/api/signals` mengubah satu permintaan masuk menjadi banyak permintaan ke bursa. Dua lapis pengaman diterapkan:

1. Pemanggil anonim selalu memakai `DEFAULT_WATCHLIST`. Daftar simbol dari body hanya dihormati untuk pengguna yang login. Tanpa ini, memvariasikan daftar simbol akan melewati cache hasil dan mengubah endpoint menjadi amplifier terhadap kuota bursa milik server.
2. Fixed-window rate limit dua puluh permintaan per menit per pengguna atau per IP, membalas `429` beserta header `Retry-After`.

Rate limit disimpan di memori proses. Pada beberapa instance, batas berlaku per instance, bukan global.

## Sumber data pasar

Binance menjadi provider utama karena menyediakan websocket publik untuk data realtime. Bybit menjadi cadangan melalui `MarketDataPort` yang sama. Provider yang gagal dijeda selama enam puluh detik lalu dicoba kembali. Keduanya publik dan tidak memerlukan API key.

## Deployment Vercel

1. Tambahkan PostgreSQL pooled connection sebagai `DATABASE_URL`.
2. Tambahkan `BETTER_AUTH_SECRET` acak minimal 32 byte.
3. Atur `BETTER_AUTH_URL` ke domain production.
4. Tambahkan Midtrans dan Resend environment variables.
5. Tambahkan `CRON_SECRET` agar market watch dapat berjalan.
6. Jalankan `npm run db:deploy` terhadap database production.
7. Deploy aplikasi dan uji webhook Sandbox.

`postinstall` menjalankan `prisma generate`. Migration production menggunakan `prisma migrate deploy`, bukan `migrate dev`.

## Operasional

- Audit log merekam perubahan watchlist, admin, dan billing.
- Feature gate global berada di tabel `FeatureGate`.
- Grant per pengguna tersedia melalui `UserFeatureGrant`.
- Expired subscription diturunkan ke Free saat session berikutnya dibaca.
- Backup dan point-in-time recovery mengikuti penyedia PostgreSQL.
