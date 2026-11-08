import Link from 'next/link';

import { CityMap } from '@/components/city-map.tsx';
import { Building } from '@/components/iso.tsx';
import {
  Reveal,
  StaggerGroup,
  StaggerItem,
  ViewportPause,
} from '@/components/motion/reveal.tsx';
import { Navbar } from '@/components/navbar.tsx';
import { TryRound } from '@/components/try-round.tsx';
import { SCENARIOS } from '@/lib/scenarios.ts';
import type { AssetId, StatKey, Stats } from '@/lib/types.ts';
import styles from './page.module.css';

/**
 * Kota contoh di landing page: jalur paling hijau, kelima kawasan terbangun.
 *
 * Dipakai peta hidup yang sama persis dengan yang ada di `/play`, bukan gambar
 * diam, supaya sungainya mengalir, pekerjanya bergerak, dan Walikota berdiri
 * di Balai Kota seperti di dalam permainannya.
 */
const SHOWCASE: AssetId[] = ['plts', 'brt', 'hutan', 'daurulang', 'apartemen'];

const DILEMMAS = [
  ['Energi', 'Batu bara atau matahari?', 'Jaga listrik tetap menyala tanpa mewariskan langit yang gelap.'],
  ['Mobilitas', 'Jalan baru atau angkutan massal?', 'Pindahkan lebih banyak warga dengan ruang kota yang sama.'],
  ['Lahan', 'Industri atau hutan kota?', 'Setiap petak hanya dapat dipilih sekali dan dampaknya menetap.'],
  ['Sampah', 'Tumpuk atau olah kembali?', 'Pilihan termurah hari ini dapat menjadi tagihan terbesar besok.'],
  ['Hunian', 'Melebar atau meninggi?', 'Tampung warga baru tanpa menelan seluruh daerah resapan.'],
];

const STAT_SHORT: { key: StatKey; label: string }[] = [
  { key: 'economy', label: 'Ekonomi' },
  { key: 'environment', label: 'Lingkungan' },
  { key: 'satisfaction', label: 'Kepuasan' },
  { key: 'energy', label: 'Energi' },
];

function PlotMiniature({ asset }: { asset: AssetId }) {
  return (
    <svg
      className={styles.miniSvg}
      viewBox="-72 -92 144 134"
      aria-hidden="true"
    >
      <polygon points="0,-32 64,0 0,32 -64,0" fill="#9be28b" />
      <polygon points="-64,0 0,32 0,46 -64,14" fill="#d68549" />
      <polygon points="64,0 0,32 0,46 64,14" fill="#b86835" />
      <g transform="translate(0 -4) scale(0.84)">
        <Building id={asset} />
      </g>
    </svg>
  );
}

function EffectChips({ effects }: { effects: Partial<Stats> }) {
  return (
    <span className={styles.effectRow}>
      {STAT_SHORT.map(({ key, label }) => {
        const val = effects[key];
        if (!val) return null;
        const up = val > 0;
        return (
          <b
            key={key}
            className={up ? styles.chipUp : styles.chipDown}
          >
            {label} {up ? `+${val}` : val}
          </b>
        );
      })}
    </span>
  );
}

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
      <Navbar />
      <section className={styles.hero} aria-labelledby="hero-title">
        <ViewportPause className={styles.cityStage}>
          <CityMap
            className={styles.heroCity}
            plots={SHOWCASE}
            avatar="rian"
            animate
            fill
            label="Pulau kota Ecopolis bergaya isometrik: balai kota, panel surya, halte bus listrik, hutan kota, pusat daur ulang, apartemen hijau, dan sungai yang mengalir."
          />
        </ViewportPause>
        <div className={styles.heroWash} />
        <div className={styles.headerSpacer} aria-hidden="true" />

        <StaggerGroup className={styles.heroCopy} staggerMs={55}>
          <StaggerItem as="p" variant="slide-up" duration={460} className={styles.kicker}>
            Simulator kebijakan iklim Indonesia
          </StaggerItem>
          <StaggerItem as="h1" variant="slide-up" duration={460} id="hero-title">
            Bangun kota. Tentukan masa depannya.
          </StaggerItem>
          <StaggerItem as="p" variant="slide-up" duration={460} className={styles.heroLead}>
            Lima keputusan hari ini akan mengubah ekonomi, lingkungan, energi, dan hidup warga Ecopolis pada tahun 2050.
          </StaggerItem>
          <StaggerItem variant="slide-up" duration={460} className={styles.heroActions}>
            <Link className={styles.primaryButton} href="/play">Mulai simulasi</Link>
            <a className={styles.textLink} href="#tentang">Jelajahi kotanya</a>
          </StaggerItem>
        </StaggerGroup>

        <Reveal
          variant="scale-up"
          delay={180}
          className={styles.heroHud}
          aria-label="Ringkasan permainan"
        >
          <span><b>5</b> keputusan</span><span><b>3</b> menit bermain</span><span><b>2050</b> laporan kota</span>
        </Reveal>
      </section>

      <section className={styles.intro} id="tentang" aria-labelledby="intro-title">
        <FloatingIsland className={styles.islandOne} /><FloatingIsland className={styles.islandTwo} />
        <div className={styles.cloudOne} aria-hidden="true" /><div className={styles.cloudTwo} aria-hidden="true" />
        <div className={styles.sectionInner}>
          <Reveal as="p" variant="fade-in" duration={360} className={styles.sectionTag}>
            Selamat datang, Wali Kota
          </Reveal>
          <Reveal as="h2" variant="slide-up" duration={480} id="intro-title">
            Kota hijau tidak lahir dari pilihan yang mudah.
          </Reveal>
          <StaggerGroup className={styles.introGrid} staggerMs={60}>
            <StaggerItem as="p" variant="slide-up" duration={480}>
              Setiap proyek membantu satu sisi kota dan menekan sisi lainnya. Naikkan ekonomi, emisi bisa ikut naik. Lindungi alam, lapangan kerja bisa berkurang.
            </StaggerItem>
            <StaggerItem as="p" variant="slide-up" duration={480}>
              Tidak ada jawaban sempurna. Ada kota yang harus Anda pertanggungjawabkan kepada warganya.
            </StaggerItem>
          </StaggerGroup>
        </div>
      </section>

      <section className={styles.dilemmas} id="dilema" aria-labelledby="dilema-title">
        <svg
          className={styles.terrainWave}
          viewBox="0 0 1440 96"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0,64 C240,12 480,88 720,44 C960,0 1200,72 1440,28 L1440,96 L0,96 Z"
            fill="#5bc449"
            opacity="0.55"
          />
          <path
            d="M0,78 C310,28 590,94 920,48 C1150,16 1320,62 1440,42 L1440,96 L0,96 Z"
            fill="#75d95d"
          />
        </svg>
        <div className={styles.sectionInner}>
          <Reveal variant="slide-up" duration={460} className={styles.sectionHeading}>
            <div>
              <p className={styles.sectionTag}>Peta keputusan</p>
              <h2 id="dilema-title">Lima petak. Lima konsekuensi.</h2>
            </div>
            <p>Isi satu petak setiap ronde. Lihat kota tumbuh, indikator bergerak, dan masa depan berubah langsung di depan Anda.</p>
          </Reveal>
          <div className={styles.dilemmaList}>
            {DILEMMAS.map(([name, question, copy], index) => {
              const scenario = SCENARIOS[index];
              const [optA, optB] = scenario.options;
              const flip = index % 2 === 1;
              return (
                <article
                  className={`${styles.dilemma}${flip ? ` ${styles.dilemmaFlip}` : ''}`}
                  key={name}
                >
                  <Reveal
                    variant={flip ? 'slide-right' : 'slide-left'}
                    amount={0.16}
                    className={styles.dilemmaHead}
                  >
                    <div className={styles.dilemmaMeta}>
                      <span className={styles.dilemmaNum}>
                        PETAK {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className={styles.dilemmaSector}>{name}</span>
                    </div>
                    <h3>{question}</h3>
                    <p>{copy}</p>
                  </Reveal>

                  <StaggerGroup
                    className={styles.dilemmaDuel}
                    staggerMs={55}
                    amount={0.16}
                  >
                    <StaggerItem
                      variant="scale-up"
                      className={`${styles.duelCard} ${styles.duelCardA}`}
                    >
                      <div className={styles.duelVisual}>
                        <span className={styles.duelBadge}>Opsi A</span>
                        <PlotMiniature asset={optA.asset} />
                      </div>
                      <div className={styles.duelInfo}>
                        <h4>{optA.label}</h4>
                        <p>{optA.blurb}</p>
                        <EffectChips effects={optA.effects} />
                      </div>
                    </StaggerItem>

                    <StaggerItem
                      as="span"
                      variant="scale-up"
                      className={styles.vsBadge}
                      aria-hidden="true"
                    >
                      VS
                    </StaggerItem>

                    <StaggerItem
                      variant="scale-up"
                      className={`${styles.duelCard} ${styles.duelCardB}`}
                    >
                      <div className={styles.duelVisual}>
                        <span className={styles.duelBadge}>Opsi B</span>
                        <PlotMiniature asset={optB.asset} />
                      </div>
                      <div className={styles.duelInfo}>
                        <h4>{optB.label}</h4>
                        <p>{optB.blurb}</p>
                        <EffectChips effects={optB.effects} />
                      </div>
                    </StaggerItem>
                  </StaggerGroup>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className={styles.playground} id="coba" aria-label="Coba satu keputusan Ecopolis">
        <FloatingIsland className={styles.islandThree} />
        <div className={styles.sectionInner}>
          <Reveal as="p" variant="fade-in" duration={360} className={styles.sectionTag}>
            Ronde percobaan
          </Reveal>
          <TryRound />
        </div>
      </section>

      <section className={styles.how} aria-labelledby="how-title">
        <div className={styles.sectionInner}>
          <Reveal as="p" variant="fade-in" duration={360} className={styles.sectionTag}>
            Cara bermain
          </Reveal>
          <Reveal as="h2" variant="slide-up" duration={450} id="how-title">
            Tiga langkah menuju 2050.
          </Reveal>
          <StaggerGroup className={styles.steps} staggerMs={60}>
            <StaggerItem as="article" variant="slide-up" duration={480}>
              <span>01</span>
              <h3>Baca dilemanya</h3>
              <p>Pahami masalah nyata yang dihadapi kota-kota Indonesia.</p>
            </StaggerItem>
            <StaggerItem as="article" variant="slide-up" duration={480}>
              <span>02</span>
              <h3>Pilih kebijakan</h3>
              <p>Bangun satu proyek dan saksikan pulau Anda berubah.</p>
            </StaggerItem>
            <StaggerItem as="article" variant="slide-up" duration={480}>
              <span>03</span>
              <h3>Terima laporannya</h3>
              <p>Lihat warisan kota Anda dalam laporan tahun 2050.</p>
            </StaggerItem>
          </StaggerGroup>
        </div>
      </section>

      <section className={styles.finalCta} aria-labelledby="cta-title">
        <ViewportPause className={styles.cityStage}>
          <CityMap
            className={styles.finalCity}
            plots={SHOWCASE}
            avatar="rian"
            animate
            fill
            label=""
          />
        </ViewportPause>
        <div className={styles.finalShade} />
        <div className={styles.finalContent}>
          <Reveal as="p" variant="fade-in" duration={360} className={styles.sectionTag}>
            Pulau Anda menunggu
          </Reveal>
          <Reveal as="h2" variant="blur-in" duration={500} id="cta-title">
            Kota seperti apa yang Anda tinggalkan?
          </Reveal>
          <Reveal as="p" variant="slide-up" duration={460} delay={60}>
            Lima ronde. Satu kota. Semua pilihan ada di tangan Anda.
          </Reveal>
          <Reveal variant="scale-up" delay={120}>
            <Link className={styles.primaryButton} href="/play">Mulai membangun</Link>
          </Reveal>
        </div>
      </section>

      <Reveal as="footer" variant="fade-in" duration={380} className={styles.footer}>
        <Brand />
        <p>Simulator kebijakan iklim untuk INVOFEST 2026.</p>
        <span>Bangun hari ini. Hidup dengan hasilnya.</span>
      </Reveal>
    </main>
  );
}
