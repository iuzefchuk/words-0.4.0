import { GameBonusDistribution, GameDifficulty, GameSettings } from '@/application/types.ts';

export const DEFAULT_SETTINGS: GameSettings = {
  boardType: GameBonusDistribution.Classic,
  difficulty: GameDifficulty.Low,
};
