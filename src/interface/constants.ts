import { GameBoardType, GameDifficulty, GameSettings } from '@/application/types/index.ts';

export const DEFAULT_SETTINGS: GameSettings = {
  boardType: GameBoardType.Classic,
  difficulty: GameDifficulty.Low,
};
