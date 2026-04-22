import { GameDifficulty, GameMatchType, GameSettings } from '@/application/types/index.ts';

export const DEFAULT_SETTINGS: GameSettings = {
  difficulty: GameDifficulty.Low,
  matchType: GameMatchType.Classic,
};
