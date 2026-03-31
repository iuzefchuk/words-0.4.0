import { GameBonusDistribution, GameEventType, GameDifficulty, GameSettings } from '@/application/types.ts';
import { Sound } from '@/gui/services/SoundPlayer.ts';

export const GAME_EVENT_SOUNDS: Partial<Record<GameEventType, Sound>> = {
  [GameEventType.TilePlaced]: Sound.GameShortNeutral,
  [GameEventType.TileUndoPlaced]: Sound.GameShortNeutralReverse,
  [GameEventType.UserTurnSaved]: Sound.GameShortGood,
  [GameEventType.UserTurnPassed]: Sound.GameShortBad,
  [GameEventType.OpponentTurnSaved]: Sound.GameShortAltGood,
  [GameEventType.OpponentTurnPassed]: Sound.GameShortAltBad,
  [GameEventType.MatchWon]: Sound.GameLongGood,
  [GameEventType.MatchTied]: Sound.GameLongNeutral,
  [GameEventType.MatchLost]: Sound.GameLongBad,
};

export const DEFAULT_SETTINGS: GameSettings = {
  bonusDistribution: GameBonusDistribution.Classic,
  difficulty: GameDifficulty.Low,
};
