import { Difficulty, Player } from '@/domain/enums.ts';
import { BoardType } from '@/domain/models/board/enums.ts';
import { Cell } from '@/domain/models/board/types.ts';
import { EventType } from '@/domain/models/events/enums.ts';
import { Tile } from '@/domain/models/inventory/types.ts';
import { ValidationResult } from '@/domain/models/turns/types.ts';
import { GameSettings } from '@/domain/types/index.ts';

export type Event =
  | { boardType: BoardType; seed: number; type: EventType.BoardTypeChanged }
  | { cell: Cell; tile: Tile; type: EventType.TilePlaced }
  | { cell: Cell; tile: Tile; type: EventType.TileUndoPlaced }
  | { difficulty: Difficulty; type: EventType.DifficultyChanged }
  | { player: Player; score: number; type: EventType.TurnSaved; words: ReadonlyArray<string> }
  | { player: Player; type: EventType.TurnPassed }
  | { result: ValidationResult; type: EventType.TurnValidated }
  | { seed: number; settings: GameSettings; type: EventType.MatchStarted }
  | { type: EventType.MatchFinished; winner: null | Player };
