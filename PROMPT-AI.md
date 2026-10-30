# Prompt pengenalan proyek Ecopolis

Salin seluruh isi berkas ini ke AI yang akan ikut mengerjakan proyek, sebagai
pesan pertama. Setelah itu baru sampaikan tugasnya.

---

## Peranmu

Kamu ikut mengerjakan **Ecopolis**, simulator kebijakan iklim untuk lomba web
design **INVOFEST 2026**. Batas pengumpulan **5–7 November 2026**, jadi
ruangnya sempit: utamakan menyelesaikan yang sudah ada daripada menambah yang
baru.

Repo: `https://github.com/sija-sukses/ecopolis` · branch `main`.

Dua berkas yang **wajib** kamu baca sebelum menulis kode apa pun:

- `ARCHITECTURE.md` — rencana implementasi. Kalau isinya berbeda dengan
  `PRD.md`, **ARCHITECTURE.md yang menang**. PRD adalah niat, ARCHITECTURE
  adalah rencana yang sudah dikoreksi.
- `AGENTS.md` — peringatan bahwa Next.js di sini versi baru dan API-nya bisa
  berbeda dari ingatanmu. Baca dokumen di `node_modules/next/dist/docs/`
  sebelum memakai API Next yang kamu "hafal".

---

## Apa yang sudah jadi

Permainan sudah bisa ditamatkan dari awal sampai akhir. Tujuh commit, semuanya
sudah di `main`.

| Bagian | Status |
|---|---|
| Landing page + bagian edukasi | Selesai |
| Inti logika (reducer, skenario, fallback) | Selesai, 26 tes |
| `/play` (onboarding, HUD, 5 ronde) | Selesai |
| `/results` (narasi, kartu SDG, PDF) | Selesai |
| Server action Gemini + fallback dua lapis | Selesai, **belum diuji dengan kunci asli** |
| 10 aset isometrik | Selesai, masih perlu penyetelan |
| 6 avatar + animasi | Selesai |
| Sertifikat PDF | Selesai |
| Sinematik pembangunan per ronde | Selesai |

**Yang belum selesai, kerjakan ini dulu sebelum menambah fitur:**

1. **`GEMINI_API_KEY` belum pernah dipasang.** Jadi `/results` selalu memakai
   narasi cadangan lokal dan menampilkan badge "Laporan Hasil Evaluasi
   Standar". Jalur cadangan sudah teruji; jalur AI-nya belum pernah jalan.
   Ini 25% bobot penilaian lomba.
2. **Kisi panel surya (`Plts` di `components/iso.tsx`)** masih terbaca seperti
   bintang, bukan kisi 3×3 yang rapi.
3. **Dek tol (`Tol`)** terlalu besar dan mendominasi petaknya.
4. **Belum di-deploy ke Vercel.**

---

## Aturan yang tidak boleh dilanggar

- **Jangan pasang `framer-motion`.** PRD menyebutnya, tapi sengaja tidak
  dipakai: pergantian kartu ditangani `key={round}` + animasi CSS, jatuhnya
  bangunan juga CSS. Nol byte tambahan, dan itu langsung menolong target
  Lighthouse. Pasang hanya kalau benar-benar butuh animasi keluar (exit).
- **Jangan pasang `html2canvas`.** Ia merender ulang CSS dengan mesinnya
  sendiri dan pecah pada gradien, `backdrop-filter`, dan warna `oklch`.
  PDF memakai `jspdf` saja lewat `await import()`.
- **Jangan hardcode ID model Gemini.** Pakai `process.env.GEMINI_MODEL`
  (bawaan `gemini-3.8-flash`). `gemini-1.5-flash` yang ditulis di PRD **sudah
  tidak ada** di dokumentasi Google, dan `gemini-2.0-flash` juga sudah
  dimatikan. Ini pernah jadi bug fatal yang nyaris lolos.
- **Jangan tambah dependensi** tanpa alasan yang bisa dinyatakan. Seluruh
  runtime hanya: `next`, `react`, `react-dom`, `jspdf`, `tailwindcss`.
- **Jangan sentuh berkas di `avatar/`.** Itu karya pemilik proyek. Salinannya
  di `public/avatar/*.svg` harus identik; sudah pernah ada kesalahan menggambar
  ulang avatar dan itu ditolak.
- **Commit atas nama pemilik proyek**, tanpa atribusi AI apa pun, tanpa
  trailer `Co-authored-by`. Verifikasi sesudah commit dengan
  `git log -1 --pretty='%an <%ae>%n%B'`.
- **Komentar dan teks UI berbahasa Indonesia.** Ikuti gaya komentar yang ada:
  menjelaskan **kenapa**, bukan mengulang apa yang sudah terbaca dari kodenya.

---

## Stack

Next.js **16.4.3** (App Router, Turbopack), React 19.3, TypeScript strict,
Tailwind v4 (hanya preflight; tata letaknya CSS biasa bertoken), `jspdf`.

Import memakai ekstensi `.ts` / `.tsx` secara eksplisit
(`allowImportingTsExtensions: true`), supaya berkas yang sama bisa dijalankan
Next **dan** `node --test` tanpa loader.

Perintah verifikasi, jalankan ketiganya sebelum bilang selesai:

```bash
npm test && npm run typecheck && npm run build
```

Ada juga gerbang desain dari taste-skill (`inspect.mjs`) yang harus tetap
**0 FAIL** pada 1440, 768, dan 390 px.

---

## Sistem desain

Arah seni: **"Loud and flat"** (poster datar), seed `131985738`, tipografi
**Chivo 900**. Paletnya diambil dari referensi visual pemilik proyek, bukan
dari palet yang dibagikan skill.

**Proporsi yang dipegang:** satu ground, satu ink, satu aksen. Tiap panel satu
warna penuh, teksnya satu warna lain.

```
--bg #c3cef6   --ink #16193a   --accent #ff6b3d   --surface #d8dff9
--field-grass #86c45a   --field-warm #f5b06a   --field-ink #16193a   --field-paper #fff
```

Material kota isometrik selalu bertiga (tutup, sisi kiri, sisi kanan):
`grass`, `stone`, `warm`, `leaf`, `brick`, `steel`, `coal`, `isle`, plus
`solar`, `asphalt`, `bus`, `pond`, `glass`, `smoke`, `sun`.
Daftar lengkapnya di blok `:root` pada `app/globals.css`. **Jangan tulis
warna literal di komponen** — selalu lewat token.

Bentuk diputuskan sekali: radius blok `--r: 28px`, tombol bulat penuh
(`999px`), lima langkah ukuran huruf (`--step-small` … `--step-head`) plus
`--step-statement` untuk pernyataan besar.

**Aturan rumah yang diukur oleh gerbangnya:**

- Judul maksimal **dua baris** di setiap lebar.
- Pernyataan besar adalah `<p>`, maksimal 36px di desktop.
- Tidak ada eyebrow/label kecil di atas judul, tidak ada penomoran 01/02/03.
- Tidak ada garis tipis, gradien, bayangan pada benda diam, glass/blur.
- Tidak ada monospace di luar blok kode, tidak ada emoji.
- Margin luar kiri dan kanan sama; tidak ada bagian yang isinya menumpuk di
  satu sisi dengan separuh layar kosong.
- Tiap bagian punya judul.

---

## Sistem isometrik — baca ini sebelum menyentuh aset

File: `components/iso.tsx` (bangunan) dan `components/city-map.tsx` (peta).

**Dasarnya:**

- Satu ubin `128 × 64` (rasio 2:1). `HW = 64`, `HH = 32`.
- Proyeksi: `iso(tx, ty) = [(tx - ty) * 64, (tx + ty) * 32]`.
- Lima petak tersusun seperti mata dadu lima: `[1,0] [0,1] [1,1] [2,1] [1,2]`.
  Urutannya **sudah dari belakang ke depan** (menurut `tx + ty`), jadi
  bangunan depan menimpa yang belakang dengan benar. Jangan diacak.
- Tiap petak adalah balok rumput setebal `PAD_H = 24` dengan sisi tanah.
  **Kelima petak itulah pulaunya** — tidak ada slab besar di bawahnya, karena
  susunan lima petak hanya mengisi 5 dari 9 sel dan slab persegi selalu
  menyisakan tanah kosong yang terbaca sebagai piring hampa.
- Bangunan digambar seukuran ubin penuh lalu dikecilkan `BUILDING_SCALE = 0.85`
  dan digeser `BUILDING_LIFT` supaya duduk di atas pad.
- Seluruh peta satu elemen `<svg viewBox="-148 -136 296 284">`, jadi skalanya
  mengikuti lebar kontainer dari 375px sampai 1920px tanpa satu breakpoint pun
  dan tanpa aset yang bisa terpotong.

**Empat jebakan yang masing-masing memakan waktu berjam-jam. Jangan mengulangi:**

1. **`transform` CSS pada elemen SVG menimpa atribut `transform`-nya.**
   Animasi jatuhnya bangunan pernah dipasang pada elemen yang sama dengan
   posisi petaknya; keadaan akhir animasi (`translateY(0) scale(1)`) menghapus
   `translate(x y)` dan **menumpuk kelima petak di titik asal**. Gejalanya:
   kota terlihat seperti gumpalan kecil dan pulaunya terlihat kebesaran.
   Posisi dan animasi **harus di dua elemen bersarang yang terpisah**.

2. **`inset` dikurangkan dari setengah lebar ubin (64), bukan dari 128.**
   Nilai `inset` di atas 64 membuat badan bangunan berlebar **negatif**, dan
   yang tersisa hanya atap melayang di atas tiang. Badan utama yang wajar ada
   di `inset` 22–26 (sekitar 60% ubin); volume sekunder 36–50.

3. **Sub-bangunan ditempatkan lewat `at(u, v, lift)`, bukan tebakan piksel.**
   Pada bidang isometrik, bergeser mendatar sejauh `dx` selalu berarti bergeser
   menurun `dx/2` juga. Tanpa helper itu, cerobong dan atap tampak melayang
   lepas dari badannya. Jendela dan pintu memakai `facePoints()` supaya
   benar-benar menempel pada bidang miringnya.

4. **`transform-origin: 0 0` dengan `transform-box: view-box` berporos di
   (0,0) ruang pengguna**, bukan di sudut kiri-atas viewBox seperti yang
   terbaca dari spesifikasinya. Rumus kamera yang "benar di atas kertas"
   meleset 1300px karenanya. Kalau menyentuh kamera, ukur dengan
   `getScreenCTM()` di peramban, jangan percaya turunan di atas kertas.

**Dulu pernah dipakai `<symbol>` + `<use>` dan sudah dibuang:** viewport milik
`<symbol>` memotong bangunan yang menjulang keluar darinya, sementara satu
halaman hanya memuat satu peta berisi lima bangunan. Indirection-nya tidak
menghemat apa pun. Gambar bangunan langsung.

**Kesepuluh aset dan penanda yang membuatnya tidak bisa tertukar** (digambar
ulang dari foto referensi di folder `refrensi/`):

| id | Penanda |
|---|---|
| `pltu` | Gedung boiler bata merah, dua cerobong tinggi bergaris putih, timbunan batu bara hitam |
| `plts` | Panel **navy gelap dengan kisi putih** di atas kaki, plus kotak inverter |
| `tol` | Dek aspal bermarka putih di atas dua pilar, satu mobil |
| `brt` | Halte kaca beratap putih, bus listrik biru berjendela |
| `industri` | Blok bata, dua tangki baja, peti kemas bertumpuk |
| `hutan` | Pohon bulat, satu pohon jarum, kolam kecil |
| `tpa` | Gundukan bertingkat, serakan berwarna, truk sampah hijau |
| `daurulang` | Hanggar beratap hangat, tiga bak pilah beda warna |
| `perumahan` | Empat rumah beratap pelana berjendela |
| `apartemen` | Dua menara berjendela dengan teras hijau |

Pelajaran yang mahal: PLTS pernah memakai biru muda (`--glass`), warna yang
sama dengan air, sehingga panel surya terbaca sebagai genangan. **Siluet harus
bisa dikenali tanpa label.**

---

## Avatar

Enam avatar piksel `16 × 16` milik pemilik proyek, di `avatar/pria` dan
`avatar/wanita`, disalin **apa adanya** ke `public/avatar/<id>.svg`. Tidak satu
warna pun boleh diubah. Komponen `Avatar` hanya memasangnya sebagai `<img>`
dengan `image-rendering: pixelated`.

Katalognya data murni di `lib/avatars.ts` (id, nama, jenis kelamin), terpisah
dari gambarnya, supaya `fallback.ts` dan server action bisa menurunkan
panggilan Bapak/Ibu tanpa menyentuh JSX dan tes `node --test` tetap jalan.

Muncul di empat tempat: pemilih onboarding, papan indikator, kepala laporan,
sertifikat PDF. Tiga animasi, semuanya CSS dan semuanya mati pada
`prefers-reduced-motion`.

---

## Cara state bekerja

```ts
GameState = { leader, round, stats, choices, plots, muted, review }
```

Satu `useReducer` di dalam satu Context (`lib/game-context.tsx`). Tidak ada
state manager eksternal. Provider hanya dipasang di `app/(game)/layout.tsx`,
jadi landing page tidak ikut memuat JavaScript-nya.

State ditulis ke `sessionStorage` tiap berubah, dan **divalidasi bentuknya**
(`isGameState`) saat dibaca kembali: isinya datang dari luar program, jadi satu
entri cacat membatalkan seluruh pemulihan alih-alih merusak halaman.

Statistik selalu di-clamp 0–100. Lima skenario di `lib/scenarios.ts` adalah
`const` bertipe, bukan JSON, supaya salah tulis kunci efek gagal saat build.
Ada tes yang memastikan **tidak ada opsi yang unggul di keempat statistik**;
kalau kamu mengubah angkanya dan permainan jadi punya "jawaban benar", tes itu
akan gagal.

**Ketahanan AI, inti dari PRD:** server action dipanggil **tepat sekali** di
ronde terakhir, dengan timeout 4 detik dan `responseSchema` yang memaksa JSON
valid. Kegagalan apa pun jatuh ke narasi cadangan di server; kalau
pemanggilannya sendiri gagal (offline), narasi cadangan dibangkitkan di klien.
Dua lapis, jadi permainan tidak punya jalan buntu. **Jangan hilangkan salah
satunya.**

---

## Sertifikat PDF

`lib/pdf.ts`. Seluruh tata letaknya memakai **koordinat tetap** di objek `Y`.
Versi pertamanya menghitung posisi batang indikator dari tinggi gambar peta,
sehingga begitu petanya tinggi, keempat batang terdorong keluar halaman.
Sekarang kebalikannya: kotaknya tetap, isinya yang dipaskan. Peta diskalakan
masuk, narasi diturunkan ukurannya (9,5→8 pt) sampai muat dengan pagar di
batas bawah.

**Kalau menambah isi ke PDF, tambahkan kotaknya dulu di `Y`, jangan menghitung
posisi dari tinggi isi yang lain.**

---

## Yang kuharapkan darimu

1. Baca `ARCHITECTURE.md` sebelum mulai.
2. Kerjakan yang diminta saja; jangan melebarkan cakupan.
3. Jalankan `npm test && npm run typecheck && npm run build` sebelum bilang
   selesai, dan laporkan hasilnya apa adanya.
4. Kalau menemukan masalah pada rencana yang ada, katakan dalam satu dua
   kalimat lalu tetap kerjakan, dengan asumsimu dinyatakan jelas.
5. Kalau sesuatu tidak sempat selesai, katakan bagian mana yang tidak selesai.
   Jangan melaporkan selesai untuk pekerjaan yang belum diverifikasi.
