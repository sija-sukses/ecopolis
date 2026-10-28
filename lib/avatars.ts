/**
 * Katalog avatar.
 *
 * Data murni dan terpisah dari gambarnya (ada di components/avatars.tsx),
 * supaya fallback.ts dan server action tetap bisa membacanya tanpa menyentuh
 * JSX, dan tes `node --test` tetap jalan.
 */

export type AvatarId = 'bima' | 'deni' | 'rian' | 'lia' | 'maya' | 'siti';

export type Gender = 'pria' | 'wanita';

export type AvatarInfo = {
  id: AvatarId;
  /** Nama karakternya, seperti pada berkas di folder avatar. */
  label: string;
  gender: Gender;
};

export const AVATARS: AvatarInfo[] = [
  { id: 'rian', label: 'Rian', gender: 'pria' },
  { id: 'bima', label: 'Bima', gender: 'pria' },
  { id: 'deni', label: 'Deni', gender: 'pria' },
  { id: 'lia', label: 'Lia', gender: 'wanita' },
  { id: 'maya', label: 'Maya', gender: 'wanita' },
  { id: 'siti', label: 'Siti', gender: 'wanita' },
];

export const DEFAULT_AVATAR: AvatarId = 'rian';

const BY_ID = new Map(AVATARS.map((a) => [a.id, a]));

/**
 * Pencarian yang aman untuk nilai apa pun.
 *
 * State lama di sessionStorage masih menyimpan 'male' / 'female', dan isinya
 * datang dari luar program, jadi nilai yang tidak dikenal jatuh ke avatar
 * bawaan alih-alih membuat halaman gagal render.
 */
const LEGACY: Record<string, AvatarId> = { male: 'rian', female: 'lia' };

export function avatarOf(id: string): AvatarInfo {
  return BY_ID.get(id as AvatarId) ?? BY_ID.get(LEGACY[id] ?? DEFAULT_AVATAR)!;
}

export function honorificOf(id: string): 'Bapak' | 'Ibu' {
  return avatarOf(id).gender === 'wanita' ? 'Ibu' : 'Bapak';
}
