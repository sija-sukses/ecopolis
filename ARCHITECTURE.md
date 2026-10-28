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
  scenarios.ts            # 5 ronde (data, bukan logika)
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

`lib/scenarios.ts` — tetap data murni, bukan logika, tapi sebagai `const`
TypeScript alih-alih `.json` seperti rencana awal. Alasannya: array ber-tipe
`Scenario[]` membuat salah tulis kunci efek (`enviroment`) gagal saat build,
sedangkan JSON akan lolos dan baru terasa salah saat dimainkan. Import-nya juga
bersih di Next maupun di `node --test`, tanpa `with { type: 'json' }`.

Reducer menerapkan `effects`, meng-clamp hasilnya ke 0..100, menaruh `asset`
di `plots[plot]`, mencatat pilihan, menaikkan `round`. **Nol pemanggilan API
selama ronde** — sesuai syarat ketahanan rate limit di PRD.

Menambah ronde ke-6 nanti = menambah satu entri di array. Tidak ada kode yang
perlu diubah.

### Penyeimbangan lima ronde

Lima dilema: energi, transportasi, lahan kosong, sampah, permukiman. Angka
efeknya disetel supaya **tidak ada opsi yang unggul di keempat statistik**
sekaligus — ada satu tes yang memverifikasi ini, jadi penyeimbangan tidak bisa
rusak tanpa ketahuan.

Dua jalur ekstrem sengaja berakhir krisis: serba-hijau menamatkan permainan
dengan ekonomi ~10, serba-ekonomi dengan lingkungan ~0. Di situlah pelajaran
tradeoff-nya, dan keduanya punya narasi fallback sendiri.

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

## 10a. Arah visual

Dibagikan oleh taste-skill, seed 131985738: **Loud and flat** (poster datar),
tipografi **Chivo** 900, sektor education, nada playful.

Satu slot ditolak dan diganti, sesuai aturan skill-nya sendiri: palet bagian
(abu, mint, oranye) tidak dipakai karena bertabrakan dengan referensi visual
yang Anda berikan. **Proporsinya** tetap dipertahankan (satu ground, satu ink,
satu aksen, tiap panel satu warna penuh), tapi warnanya diambil dari
referensi: lavender `#c3cef6`, ink `#16193a`, aksen `#ff6b3d`, bidang hijau
`#86c45a` dan oranye `#f5b06a`.

Ide halamannya: **lima petak kosong Ecopolis menjadi tulang punggung halaman**.
Tiap materi edukasi adalah satu petak dan menyiapkan ronde dengan persoalan
yang sama, jadi belajar adalah pengarahan, bukan jalan memutar.

Satu hal yang bisa dimainkan di landing page: keputusan ronde 1 yang sungguhan,
memakai data dan rumus yang sama dengan permainannya (`components/try-round.tsx`).

Dua penyimpangan dari blueprint yang dibagikan, keduanya karena gerbang
pengukurnya sendiri menolak versi aslinya:

1. Panel edukasi aslinya memakai kata kerja raksasa yang menempel di tengah
   layar sementara fotonya lewat di belakang. Itu membuat teks tertimpa gambar
   dan terpotong di tepi atas. Diganti: foto menguasai satu sisi, teks sisi
   lain, warna bidang berganti tiap panel.
2. Tangga pernyataan di bagian "Tidak ada yang gratis" diturunkan ke 36px dan
   ditandai sebagai paragraf, bukan judul, karena aturan rumahnya membatasi
   judul maksimal dua baris.

### Sistem isometrik

Satu ubin 128 x 64. Kelima petak **adalah** pulaunya: balok rumput setebal 24
dengan sisi tanah, tanpa slab besar di bawahnya, karena susunan lima petak
hanya mengisi lima dari sembilan sel dan slab persegi selalu menyisakan tanah
kosong yang terbaca sebagai piring hampa.

Bangunan digambar seukuran ubin penuh lalu dikecilkan 0.85 supaya tetap ada
ruang di sekeliling tiap petak. Sempat dipakai `<symbol>` + `<use>` agar bisa
dipakai ulang, tapi viewport milik `<symbol>` memotong bangunan yang menjulang
keluar darinya, dan satu halaman hanya memuat satu peta: indirection-nya tidak
menghemat apa pun.

Sub-bangunan (cerobong, atap, bak, menara) ditempatkan lewat `at(u, v, lift)`
dalam satuan ubin, bukan dengan menebak offset piksel. Pada bidang isometrik,
bergeser mendatar sejauh dx selalu berarti bergeser menurun dx/2 juga; tanpa
aturan itu sub-bangunan tampak melayang lepas dari atapnya.

**Jebakan yang sempat memakan waktu paling lama:** `transform` CSS pada elemen
SVG **menimpa** atribut `transform`-nya. Animasi jatuhnya bangunan sempat
dipasang pada elemen yang sama dengan posisi petaknya, sehingga keadaan akhir
animasi menghapus `translate(x y)` dan menumpuk kelima petak di titik asal.
Posisi dan animasi kini dipisah ke dua elemen bersarang.

## 11. Yang masih menunggu

1. **Referensi visual dari Anda** — palet, tipografi, mood. Memblokir penulisan
   komponen apa pun; inti logika di atas tidak terpengaruh dan sudah jalan.
2. **`GEMINI_API_KEY`** — dibutuhkan untuk memverifikasi model mana yang benar-benar
   bisa diakses kunci Anda (`GET /v1beta/models`) sebelum mengandalkan
   `gemini-3.8-flash`. Tanpa kunci, aplikasi tetap jalan memakai narasi lokal.
3. **Koreksi isi 5 skenario** — draf sudah ada di `lib/scenarios.ts`. Yang perlu
   Anda nilai: apakah dilemanya terasa realistis untuk konteks Indonesia.
4. **Kunci Gemini di Vercel** — tanpa `GEMINI_API_KEY`, `/results` selalu
   memakai narasi lokal dan menampilkan badge "Laporan Hasil Evaluasi Standar".

## 12. Catatan pelaksanaan

- `framer-motion` **tidak dipasang**, meski disebut di PRD. Pergantian kartu
  ditangani `key={round}` plus animasi CSS, dan jatuhnya bangunan juga CSS.
  Keduanya nol byte tambahan, yang langsung menolong target Lighthouse. Pasang
  kalau nanti benar-benar butuh animasi keluar (exit) yang sulit ditulis
  dengan CSS.
- Onboarding jadi layar pertama `/play`, bukan modal di landing page. PRD
  menyebut "Modal/Page overlay", jadi keduanya sah; cara ini menghapus
  kebutuhan guard redirect dan menjaga landing page tetap ringan.
- Sertifikat PDF menyuntikkan peta sebagai PNG. SVG-nya diserialisasi lebih
  dulu dan setiap `var(--x)` diganti nilai nyatanya yang dibaca dari dokumen,
  karena custom property CSS tidak ikut terbawa saat SVG dilepas dari halaman.
