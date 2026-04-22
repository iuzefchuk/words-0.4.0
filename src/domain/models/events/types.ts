import { Player } from '@/domain/enums.ts';
import { Cell } from '@/domain/models/board/types.ts';
import { EventType } from '@/domain/models/events/enums.ts';
import { Tile } from '@/domain/models/inventory/types.ts';
import { Difficulty, MatchType } from '@/domain/models/match/enums.ts';
import { MatchSettings } from '@/domain/models/match/types.ts';
import { ValidationResult } from '@/domain/models/turns/types.ts';

export type Event =
  | { cell: Cell; tile: Tile; type: EventType.TilePlaced }
  | { cell: Cell; tile: Tile; type: EventType.TileUndoPlaced }
  | { difficulty: Difficulty; type: EventType.DifficultyChanged }
  | { matchType: MatchType; seed: number; type: EventType.MatchTypeChanged }
  | { player: Player; score: number; type: EventType.TurnSaved; words: ReadonlyArray<string> }
  | { player: Player; type: EventType.TurnPassed }
  | { result: ValidationResult; type: EventType.TurnValidated }
  | { seed: number; settings: MatchSettings; type: EventType.MatchStarted }
  | { type: EventType.MatchFinished; winner: null | Player };
