import { AiAdvisor } from '@/components/ai-advisor.tsx';
import { GameProvider } from '@/lib/game-context.tsx';
import './game.css';

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <GameProvider>
      {children}
      <AiAdvisor />
    </GameProvider>
  );
}
