import Image from 'next/image';
import Link from 'next/link';

import { TryRound } from '@/components/try-round.tsx';
import referenceIsland from '@/public/images/ecopolis-reference.png';
import styles from './page.module.css';

const DILEMMAS = [
  ['Energi', 'Batu bara atau matahari?', 'Jaga listrik tetap menyala tanpa mewariskan langit yang gelap.'],
  ['Mobilitas', 'Jalan baru atau angkutan massal?', 'Pindahkan lebih banyak warga dengan ruang kota yang sama.'],
  ['Lahan', 'Industri atau hutan kota?', 'Setiap petak hanya dapat dipilih sekali dan dampaknya menetap.'],
  ['Sampah', 'Tumpuk atau olah kembali?', 'Pilihan termurah hari ini dapat menjadi tagihan terbesar besok.'],
  ['Hunian', 'Melebar atau meninggi?', 'Tampung warga baru tanpa menelan seluruh daerah resapan.'],
];

function FloatingIsland({ className }: { className: string }) {
  return (
    <div className={`${styles.floatingIsland} ${className}`} aria-hidden="true">
      <span className={styles.islandGrass} />
      <span className={styles.islandLeft} />
      <span className={styles.islandRight} />
      <span className={styles.islandTree} />
      <span className={styles.islandShadow} />
    </div>
  );
}

function Brand() {
  return (
    <Link className={styles.brand} href="#atas" aria-label="Ecopolis, kembali ke atas">
      <span className={styles.brandMark} aria-hidden="true"><i /><i /><i /></span>
      <span>Eco<b>polis</b></span>
    </Link>
  );
}

export default function Home() {
  return (
    <main className={styles.page} id="atas">
      <section className={styles.hero} aria-labelledby="hero-title">
        <Image className={styles.heroImage} src={referenceIsland} alt="Pulau kota Ecopolis bergaya 3D low-poly isometrik, dengan balai kota, bus listrik, panel surya, hutan, sungai, dan turbin angin." fill priority sizes="100vw" />
        <div className={styles.heroWash} />
        <header className={styles.header}>
          <Brand />
          <nav className={styles.nav} aria-label="Navigasi utama">
            <a href="#tentang">Tentang</a><a href="#dilema">Lima dilema</a><a href="#coba">Coba</a>
          </nav>
          <Link className={styles.navCta} href="/play">Main sekarang</Link>
        </header>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Simulator kebijakan iklim Indonesia</p>
          <h1 id="hero-title">Bangun kota. Tentukan masa depannya.</h1>
          <p className={styles.heroLead}>Lima keputusan hari ini akan mengubah ekonomi, lingkungan, energi, dan hidup warga Ecopolis pada tahun 2050.</p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryButton} href="/play">Mulai simulasi</Link>
            <a className={styles.textLink} href="#tentang">Jelajahi kotanya</a>
          </div>
        </div>
        <div className={styles.heroHud} aria-label="Ringkasan permainan">
          <span><b>5</b> keputusan</span><span><b>3</b> menit bermain</span><span><b>2050</b> laporan kota</span>
        </div>
      </section>

      <section className={styles.intro} id="tentang" aria-labelledby="intro-title">
        <FloatingIsland className={styles.islandOne} /><FloatingIsland className={styles.islandTwo} />
        <div className={styles.cloudOne} aria-hidden="true" /><div className={styles.cloudTwo} aria-hidden="true" />
        <div className={styles.sectionInner}>
          <p className={styles.sectionTag}>Selamat datang, Wali Kota</p>
          <h2 id="intro-title">Kota hijau tidak lahir dari pilihan yang mudah.</h2>
          <div className={styles.introGrid}>
            <p>Setiap proyek membantu satu sisi kota dan menekan sisi lainnya. Naikkan ekonomi, emisi bisa ikut naik. Lindungi alam, lapangan kerja bisa berkurang.</p>
            <p>Tidak ada jawaban sempurna. Ada kota yang harus Anda pertanggungjawabkan kepada warganya.</p>
          </div>
        </div>
      </section>

      <section className={styles.dilemmas} id="dilema" aria-labelledby="dilema-title">
        <div className={styles.terrainTop} aria-hidden="true" />
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeading}>
            <div><p className={styles.sectionTag}>Peta keputusan</p><h2 id="dilema-title">Lima petak. Lima konsekuensi.</h2></div>
            <p>Isi satu petak setiap ronde. Lihat kota tumbuh, indikator bergerak, dan masa depan berubah langsung di depan Anda.</p>
          </div>
          <div className={styles.dilemmaList}>
            {DILEMMAS.map(([name, question, copy], index) => (
              <article className={styles.dilemma} key={name}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div><p>{name}</p><h3>{question}</h3></div><p>{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.playground} id="coba" aria-label="Coba satu keputusan Ecopolis">
        <FloatingIsland className={styles.islandThree} />
        <div className={styles.sectionInner}><p className={styles.sectionTag}>Ronde percobaan</p><TryRound /></div>
      </section>

      <section className={styles.how} aria-labelledby="how-title">
        <div className={styles.sectionInner}>
          <p className={styles.sectionTag}>Cara bermain</p><h2 id="how-title">Tiga langkah menuju 2050.</h2>
          <div className={styles.steps}>
            <article><span>01</span><h3>Baca dilemanya</h3><p>Pahami masalah nyata yang dihadapi kota-kota Indonesia.</p></article>
            <article><span>02</span><h3>Pilih kebijakan</h3><p>Bangun satu proyek dan saksikan pulau Anda berubah.</p></article>
            <article><span>03</span><h3>Terima laporannya</h3><p>Lihat warisan kota Anda dalam laporan tahun 2050.</p></article>
          </div>
        </div>
      </section>

      <section className={styles.finalCta} aria-labelledby="cta-title">
        <Image className={styles.finalImage} src={referenceIsland} alt="" fill sizes="100vw" /><div className={styles.finalShade} />
        <div className={styles.finalContent}>
          <p className={styles.sectionTag}>Pulau Anda menunggu</p><h2 id="cta-title">Kota seperti apa yang Anda tinggalkan?</h2>
          <p>Lima ronde. Satu kota. Semua pilihan ada di tangan Anda.</p><Link className={styles.primaryButton} href="/play">Mulai membangun</Link>
        </div>
      </section>

      <footer className={styles.footer}><Brand /><p>Simulator kebijakan iklim untuk INVOFEST 2026.</p><span>Bangun hari ini. Hidup dengan hasilnya.</span></footer>
    </main>
  );
}
