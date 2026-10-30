import { AiAdvisor } from '@/components/ai-advisor.tsx';
import { GameProvider } from '@/lib/game-context.tsx';
import './game.css';

/**
 * /play dan /results berbagi satu provider, supaya state bertahan saat
 * berpindah di antara keduanya tanpa membaca ulang sessionStorage.
 *
 * Provider sengaja tidak dipasang di layout akar: landing page tidak
 * membutuhkannya, dan tidak perlu ikut memuat JavaScript-nya.
 */
export default function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <GameProvider>
      {children}
      <AiAdvisor />
    </GameProvider>
  );
}
