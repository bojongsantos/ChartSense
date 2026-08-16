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

## Deployment Vercel

1. Tambahkan PostgreSQL pooled connection sebagai `DATABASE_URL`.
2. Tambahkan `BETTER_AUTH_SECRET` acak minimal 32 byte.
3. Atur `BETTER_AUTH_URL` ke domain production.
4. Tambahkan Midtrans dan Resend environment variables.
5. Jalankan `npm run db:deploy` terhadap database production.
6. Deploy aplikasi dan uji webhook Sandbox.

`postinstall` menjalankan `prisma generate`. Migration production menggunakan `prisma migrate deploy`, bukan `migrate dev`.

## Operasional

- Audit log merekam perubahan watchlist, admin, dan billing.
- Feature gate global berada di tabel `FeatureGate`.
- Grant per pengguna tersedia melalui `UserFeatureGrant`.
- Expired subscription diturunkan ke Free saat session berikutnya dibaca.
- Backup dan point-in-time recovery mengikuti penyedia PostgreSQL.
