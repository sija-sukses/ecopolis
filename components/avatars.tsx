import { avatarOf } from '@/lib/avatars.ts';

type Props = {
  id: string;
  size?: number;
  className?: string;
};

export function Avatar({ id, size = 64, className }: Props) {
  const info = avatarOf(id);
  return (
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
