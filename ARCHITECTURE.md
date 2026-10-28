# Ecopolis — Blueprint Teknis

Dokumen ini adalah turunan implementasi dari [PRD.md](PRD.md). Kalau keduanya
berbeda, dokumen ini yang menang — PRD adalah niat, ini adalah rencana.

Status: disepakati 28 Okt 2026. Belum ada kode.

---

## 0. Koreksi terhadap PRD

Tiga hal di PRD tidak bisa dijalankan apa adanya.

| # | Di PRD | Masalah | Keputusan |
|---|--------|---------|-----------|
| 1 | `gemini-1.5-flash` via `@google/genai` | Model ini **sudah tidak ada** di dokumentasi Google. `gemini-2.0-flash` juga sudah shut down. Fitur AI akan mati di depan juri. | Pakai `gemini-3.8-flash`. ID model disimpan di env var `GEMINI_MODEL`, bukan hardcode, supaya pensiunnya model tidak lagi mematikan aplikasi. SDK `@google/genai` dibuang — satu `fetch` ke REST endpoint sudah cukup dan tidak menambah dependency. |
| 2 | `jspdf` + `html2canvas` | `html2canvas` me-render ulang CSS dengan mesinnya sendiri dan pecah pada gradient, `backdrop-filter`, dan warna `oklch` (default Tailwind v4). 550KB untuk hasil raster. | `jspdf` saja, lewat `await import()`. Sertifikat digambar dengan primitif jsPDF; peta disuntikkan sebagai SVG yang memang sudah kita kendalikan. Teks tetap bisa diseleksi. |
| 3 | Prompt Gemini seluruhnya bahasa Inggris | Tidak ada instruksi bahasa output. Narasi bisa keluar dalam bahasa Inggris di UI berbahasa Indonesia. | Prompt secara eksplisit meminta output **Bahasa Indonesia**, dan struktur JSON dipaksa lewat `responseSchema` (bukan lewat kalimat "Return ONLY valid JSON", yang tidak dijamin). |

Satu target di PRD juga diturunkan agar jujur: **Lighthouse 100 di desktop, 95+ di
mobile**. Skor mobile ikut dipengaruhi throttling jaringan Lighthouse yang di luar
kendali kita; menjanjikan 100 mobile adalah janji yang tidak bisa ditepati.

---

## 1. Stack

| Lapis | Pilihan | Alasan |
|-------|---------|--------|
| Framework | Next.js (App Router, TypeScript) | Sesuai PRD. Server Action menyembunyikan API key. |
| Styling | Tailwind CSS | Sesuai PRD. `clsx` + `tailwind-merge` hanya kalau varian komponen benar-benar bercabang. |
| Animasi | `framer-motion` | Hanya di komponen daun bertanda `'use client'`. |
| Ikon | `lucide-react` | Import per-ikon, tree-shaken. |
| Aset peta | SVG yang ditulis sendiri | Lihat §5. |
| PDF | `jspdf`, dynamic import | Tidak masuk bundle awal. |
| AI | `fetch` ke REST Gemini | Nol dependency. |
| Hosting | Vercel Hobby | Sesuai PRD. |

Dependency runtime seluruhnya: `next`, `react`, `react-dom`, `framer-motion`,
`lucide-react`, `jspdf`, `tailwindcss`. Tidak ada state manager, tidak ada
form library, tidak ada audio library.

---

## 2. Struktur folder

```
app/
  layout.tsx              # font, metadata, <GameProvider>
  page.tsx                # landing (server component) + <OnboardingModal/>
  play/page.tsx           # arena simulasi
  results/page.tsx        # peta final, narasi AI, tombol PDF
  actions/generateReview.ts   # 'use server'
components/
  onboarding-modal.tsx
  hud.tsx                 # 4 indikator + toggle mute
  stat-bar.tsx
  scenario-card.tsx
  city-map.tsx            # satu <svg> berisi 5 plot
  assets/                 # satu komponen SVG per bangunan
    pltu.tsx  plts.tsx  pabrik.tsx  taman.tsx  ...
  sdg-cards.tsx
lib/
  game-context.tsx        # Context + useReducer + persist
  reducer.ts              # murni, tanpa efek samping
  scenarios.json          # 5 ronde
  fallback.ts             # 4 template narasi lokal
  sfx.ts                  # Web Audio, tanpa library
  pdf.ts                  # generator sertifikat
  types.ts
```

Aturan: `reducer.ts` dan `fallback.ts` adalah fungsi murni tanpa import React —
supaya bisa diuji tanpa merender apa pun.

---

## 3. State

```ts
type Stats = { economy: number; environment: number; satisfaction: number; energy: number };

type GameState = {
  leader: { name: string; avatar: 'male' | 'female' } | null;
  round: number;                    // 1..5; 6 = selesai
  stats: Stats;                     // mulai 50 semua, selalu di-clamp 0..100
  choices: { round: number; option: 'a' | 'b'; label: string }[];
  plots: (AssetId | null)[];        // panjang 5
  muted: boolean;
  review: Review | null;
};
```

Satu `useReducer` di dalam satu Context. Tidak ada state manager eksternal —
state ini dangkal dan hanya punya lima aksi.

```ts
type Action =
  | { type: 'start'; leader: Leader }
  | { type: 'choose'; option: 'a' | 'b' }
  | { type: 'review'; review: Review }
  | { type: 'mute'; muted: boolean }
  | { type: 'reset' };
```

**Persistensi.** PRD meminta redirect ke `/results`, tapi Context mati saat
navigasi penuh dan saat refresh. Satu `useEffect` menulis state ke
`sessionStorage` tiap dispatch, dan provider membacanya saat mount. Ini juga
sekalian memenuhi kebutuhan counter sesi di `localStorage` (terpisah, hanya
angka).

**Guard rute.** `/play` tanpa `leader` → redirect `/`. `/results` tanpa
`review` → redirect `/play`. Mencegah juri melihat halaman kosong kalau URL
dibuka langsung.

---

## 4. Mesin skenario

`lib/scenarios.json` — data, bukan kode. Satu entri per ronde:

```json
{
  "id": 1,
  "plot": 0,
  "title": "Pembangunan Sumber Energi Pertama",
  "context": "Kota membutuhkan pasokan listrik dasar...",
  "options": [
    {
      "id": "a",
      "label": "PLTU Batu Bara",
      "blurb": "Murah, cepat, dan langsung menyalakan industri.",
      "effects": { "economy": 20, "environment": -25, "satisfaction": -5, "energy": 20 },
      "asset": "pltu"
    },
    {
      "id": "b",
      "label": "PLTS Surya",
      "blurb": "Investasi besar di awal, bersih untuk seterusnya.",
      "effects": { "economy": -15, "environment": 20, "satisfaction": 10, "energy": 15 },
      "asset": "plts"
    }
  ]
}
```

Reducer menerapkan `effects`, meng-clamp hasilnya ke 0..100, menaruh `asset`
di `plots[plot]`, mencatat pilihan, menaikkan `round`. **Nol pemanggilan API
selama ronde** — sesuai syarat ketahanan rate limit di PRD.

Menambah ronde ke-6 nanti = menambah satu objek JSON. Tidak ada kode yang
perlu diubah.

---

## 5. Peta kota — kenapa SVG yang ditulis sendiri

Kekhawatiran Anda: harus bisa dianimasi, dan tidak boleh rusak di mobile.
Pendekatan ini menjawab keduanya secara struktural, bukan dengan tambalan.

Seluruh peta adalah **satu** elemen SVG:

```tsx
<svg viewBox="0 0 800 520" preserveAspectRatio="xMidYMid meet" className="w-full h-auto">
  <g className="grid">...</g>
  {plots.map((asset, i) => (
    <motion.g key={i} transform={PLOT_TRANSFORM[i]}>
      {asset && <Building id={asset} />}
    </motion.g>
  ))}
</svg>
```

Konsekuensinya:

- **Responsif tanpa breakpoint.** `viewBox` + `w-full h-auto` membuat peta
  menskalakan diri dari 375px sampai 1920px dengan proporsi identik. Tidak ada
  aset yang terpotong, tidak ada yang buram, tidak ada versi `@2x`.
- **Animasi per bagian.** Yang dianimasi adalah `<g>` pembungkus plot
  (`y`, `opacity`, `scale`) — bukan isi SVG-nya. Framer Motion hanya menyentuh
  transform, jadi tetap di GPU compositor dan tidak memicu reflow.
- **Tema ikut CSS.** Warna bangunan memakai `fill="var(--brick)"` dsb, jadi satu
  perubahan token mengubah seluruh kota. Mustahil dilakukan dengan WebP.
- **~2KB per bangunan**, inline, nol request jaringan, nol layout shift (CLS 0).

Semua bangunan digambar pada satu unit grid isometrik yang sama
(`lib/iso.ts`: rasio 2:1) supaya duduknya pas di plot tanpa penyesuaian manual.

`prefers-reduced-motion` mematikan animasi jatuhnya bangunan — bangunan langsung
muncul.

---

## 6. Server Action & kontrak AI

`app/actions/generateReview.ts`:

```ts
'use server';
export async function generateReview(p: ReviewPayload): Promise<Review>;

type Review = {
  title: string;
  narrative: string;
  sdgReflection: string;
  fallback: boolean;   // true → UI menampilkan badge "Laporan Hasil Evaluasi Standar"
};
```

Implementasi:

- `POST https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL}:generateContent`
- `AbortSignal.timeout(4000)` — sesuai batas 4 detik di PRD.
- `generationConfig: { responseMimeType: 'application/json', responseSchema: {...} }`
  → JSON valid dijamin oleh API, bukan oleh harapan.
- Prompt meminta output **Bahasa Indonesia** secara eksplisit.
- `try/catch` membungkus semuanya; error apa pun (timeout, rate limit, kuota
  habis, offline, JSON cacat) → `fallbackReview(stats, leader)`.
- Dipanggil **tepat satu kali** per sesi, saat ronde 5 selesai.

`GEMINI_API_KEY` hanya ada di `.env.local` dan Vercel env. Tidak pernah
di-prefix `NEXT_PUBLIC_`, dan karena hanya dibaca di dalam Server Action, tidak
mungkin ikut ke bundle browser.

### Fallback lokal

PRD meminta pemilihan berdasarkan parameter tertinggi/terendah. Diturunkan
menjadi empat kuadran deterministik atas `environment` × `economy`:

| Lingkungan | Ekonomi | Judul |
|---|---|---|
| ≥ 50 | ≥ 50 | Metropolis Seimbang 2050 |
| ≥ 50 | < 50 | Surga Hijau yang Sunyi |
| < 50 | ≥ 50 | Kota Metropol Polutan |
| < 50 | < 50 | Kota di Ambang Krisis |

Empat template dengan interpolasi nama pemimpin dan angka statistik. Murni
data, ~30 baris, tanpa jaringan. Diuji dengan mencabut internet di ronde 5.

---

## 7. Audio

`lib/sfx.ts` — satu `AudioContext` yang dibuat **lazy pada klik pertama**
(browser memblokir AudioContext sebelum interaksi pengguna). Nada dibangkitkan
dengan `OscillatorNode`, jadi nol file audio dan nol dependency. Tiga suara:
klik, bangunan jatuh, permainan selesai. Toggle mute di HUD, tersimpan di state.

Musik latar lo-fi (Open Question 1 di PRD) **tidak masuk v1.0** — butuh file
audio yang berlisensi dan menambah berat halaman. Tambahkan kalau setelah
testing masih ada waktu.

---

## 8. Anggaran performa & aksesibilitas

Aksesibilitas mudah gagal di sebuah game, dan Lighthouse menilainya terpisah.
Yang wajib:

- `aria-live="polite"` pada perubahan statistik, supaya pembaca layar
  mengumumkan dampak pilihan.
- Fokus berpindah ke judul kartu skenario tiap ronde baru.
- Tinggi tombol aksi minimum 48px (sesuai PRD), ring fokus terlihat jelas.
- Kontras teks ≥ 4.5:1 — diverifikasi, bukan diasumsikan.
- SVG peta diberi `role="img"` + `<title>` yang merangkum kondisi kota.

Performa:

- `framer-motion` tidak pernah di-import di `layout.tsx` atau komponen server.
- `jspdf` hanya lewat `await import()` di dalam handler tombol.
- Font via `next/font` (self-host, `display: swap`).
- Target: FCP < 1.0s, TTI < 1.8s, JS awal < 200KB.

---

## 9. Pengujian

Tanpa framework. Dua berkas self-check berbasis `assert`, dijalankan dengan
`node --test`:

- `reducer.test.ts` — clamp di 0 dan 100, urutan ronde, plot terisi sesuai
  pilihan.
- `fallback.test.ts` — keempat kuadran mengembalikan judul yang benar.

Verifikasi manual sesuai rencana PRD: 20 kali main penuh, cabut internet di
ronde 5, Lighthouse di URL preview Vercel.

---

## 10. Git & deploy

- Remote: `https://github.com/sija-sukses/ecopolis.git`
- Author commit: `aldopsr <mochammadalthofsr@gmail.com>`. Tidak ada atribusi AI
  di pesan commit mana pun.
- `.env.local` masuk `.gitignore`. `.env.example` dikomit berisi nama variabel
  saja.
- Vercel terhubung ke branch `main`, deploy otomatis tiap push.

---

## 11. Yang masih menunggu

1. **Referensi visual dari Anda** — palet, tipografi, mood. Memblokir penulisan
   komponen apa pun; struktur di dokumen ini tidak terpengaruh.
2. **`GEMINI_API_KEY`** — dibutuhkan untuk memverifikasi model mana yang benar-benar
   bisa diakses kunci Anda (`GET /v1beta/models`) sebelum mengandalkan
   `gemini-3.8-flash`.
3. **Isi 5 skenario** — judul, konteks, dan angka efeknya perlu diseimbangkan
   supaya tidak ada pilihan yang jelas selalu benar. Saya ajukan draf, Anda koreksi.
