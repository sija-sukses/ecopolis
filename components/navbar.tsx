'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import styles from './navbar.module.css';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function handleScroll() {
      const isPastThreshold = window.scrollY > 24;
      setScrolled(isPastThreshold);
    }

    // Check immediately on mount
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile drawer on resize or Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileOpen(false);
    }
    function handleResize() {
      if (window.innerWidth > 900) setMobileOpen(false);
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className={`${styles.headerWrapper} ${scrolled ? styles.scrolled : ''}`}>
      <header
        className={`${styles.navBar} ${scrolled ? styles.morphed : ''}`}
        role="banner"
        aria-label="Navigasi Ecopolis"
      >
        <Link
          className={styles.brand}
          href="#atas"
          aria-label="Ecopolis, kembali ke atas"
          onClick={closeMobile}
        >
          <span className={styles.brandMark} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>
            Eco<b>polis</b>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className={styles.navLinks} aria-label="Navigasi utama">
          <a className={styles.navLink} href="#tentang">
            Tentang
          </a>
          <a className={styles.navLink} href="#dilema">
            Lima dilema
          </a>
          <a className={styles.navLink} href="#coba">
            Coba
          </a>
        </nav>

        {/* Desktop CTA Button */}
        <Link className={styles.navCta} href="/play">
          Main sekarang
        </Link>

        {/* Mobile Toggle Button */}
        <button
          type="button"
          className={styles.mobileToggle}
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? 'Tutup navigasi' : 'Buka navigasi'}
        >
          <div
            className={`${styles.burgerIcon} ${mobileOpen ? styles.burgerOpen : ''}`}
            aria-hidden="true"
          >
            <span />
            <span />
            <span />
          </div>
        </button>

        {/* Mobile Dropdown Drawer */}
        {mobileOpen && (
          <div className={styles.mobileDrawer} role="dialog" aria-label="Menu navigasi mobile">
            <a className={styles.navLink} href="#tentang" onClick={closeMobile}>
              Tentang Ecopolis
            </a>
            <a className={styles.navLink} href="#dilema" onClick={closeMobile}>
              Lima Dilema Kebijakan
            </a>
            <a className={styles.navLink} href="#coba" onClick={closeMobile}>
              Coba Ronde Simulasi
            </a>
            <Link className={styles.mobileCta} href="/play" onClick={closeMobile}>
              Mulai Simulasi Sekarang
            </Link>
          </div>
        )}
      </header>
    </div>
  );
}

