# Ecopolis — Simulator Kebijakan Iklim Indonesia 2050

**Bangun kota. Tentukan masa depannya.**

**Ecopolis** adalah aplikasi web simulasi tata kelola kota dan kebijakan iklim interaktif yang dirancang untuk kompetisi **INVOFEST 2026**. Pengguna berperan sebagai Wali Kota yang memimpin pembangunan lima kawasan strategis—menyeimbangkan **Ekonomi**, **Lingkungan**, **Kepuasan Warga**, dan **Energi**—untuk melihat bagaimana keputusan hari ini membentuk wujud kota pada tahun **2050**.

Repositori Utama: [github.com/sija-sukses/ecopolis](https://www.google.com/search?q=https://github.com/sija-sukses/ecopolis)

## Fitur Utama

* **Peta Isometrik Hidup Berbasis SVG Murni (`0 KB` Gambar Eksternal)**: Seluruh pulau kota, bangunan 5 kawasan, aliran sungai, air terjun, pekerja miniatur 3D, kepulan asap polusi, hingga lalu lintas jalan tol digambar dengan primitif SVG pada proyeksi isometrik `2:1` (`components/city-map.tsx` & `components/iso.tsx`). Responsif tajam dari layar ponsel `375px` hingga desktop `1920px` dengan *Cumulative Layout Shift* (CLS) `0`.
* **Sinematik Pembangunan & Peresmian 6 Tahap**: Setiap keputusan kebijakan memicu pergerakan kamera sinematik langsung di atas peta (`zoom-in` → `iris-in` → `inspect` → `ceremony` → `iris-out` → `zoom-out`), menampilkan derek konstruksi hingga prosesi pemotongan pita oleh Wali Kota yang selalu dapat dilewati (*skip*) kapan saja.
* **Ronde Percobaan Langsung di Beranda (`TryRound`)**: Pengunjung dapat langsung menguji dilema Ronde 1 di halaman utama (`components/try-round.tsx`) menggunakan rumus simulasi asli sebelum masuk ke permainan penuh.
* **TARA — Staf Ahli AI Interaktif (Teks & Suara Bahasa Indonesia)**: Asisten AI mengambang yang dapat digeser (*draggable orb*), mendukung input mikrofon suara (`SpeechRecognition` `id-ID`) dan balasan suara (`speechSynthesis`), peringatan darurat otomatis (*SOS Crisis Nudge*) saat indikator menyentuh angka kritis (`<= 30`), serta pintasan keyboard `Alt+T` / `[T]`.
* **Dossier Evaluasi 2050 & Arsitektur *Zero-Failure Fallback***: Menggunakan Next.js Server Actions (`app/actions/generateReview.ts` & `app/actions/askAdvisor.ts`) yang terhubung ke REST API **Google Gemini** (`gemini-3.5-flash-lite`) dengan validasi skema JSON ketat (`responseSchema`) dan batas waktu `4 detik`. Jika kuota API habis, jaringan terputus, atau *timeout*, sistem otomatis beralih ke mesin narasi deterministik 4 kuadran (`lib/fallback.ts` & `lib/advisor.ts`) tanpa pernah gagal di hadapan pengguna atau juri.
* **Generator Sertifikat PDF & Kartu Story 9:16**: Unduh **Sertifikat Kepemimpinan Resmi A4** atau **Kartu Story Media Sosial** langsung di sisi klien (`lib/pdf.ts`) menggunakan *dynamic import* `jspdf` dan serialisasi peta SVG resolusi tinggi.
* **Sintesis Efek Suara Web Audio API Tanpa File Audio**: Efek suara klik, konstruksi bangunan, gunting pita peresmian, stempel evaluasi resmi, dan penyelesaian permainan dibangkitkan secara prosedural lewat `OscillatorNode` (`lib/sfx.ts`) tanpa memuat berkas `.mp3` atau `.wav`.

## Lima Dilema Kebijakan & Keterkaitan UN SDGs

Setiap sesi permainan terdiri atas **5 ronde keputusan biner (Opsi A vs Opsi B)** yang telah diseimbangkan secara matematis di `lib/scenarios.ts` agar tidak ada pilihan yang unggul di keempat indikator sekaligus:

| Ronde | Kawasan & Skenario | Opsi A (Fokus Akselerasi / Konvensional) | Opsi B (Fokus Transisi Hijau / Berkelanjutan) | Indikator Utama yang Diuji |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Energi** — *Pembangunan Sumber Energi Pertama* | **PLTU Batu Bara** (`+18` Eko, `-14` Ling, `-12` Warga, `+20` Energi) | **PLTS Surya** (`-10` Eko, `+16` Ling, `+8` Warga, `+14` Energi) | Pasokan listrik awal vs emisi karbon |
| **2** | **Mobilitas** — *Krisis Kemacetan Kota* | **Jalan Tol Dalam Kota** (`+15` Eko, `-10` Ling, `-6` Warga, `-8` Energi) | **BRT Listrik Terpadu** (`-8` Eko, `+12` Ling, `+10` Warga, `-12` Energi) | Kelancaran logistik vs transportasi publik |
| **3** | **Lahan** — *Perebutan Lahan Kosong Utara* | **Kawasan Industri** (`+22` Eko, `-14` Ling, `-12` Warga, `-12` Energi) | **Hutan Kota** (`-6` Eko, `+18` Ling, `+14` Warga) | Lapangan kerja & pajak vs daerah resapan |
| **4** | **Sampah** — *Gunung Sampah di Pinggir Kota* | **Perluas TPA Terbuka** (`+10` Eko, `-12` Ling, `-16` Warga) | **Pusat Daur Ulang & PLTSa** (`-10` Eko, `+14` Ling, `+8` Warga, `+10` Energi) | Penghematan APBD jangka pendek vs ekonomi sirkular |
| **5** | **Hunian** — *Satu Juta Warga Baru* | **Perumahan Horizontal** (`+14` Eko, `-10` Ling, `+10` Warga, `-8` Energi) | **Apartemen Vertikal Hijau** (`-6` Eko, `+12` Ling, `-4` Warga, `-4` Energi) | Preferensi rumah tapak vs efisiensi tata ruang |

Keempat indikator kota dipetakan langsung terhadap target **Tujuan Pembangunan Berkelanjutan (UN SDGs)** pada halaman laporan akhir (`/results`):

* **Ekonomi** — **SDG 8**: Pekerjaan Layak dan Pertumbuhan Ekonomi
* **Lingkungan** — **SDG 13**: Penanganan Perubahan Iklim
* **Kepuasan Warga** — **SDG 11**: Kota dan Permukiman Berkelanjutan
* **Energi** — **SDG 9**: Industri, Inovasi, dan Infrastruktur

## Teknologi yang Digunakan

| Lapisan | Teknologi | Keterangan |
| :--- | :--- | :--- |
| **Framework** | [Next.js 16.4](https://nextjs.org/) (App Router) & [React 19.3](https://react.dev/) | Server Components untuk beranda cepat, Server Actions untuk keamanan kunci API. |
| **Bahasa** | [TypeScript 5](https://www.typescriptlang.org/) | Tipe ketat untuk skenario, state permainan, dan skema respons AI. |
| **Styling & UI** | [Tailwind CSS v4](https://tailwindcss.com/) & CSS Modules | Arah seni *Loud and Flat* dengan tipografi `Chivo` 900 dan animasi komposit GPU. |
| **Kecerdasan Buatan** | [Google Gemini API](https://ai.google.dev/) (`gemini-3.5-flash-lite`) | Dipanggil lewat `fetch` REST murni di Server Action dengan `responseSchema` terstruktur. |
| **Ikon & Dokumen** | [Lucide React](https://lucide.dev/) & [jsPDF 4.2](https://github.com/parallax/jsPDF) | Ikon *tree-shaken* dan pembuatan PDF/Story Card dengan *lazy dynamic import*. |
| **Pengujian** | Node.js Native Test Runner (`node --test`) | Pengujian unit murni tanpa dependensi framework tambahan. |

## Struktur Direktori

```text
ecopolis/
├── app/
│   ├── actions/
│   │   ├── askAdvisor.ts         # Server Action konsultasi interaktif AI TARA
│   │   └── generateReview.ts     # Server Action evaluasi akhir kota tahun 2050
│   ├── (game)/
│   │   ├── play/page.tsx         # Panggung utama simulasi 5 ronde (/play)
│   │   ├── results/page.tsx      # Halaman Dossier Evaluasi 2050 (/results)
│   │   ├── layout.tsx            # Provider state permainan & asisten AI TARA
│   │   └── game.css              # Stylesheet khusus ruang simulasi & laporan
│   ├── globals.css               # Token warna, tipografi, & animasi SVG kota
│   ├── layout.tsx                # Root layout & konfigurasi font Chivo
│   ├── page.tsx                  # Landing page edukatif + ronde percobaan
│   └── page.module.css           # Stylesheet modular landing page
├── components/
│   ├── ai-advisor.tsx            # Komponen orb & panel chat/suara asisten AI TARA
│   ├── avatars.tsx               # Renderer avatar piksel pemimpin (6 karakter)
│   ├── city-map.tsx              # Mesin peta SVG isometrik & kamera sinematik
│   ├── cutscene.tsx              # Overlay transisi iris & keterangan peresmian
│   ├── game.tsx                  # Orkestrator ronde, sinematik, & alur selesai
│   ├── hud.tsx                   # Papan indikator 4 statistik & tombol mute
│   ├── iso.tsx                   # Primitif geometri 3D isometrik & 10 aset bangunan
│   ├── mayor-layer.tsx           # Karakter Wali Kota di Balai Kota & lokasi proyek
│   ├── navbar.tsx                # Navigasi atas dengan morphing floating dock
│   ├── onboarding.tsx            # Layar pemilihan nama & 6 avatar pemimpin
│   ├── policy-icon.tsx           # Ikon kebijakan per opsi skenario
│   ├── results-view.tsx          # Dossier 2050, matriks SDG, & inspektor petak
│   ├── scenario-card.tsx         # Kartu keputusan Opsi A vs Opsi B + pintasan keyboard
│   ├── tol-traffic-layer.tsx     # Animasi kendaraan dua arah di Jalan Tol Layang
│   └── try-round.tsx             # Simulasi interaktif Ronde 1 di beranda
├── lib/
│   ├── advisor.ts                # Logika cadangan lokal & prompt cepat AI TARA
│   ├── advisor.test.ts           # Unit test asisten TARA & penjaga topik
│   ├── avatars.ts                # Katalog data 6 avatar & sapaan Bapak/Ibu
│   ├── city-effects.ts           # Koordinat plot, jangkar peresmian, & durasi kamera
│   ├── fallback.ts               # Mesin narasi deterministik 4 kuadran (offline-ready)
│   ├── fallback.test.ts          # Unit test keakuratan kuadran evaluasi lokal
│   ├── game-context.tsx          # React Context + useReducer + persistensi sessionStorage
│   ├── pdf.ts                    # Generator Sertifikat A4 PDF & Story Card 9:16
│   ├── reducer.ts                # Fungsi reducer murni & clamping statistik (0..100)
│   ├── reducer.test.ts           # Unit test mesin state & keseimbangan skenario
│   ├── scenarios.ts              # Data 5 skenario kebijakan iklim
│   ├── sfx.ts                    # Synthesizer efek suara Web Audio API
│   └── types.ts                  # Definisi tipe TypeScript terpusat
├── public/
│   └── avatar/                   # Aset SVG piksel 6 karakter pemimpin
├── ARCHITECTURE.md               # Dokumentasi keputusan teknis & arsitektur sistem
└── PRD.md                        # Dokumen spesifikasi produk (Product Requirements)
```

## Panduan Instalasi & Menjalankan Proyek

### 1. Prasyarat

* **Node.js** versi `20.x` atau lebih baru
* **npm** (bawaan Node.js)

### 2. Kloning & Instalasi Dependensi

```bash
git clone https://github.com/sija-sukses/ecopolis.git
cd ecopolis
npm install
```

### 3. Konfigurasi Variabel Lingkungan (`.env.local`)

Buat berkas `.env.local` di direktori akar proyek. Anda dapat mengisi kunci API Google Gemini agar narasi evaluasi 2050 dan asisten TARA ditenagai AI secara penuh:

```env
GEMINI_API_KEY=masukkan_kunci_api_gemini_anda_di_sini
GEMINI_MODEL=gemini-3.5-flash-lite
```

> **Catatan Ketahanan Offline**: Tanpa `GEMINI_API_KEY` (atau ketika jaringan luring), aplikasi **tetap berjalan 100% normal** menggunakan mesin narasi lokal deterministik 4 kuadran (`lib/fallback.ts`) dan basis pengetahuan lokal TARA (`lib/advisor.ts`).

### 4. Menjalankan Server Pengembangan

```bash
npm run dev
```

Buka `http://localhost:3000` di peramban Anda.

## Daftar Perintah (`npm scripts`)

| Perintah | Fungsi |
| :--- | :--- |
| `npm run dev` | Menjalankan server pengembangan Next.js. |
| `npm run build` | Membangun bundel produksi yang siap di-deploy. |
| `npm run start` | Menjalankan server produksi hasil `npm run build`. |
| `npm run test` | Menjalankan seluruh pengujian unit (`reducer.test.ts`, `fallback.test.ts`, `advisor.test.ts`) dengan `node --test`. |
| `npm run typecheck` | Memvalidasi seluruh tipe TypeScript (`tsc --noEmit`). |
| `npm run lint` | Memeriksa kualitas kode menggunakan ESLint. |

## Pintasan Papan Ketik & Aksesibilitas

Ecopolis dirancang agar ramah pembaca layar (`aria-live="polite"`, fokus otomatis per ronde) dan mendukung kendali papan ketik penuh selama simulasi:

* **`[A]`** atau **`[1]`** — Memilih **Opsi A** pada kartu skenario aktif di `/play`
* **`[B]`** atau **`[2]`** — Memilih **Opsi B** pada kartu skenario aktif di `/play`
* **`[M]`** — Menyalakan atau mematikan efek suara (*Mute / Unmute*) di papan indikator HUD
* **`[T]`** atau **`Alt + T`** — Membuka atau menutup panel konsultasi Staf Ahli AI **TARA**
* **`[Esc]`** — Melewati (*skip*) adegan sinematik pembangunan atau menutup panel/menu yang sedang terbuka
* **`?autostart=1`** — Parameter URL opsional pada `/play?autostart=1` untuk langsung melewati layar onboarding saat pengujian cepat

## Lisensi & Kredit

Dikembangkan oleh tim **SIJA Sukses** untuk kompetisi desain web nasional **INVOFEST 2026**. Seluruh ilustrasi SVG isometrik, mesin simulasi, dan sintesis audio ditulis khusus untuk proyek ini.
