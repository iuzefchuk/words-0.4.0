import { GameBonusDistribution, GameDifficulty, GameEventType, GameSettings } from '@/application/types.ts';
import { Sound } from '@/gui/services/SoundPlayer.ts';

export const GAME_EVENT_SOUNDS: Partial<Record<GameEventType, Sound>> = {
  [GameEventType.MatchLost]: Sound.GameLongBad,
  [GameEventType.MatchTied]: Sound.GameLongNeutral,
  [GameEventType.MatchWon]: Sound.GameLongGood,
  [GameEventType.OpponentTurnPassed]: Sound.GameShortAltBad,
  [GameEventType.OpponentTurnSaved]: Sound.GameShortAltGood,
  [GameEventType.TilePlaced]: Sound.GameShortNeutral,
  [GameEventType.TileUndoPlaced]: Sound.GameShortNeutralReverse,
  [GameEventType.UserTurnPassed]: Sound.GameShortBad,
  [GameEventType.UserTurnSaved]: Sound.GameShortGood,
};

export const DEFAULT_SETTINGS: GameSettings = {
  bonusDistribution: GameBonusDistribution.Classic,
  difficulty: GameDifficulty.Low,
};

export const SETTINGS_STORAGE_KEY = 'settings';
