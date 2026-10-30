import {
  Building2,
  Bus,
  Car,
  Factory,
  Flame,
  Home,
  Recycle,
  Sun,
  Trash2,
  Trees,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { AssetId } from '@/lib/types.ts';

const POLICY_ICONS: Record<AssetId, LucideIcon> = {
  pltu: Flame,
  plts: Sun,
  tol: Car,
  brt: Bus,
  industri: Factory,
  hutan: Trees,
  tpa: Trash2,
  daurulang: Recycle,
  perumahan: Home,
  apartemen: Building2,
};

export function PolicyIcon({ asset }: { asset: AssetId }) {
  const Icon = POLICY_ICONS[asset];
  return (
    <span className={`opt__icon opt__icon--${asset}`} aria-hidden="true">
      <Icon size={20} strokeWidth={2.4} />
    </span>
  );
}
