import { MatchResult, Sound, Event } from '@/application/enums.ts';
import { DomainEvent } from '@/application/types.ts';

export const MATCH_RESULT_EVENTS: Partial<Record<MatchResult, Event>> = {
  [MatchResult.Win]: Event.GameWon,
  [MatchResult.Lose]: Event.GameLost,
  [MatchResult.Tie]: Event.GameTied,
};

export const DOMAIN_EVENT_SOUNDS: Partial<Record<DomainEvent, Sound>> = {
  [DomainEvent.TilePlaced]: Sound.ActionNeutral,
  [DomainEvent.TileUndoPlaced]: Sound.ActionNeutralReverse,
  [DomainEvent.TurnSaved]: Sound.ActionGood,
  [DomainEvent.TurnPassed]: Sound.ActionBad,
};

export const EVENT_SOUNDS: Partial<Record<Event, Sound>> = {
  [Event.TilesShuffled]: Sound.ActionMix,
  [Event.GameWon]: Sound.EndGood,
  [Event.GameTied]: Sound.EndNeutral,
  [Event.GameLost]: Sound.EndBad,
  [Event.OpponentTurnGenerated]: Sound.AltActionGood,
};
