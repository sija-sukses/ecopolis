import { avatarOf } from '@/lib/avatars.ts';

/**
 * Avatar pemimpin.
 *
 * Gambarnya adalah berkas SVG milik proyek apa adanya, disalin dari folder
 * `avatar` ke `public/avatar` tanpa satu warna pun diubah. Komponen ini hanya
 * memasangnya dan memberi kait untuk animasi; semua gerak dikerjakan CSS.
 */

type Props = {
  id: string;
  size?: number;
  className?: string;
};

export function Avatar({ id, size = 64, className }: Props) {
  const info = avatarOf(id);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- SVG piksel, tidak perlu dioptimasi next/image
    <img
      className={`avatar${className ? ` ${className}` : ''}`}
      src={`/avatar/${info.id}.svg`}
      width={size}
      height={size}
      alt={`Avatar ${info.label}`}
      draggable={false}
    />
  );
}
