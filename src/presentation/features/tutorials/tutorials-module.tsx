import Link from "next/link";
import {
  AlertTriangle,
  BellRing,
  BookOpen,
  History,
  Layers,
  LineChart,
  ShieldAlert,
} from "lucide-react";
import { TutorialsToc } from "@/presentation/features/tutorials/tutorials-toc";

interface Lesson {
  id: string;
  icon: typeof BookOpen;
  title: string;
  summary: string;
  points: string[];
  href?: { label: string; url: string };
}

const LESSONS: Lesson[] = [
  {
    id: "zones",
    icon: Layers,
    title: "Membaca zona supply & demand",
    summary: "Zona adalah area harga tempat pasar sebelumnya bergerak agresif.",
    points: [
      "Zona demand berada di bawah harga dan menjadi acuan limit order beli.",
      "Zona supply berada di atas harga dan menjadi acuan limit order jual.",
      "Status Fresh berarti zona belum diuji ulang sejak terbentuk.",
      "Status Tested berarti harga sudah kembali menyentuh zona minimal sekali.",
      "Status Broken berarti harga menembus zona. Zona tersebut tidak lagi dipakai.",
      "Zona yang sempit lebih diutamakan karena risiko per posisi lebih terukur.",
    ],
  },
  {
    id: "chart",
    icon: LineChart,
    title: "Interval dan rentang histori",
    summary: "Interval mengatur besar satu candle. Rentang mengatur seberapa jauh ke belakang.",
    points: [
      "Interval tersedia pada 15m, 1H, 4H, dan 1D.",
      "Rentang tersedia pada 1M, 3M, 1Y, dan ALL.",
      "Keduanya berdiri sendiri. ALL dapat dipakai pada interval mana pun.",
      "ALL memuat data sejak candle pertama pasar tersebut tersedia.",
      "Rentang panjang pada interval kecil dimuat bertahap. Progresnya tampil di atas chart.",
      "Geser chart ke kiri untuk memuat histori lebih lama dari rentang terpilih.",
      "Pada coin yang baru listing, rentang panjang berhenti di tanggal listing. Ini normal.",
    ],
  },
  {
    id: "confidence",
    icon: BookOpen,
    title: "Confidence score",
    summary: "Skor 0-100 hasil penjumlahan aturan teknikal, bukan prediksi.",
    points: [
      "Komponen mencakup kualitas zona, struktur tren, momentum, dan volume.",
      "Skor tinggi menunjukkan lebih banyak kondisi terpenuhi secara bersamaan.",
      "Skor bukan probabilitas keuntungan dan tidak menjamin hasil.",
      "ChartSense memakai aturan teknikal terprogram, bukan machine learning.",
    ],
  },
  {
    id: "risk",
    icon: ShieldAlert,
    title: "Risk management",
    summary: "Setiap setup memuat entry, dua target, dan stop loss.",
    points: [
      "Stop loss ditempatkan pada swing terkonfirmasi di luar zona.",
      "Risk-reward dihitung dari jarak entry ke target pertama dibanding jarak ke stop.",
      "Setup dikunci saat status berubah menjadi Running agar level tidak bergeser.",
      "Tentukan ukuran posisi dari jarak stop, bukan dari besarnya keyakinan.",
    ],
  },
  {
    id: "alerts",
    icon: BellRing,
    title: "Memakai Alerts",
    summary: "Alert memberi tahu saat harga menyentuh level yang Anda tentukan.",
    points: [
      "Tentukan simbol, arah kondisi, dan harga target.",
      "Pasar diperiksa berkala di server. Alert tetap berjalan meski browser ditutup.",
      "Alert yang tercapai berpindah status dan memunculkan notifikasi pada ikon lonceng.",
      "Alert yang tercapai dapat diaktifkan kembali kapan saja.",
    ],
    href: { label: "Buka Alerts", url: "/alerts" },
  },
  {
    id: "history",
    icon: History,
    title: "Mencatat setup di History",
    summary: "History menyimpan setup dan mengevaluasinya terhadap pergerakan harga.",
    points: [
      "Simpan setup dari panel analisis pada dashboard.",
      "Evaluasi memakai rentang harga sejak setup disimpan.",
      "Candle yang menaungi momen penyimpanan tidak dihitung, karena sebagiannya terjadi sebelum setup ada.",
      "Jika target dan stop tersentuh pada rentang yang sama, hasil dicatat sebagai kena stop.",
      "Win rate hanya dihitung dari setup yang sudah selesai.",
    ],
    href: { label: "Buka History", url: "/history" },
  },
];

/** Numbers for the worked example. Chosen so the arithmetic is checkable. */
const EXAMPLE = {
  symbol: "BTCUSDT",
  timeframe: "4H",
  zone: "Demand · Fresh",
  entry: 64_000,
  target1: 68_000,
  target2: 71_200,
  stop: 62_400,
};

const RISK = EXAMPLE.entry - EXAMPLE.stop;
const REWARD = EXAMPLE.target1 - EXAMPLE.entry;

const number = new Intl.NumberFormat("id-ID");

export function TutorialsModule() {
  return (
    <div className="p-4 sm:p-6">
      <header className="max-w-2xl">
        <h1 className="text-lg font-bold">Tutorials</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Panduan singkat membaca keluaran ChartSense. Seluruh analisis dihasilkan dari aturan
          teknikal terprogram. ChartSense tidak mengeksekusi transaksi dan tidak memberikan
          nasihat investasi.
        </p>
      </header>

      <TutorialsToc
        entries={[
          ...LESSONS.map((lesson) => ({ id: lesson.id, label: lesson.title })),
          { id: "contoh", label: "Contoh terpandu", emphasis: true },
        ]}
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {LESSONS.map((lesson) => (
          <article key={lesson.id} id={lesson.id} className="card scroll-mt-6 p-5">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-3">
                <lesson.icon className="size-4 text-accent-2" />
              </span>
              <h2 className="text-sm font-bold">{lesson.title}</h2>
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-muted">{lesson.summary}</p>
            <ul className="mt-3 space-y-1.5">
              {lesson.points.map((point) => (
                <li key={point} className="flex gap-2 text-xs leading-relaxed text-muted">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-2" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            {lesson.href && (
              <Link
                href={lesson.href.url}
                className="mt-4 inline-block rounded-lg border border-border px-3 py-1.5 text-[11px] font-bold transition-colors hover:border-border-strong"
              >
                {lesson.href.label}
              </Link>
            )}
          </article>
        ))}
      </div>

      <section id="contoh" className="card mt-6 scroll-mt-6 p-5">
        <h2 className="text-sm font-bold">Contoh terpandu: membaca satu setup</h2>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">
          Angka berikut adalah ilustrasi, bukan rekomendasi. Tujuannya menunjukkan cara membaca
          hubungan antar level.
        </p>

        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[420px] text-left text-xs">
            <tbody>
              {[
                ["Pasangan", `${EXAMPLE.symbol} · ${EXAMPLE.timeframe}`],
                ["Zona", EXAMPLE.zone],
                ["Entry", `$${number.format(EXAMPLE.entry)}`],
                ["Target 1", `$${number.format(EXAMPLE.target1)}`],
                ["Target 2", `$${number.format(EXAMPLE.target2)}`],
                ["Stop loss", `$${number.format(EXAMPLE.stop)}`],
              ].map(([label, value]) => (
                <tr key={label} className="border-b border-border last:border-b-0">
                  <th scope="row" className="w-32 p-2.5 font-medium text-muted-2">{label}</th>
                  <td className="p-2.5 font-semibold tabular-nums">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ol className="mt-4 space-y-2.5 text-xs leading-relaxed text-muted">
          <li>
            <strong className="text-foreground">1. Ukur risiko lebih dulu.</strong> Jarak entry ke
            stop adalah ${number.format(EXAMPLE.entry)} − ${number.format(EXAMPLE.stop)} ={" "}
            <strong className="text-foreground">${number.format(RISK)}</strong> per unit. Inilah
            angka yang menentukan ukuran posisi, bukan target.
          </li>
          <li>
            <strong className="text-foreground">2. Bandingkan dengan imbalan.</strong> Jarak entry
            ke target pertama adalah{" "}
            <strong className="text-foreground">${number.format(REWARD)}</strong>, sehingga
            risk-reward ≈ 1 : {(REWARD / RISK).toFixed(1)}.
          </li>
          <li>
            <strong className="text-foreground">3. Tentukan ukuran posisi.</strong> Jika Anda
            bersedia kehilangan Rp500.000 pada ide ini, ukuran posisi adalah Rp500.000 dibagi
            jarak stop — bukan seluruh modal yang tersedia.
          </li>
          <li>
            <strong className="text-foreground">4. Perhatikan status zona.</strong> Zona Fresh
            belum pernah diuji ulang. Setelah harga menyentuhnya dan status berubah menjadi
            Tested, skornya berkurang karena zona sudah menyerap sebagian order.
          </li>
          <li>
            <strong className="text-foreground">5. Setup batal bila zona tertembus.</strong> Status
            Broken berarti premis awalnya tidak lagi berlaku. Level lama tidak perlu
            dipertahankan.
          </li>
        </ol>
      </section>

      <section className="card mt-4 flex gap-3 border-warning/30 p-5">
        <AlertTriangle className="size-5 shrink-0 text-warning" />
        <div className="text-xs leading-relaxed text-muted">
          <p className="font-semibold text-foreground">Batas dari alat ini</p>
          <ul className="mt-2 space-y-1.5">
            <li>Setup dihasilkan aturan teknikal. Tidak ada model yang memprediksi harga.</li>
            <li>
              Backtest rate dihitung dari setup historis yang sudah selesai, dan performa masa lalu
              tidak menentukan hasil berikutnya.
            </li>
            <li>
              Data pasar berasal dari bursa publik dan dapat tertunda atau terputus. Nilai yang
              tidak tersedia ditampilkan sebagai “—”, bukan ditebak.
            </li>
            <li>
              Pergerakan kripto dapat terjadi cepat. Gunakan modal yang siap Anda tanggung
              kerugiannya.
            </li>
          </ul>
          <Link href="/pricing" className="mt-3 inline-block font-semibold text-accent-2">
            Lihat perbandingan paket
          </Link>
        </div>
      </section>
    </div>
  );
}
