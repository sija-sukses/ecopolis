export type AvatarId = 'bima' | 'deni' | 'rian' | 'lia' | 'maya' | 'siti';

export type Gender = 'pria' | 'wanita';

export type AvatarInfo = {
  id: AvatarId;
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

const LEGACY: Record<string, AvatarId> = { male: 'rian', female: 'lia' };

export function avatarOf(id: string): AvatarInfo {
  return BY_ID.get(id as AvatarId) ?? BY_ID.get(LEGACY[id] ?? DEFAULT_AVATAR)!;
}

export function honorificOf(id: string): 'Bapak' | 'Ibu' {
  return avatarOf(id).gender === 'wanita' ? 'Ibu' : 'Bapak';
}
