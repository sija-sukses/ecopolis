import Image from 'next/image';

import { CityMap } from '@/components/city-map.tsx';
import { TryRound } from '@/components/try-round.tsx';
import type { AssetId } from '@/lib/types.ts';

/** Kota contoh di hero: kelima petak sudah terbangun seimbang. */
/* Urutannya mengikuti PLOT_TILES: dua petak belakang, satu tengah, dua depan.
   Bangunan tertinggi ditaruh di belakang supaya tidak menutupi yang lain. */
const SHOWCASE: AssetId[] = ['apartemen', 'plts', 'hutan', 'brt', 'daurulang'];

/**
 * Lima materi iklim, satu per petak, masing-masing menyiapkan ronde yang
 * persoalannya sama. Belajar di sini adalah pengarahan, bukan jalan memutar.
 */
const LESSONS = [
  {
    verb: 'Nyalakan',
    title: 'Dari mana listriknya datang',
    body: 'Bauran listrik Indonesia masih bertumpu pada batu bara. PLTU murah dibangun dan cepat menyala, tapi setiap kilowatt menitipkan karbon yang baru ditagih puluhan tahun kemudian. Tenaga surya membalik urutannya: berat di awal, nyaris gratis sesudahnya.',
    round: 'Ronde 1',
    src: '/foto/paiton-java-indonesia-paiton-thermal-power-plant.jpg',
    alt: 'PLTU Paiton di Jawa Timur, dengan cerobong-cerobongnya mengepul di atas jalan raya.',
  },
  {
    verb: 'Gerakkan',
    title: 'Kenapa jalan baru jarang menolong',
    body: 'Menambah lajur jarang menyelesaikan kemacetan; ruang baru biasanya terisi kendaraan baru dalam hitungan tahun. Angkutan massal memindahkan jauh lebih banyak orang di ruang yang sama, tapi hanya berhasil kalau orang benar-benar mau berpindah ke dalamnya.',
    round: 'Ronde 2',
    src: '/foto/flyover-kuningan-transjakarta-brt-station-2023.jpg',
    alt: 'Halte Transjakarta Flyover Kuningan di tepi jalan, dengan pengendara motor melintas.',
  },
  {
    verb: 'Sisakan',
    title: 'Lahan kosong hanya dipakai sekali',
    body: 'Kawasan industri membawa pekerjaan, hutan kota membawa udara dan air resapan. Keduanya nyata, dan petak itu tidak akan pernah kembali kosong. Kebakaran lahan memperlihatkan harga keputusan yang keliru dalam skala yang tidak bisa ditutupi.',
    round: 'Ronde 3',
    src: '/foto/kalimantan-forest-fires.jpg',
    alt: 'Kebakaran lahan di Kalimantan terlihat dari udara pada malam hari, dengan asap tebal menutupi pepohonan.',
  },
  {
    verb: 'Olah',
    title: 'Sampah tidak pernah benar-benar hilang',
    body: 'Bantar Gebang adalah salah satu tempat pembuangan terbuka terbesar di Asia Tenggara, dan gunungnya bertambah tinggi setiap hari. Menumpuk selalu lebih murah hari ini. Memilah dan mengubahnya menjadi energi selalu lebih murah pada dekade berikutnya.',
    round: 'Ronde 4',
    src: '/foto/mountain-of-garbage-in-bantar-gebang-with.jpg',
    alt: 'Gunung sampah di Bantar Gebang dengan ekskavator dan para pemulung bekerja di lerengnya.',
  },
  {
    verb: 'Tampung',
    title: 'Ke mana satu juta warga baru tinggal',
    body: 'Kota yang tumbuh harus menaruh warganya di suatu tempat. Melebar memakan lahan resapan dan memindahkan air hujan ke jalan, halaman, dan taman bermain. Meninggi menghemat lahan, tapi menuntut warga mengubah cara mereka tinggal.',
    round: 'Ronde 5',
    src: '/foto/banjir-jakarta-perumahan-di-tanjung-duren-1.jpg',
    alt: 'Taman bermain di perumahan Tanjung Duren, Jakarta, terendam banjir sampai sebatas tiang ayunan.',
  },
];

const SCORED = [
  ['Ekonomi', 'Pendapatan daerah dan lapangan kerja yang tersedia bagi warga.'],
  ['Lingkungan', 'Kualitas udara, air, dan tutupan hijau yang masih tersisa.'],
  ['Kepuasan Warga', 'Seberapa jauh warga merasa kebijakan Anda berpihak pada mereka.'],
  ['Energi', 'Kecukupan pasokan listrik untuk rumah tangga dan industri.'],
  ['Laporan 2050', 'Narasi penutup yang dibangkitkan dari kombinasi pilihan Anda.'],
  ['Sertifikat', 'Rapor kepemimpinan yang bisa diunduh dan dibagikan.'],
];

export default function Home() {
  return (
    <>

      <header className="shell topbar">
        <a className="wordmark" href="#atas">
          Ecopolis
        </a>
        <nav aria-label="Bagian halaman">
          <a href="#pelajari">Pelajari</a>
          <a href="#coba">Coba</a>
          <a href="#dinilai">Yang dinilai</a>
        </nav>
      </header>

      <main id="atas">
        <section className="shell hero">
          <div className="hero__talk">
            <p className="hero__lead rise rise--1">
              Lima keputusan kebijakan iklim menentukan wujud sebuah kota di tahun 2050. Pelajari
              persoalannya dulu, lalu pimpin sendiri.
            </p>
            <a className="btn rise rise--2" href="/play">
              Mulai Simulasi
            </a>
          </div>

          <div className="hero__head">
            <h1 className="hero__title">
              <span className="mask">
                <span>Kota Anda</span>
              </span>
              <span className="mask">
                <span>2050</span>
              </span>
            </h1>

            <div className="hero__stage">
              <p className="hero__badge rise rise--3">
                <b>5</b>
                <span>keputusan menentukan wujud kota Anda di 2050.</span>
              </p>
              <CityMap
                className="hero__city"
                plots={SHOWCASE}
                animate
                label="Kota Ecopolis dengan lima petak terbangun: panel surya, halte bus listrik, hutan kota, pusat daur ulang, dan apartemen vertikal hijau."
              />
            </div>
          </div>
        </section>

        <section className="stair" aria-labelledby="harga">
          <div className="shell stair__grid">
            <div>
              <h2 id="harga" className="stair__head enter">
                Tidak ada yang gratis
              </h2>
              {/* Pernyataan, bukan judul: satu kalimat dipecah lima baris yang
                  menuruni tangga. Ukurannya ditahan di bawah 36px. */}
              <p className="stair__text enter enter--2">
                <b>Ekonomi naik,</b>
                <b>udara memburuk.</b>
                <b>Lingkungan pulih,</b>
                <b>pekerjaan menyusut.</b>
                <b>Setiap petak sekali pakai.</b>
              </p>
              <p className="stair__note enter enter--3">
                Simulasi ini memakai dilema yang benar-benar dihadapi kota-kota di Indonesia: bauran
                listrik, kemacetan, lahan kosong, sampah, dan urbanisasi.
              </p>
            </div>
            <div className="stair__pics enter enter--3">
              <Image
                src="/foto/banjir-jakarta-perumahan-di-tanjung-duren-1.jpg"
                alt="Perumahan di Tanjung Duren, Jakarta, terendam banjir pada Januari 2020."
                width={1920}
                height={2560}
                sizes="22vw"
              />
              <Image
                src="/foto/paiton-java-indonesia-paiton-thermal-power-plant.jpg"
                alt="Cerobong PLTU Paiton mengepul di atas pepohonan di Jawa Timur."
                width={1920}
                height={1920}
                sizes="22vw"
              />
            </div>
          </div>
        </section>

        <section id="pelajari" aria-labelledby="pelajari-judul">
          <div className="learn__open">
            <div className="shell">
              <h2 id="pelajari-judul" className="enter">
                Lima persoalan iklim
              </h2>
              <p className="enter enter--2">
                Tiap materi di bawah ini menyiapkan satu ronde dengan persoalan yang sama. Baca
                dulu, dan keputusan di dalam permainan akan terasa jauh lebih berat, karena memang
                begitu adanya.
              </p>
            </div>
          </div>

          {LESSONS.map((l, i) => (
            <article className={`panel${i % 2 ? ' panel--alt' : ''}`} key={l.verb}>
              <div className="panel__frame">
                <Image
                  className="panel__pic"
                  src={l.src}
                  alt={l.alt}
                  fill
                  sizes="(max-width: 900px) 100vw, 52vw"
                  priority={i === 0}
                />
              </div>
              <div className="panel__say">
                <h3 className="panel__verb">{l.verb}</h3>
                <p className="panel__title">{l.title}</p>
                <p className="panel__body">{l.body}</p>
                <span className="panel__round">{l.round}</span>
              </div>
            </article>
          ))}
        </section>

        <section id="coba" className="tryout">
          <div className="shell">
            <TryRound />
          </div>
        </section>

        <section id="dinilai" className="shell scored">
          {/* Judul bagian ini adalah baris pertama daftarnya sendiri, seperti
              yang diminta blueprint: tidak ada judul terpisah di atasnya. */}
          <div className="scored__row">
            <h2 className="scored__name">Yang dinilai</h2>
            <span className="scored__desc" />
          </div>
          {SCORED.map(([name, desc]) => (
            <div className="scored__row enter" key={name}>
              <span className="scored__name">{name}</span>
              <span className="scored__desc">{desc}</span>
            </div>
          ))}
        </section>

        <section className="close">
          <div className="shell close__inner">
            {/* Satu judul, dua barisnya didorong ke tepi atas dan bawah bidang,
                sehingga jeda di tengahnya terbaca sebagai tahan napas. */}
            <h2 className="close__q">
              <span>Siap</span>
              <span>Memimpin?</span>
            </h2>
            <div className="close__mid">
              <div className="close__row">
                <a className="btn" href="/play">
                  Mulai Simulasi
                </a>
                <span className="close__or">atau</span>
                <a className="btn btn--paper" href="#pelajari">
                  Pelajari dulu
                </a>
              </div>
              <p className="close__after">
                Lima ronde, sekitar tiga menit, lalu laporan kota Anda di 2050.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="foot">
        <div className="shell">
          <div className="foot__mark" aria-label="Ecopolis" role="img">
            {'ECOPOLIS'.split('').map((ch, i) => (
              <span key={i} aria-hidden="true" style={{ height: `${62 + ((i * 37) % 39)}%` }}>
                {ch}
              </span>
            ))}
          </div>

          <div className="foot__cols">
            <div className="foot__links">
              <a href="#pelajari">Pelajari</a>
              <a href="#coba">Coba satu keputusan</a>
              <a href="#dinilai">Yang dinilai</a>
              <a href="/play">Mulai simulasi</a>
            </div>
            <p className="foot__credit">
              Foto:{' '}
              <a href="https://commons.wikimedia.org/wiki/File:Paiton_Java_Indonesia_Paiton-thermal-power-plant-01.jpg">
                “Paiton Java Indonesia Paiton-thermal-power-plant-01”
              </a>{' '}
              oleh CEphoto, Uwe Aranas,{' '}
              <a href="https://creativecommons.org/licenses/by-sa/3.0">CC BY-SA 3.0</a>;{' '}
              <a href="https://commons.wikimedia.org/wiki/File:Flyover_Kuningan_Transjakarta_BRT_Station,_2023.jpg">
                “Flyover Kuningan Transjakarta BRT Station, 2023”
              </a>{' '}
              oleh Enperfectify World,{' '}
              <a href="https://creativecommons.org/licenses/by/4.0">CC BY 4.0</a>;{' '}
              <a href="https://commons.wikimedia.org/wiki/File:Kalimantan_Forest_Fires.jpg">
                “Kalimantan Forest Fires”
              </a>{' '}
              oleh MWul, <a href="https://creativecommons.org/licenses/by/4.0">CC BY 4.0</a>;{' '}
              <a href="https://commons.wikimedia.org/wiki/File:Mountain_of_garbage_in_Bantar_Gebang_with_some_excavator.jpg">
                “Mountain of garbage in Bantar Gebang with some excavator”
              </a>{' '}
              oleh 22Kartika,{' '}
              <a href="https://creativecommons.org/licenses/by-sa/3.0">CC BY-SA 3.0</a>;{' '}
              <a href="https://commons.wikimedia.org/wiki/File:Banjir_Jakarta_Perumahan_di_Tanjung_Duren_1_Januari_2020.jpg">
                “Banjir Jakarta Perumahan di Tanjung Duren 1 Januari 2020”
              </a>{' '}
              oleh Cun Cun,{' '}
              <a href="https://creativecommons.org/licenses/by-sa/4.0">CC BY-SA 4.0</a>. Seluruhnya
              via Wikimedia Commons.
            </p>
          </div>

          <div className="foot__last">
            <span>Ecopolis, simulator kebijakan iklim untuk INVOFEST 2026.</span>
            <a className="btn btn--ink" href="/play">
              Mulai
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
