import { Clock, Scheduler, VersionProvider } from '@/application/ports.ts';
import type { DictionaryRepository, GameRepository } from '@/domain/ports.ts';
import { IdGenerator } from '@/domain/ports.ts';
import type {
  GameBoardView,
  GameCell,
  GameEvent,
  GameGeneratorResult,
  GameInventoryView,
  GameMatchView,
  GameSettings,
  GameTile,
  GameTurnsView,
} from '@/domain/types.ts';
import {
  GameBonus,
  GameBonusDistribution,
  GameDictionary,
  GameDifficulty,
  GameEventType,
  GameLetter,
  GameMatchResult,
  GamePlayer,
  GameTurnGenerator,
} from '@/domain/types.ts';

export type {
  GameCell,
  GameBoardView,
  GameTile,
  GameInventoryView,
  GameEvent,
  GameMatchView,
  GameTurnsView,
  GameSettings,
  GameGeneratorResult,
};
export {
  GameBonus,
  GameEventType,
  GameDifficulty,
  GameLetter,
  GamePlayer,
  GameMatchResult,
  GameTurnGenerator,
  GameDictionary,
  GameBonusDistribution,
};

export type AppConfig = {
  boardCells: ReadonlyArray<GameCell>;
  boardCellsPerAxis: number;
};

export type AppQueries = {
  getBonusDistribution: () => GameBonusDistribution;
  getDifficulty: () => GameDifficulty;
  hasPriorTurns: () => boolean;
  getTilesRemaining: () => number;
  getUserTiles: () => ReadonlyArray<GameTile>;
  getUserScore: () => number;
  getOpponentScore: () => number;
  isCurrentPlayerUser: () => boolean;
  getCurrentTurnScore: () => number | undefined;
  isCurrentTurnValid: () => boolean;
  willUserPassBeResign: () => boolean;
  getEventLog: () => ReadonlyArray<GameEvent>;
  isMatchFinished: () => boolean;
  getMatchResult: () => GameMatchResult | undefined;
  areTilesSame: (firstTile: GameTile, secondTile: GameTile) => boolean;
  getTileLetter: (tile: GameTile) => GameLetter;
  isCellCenter: (cell: GameCell) => boolean;
  getCellBonus: (cell: GameCell) => GameBonus | null;
  getCellRowIndex: (cell: GameCell) => number;
  getCellColumnIndex: (cell: GameCell) => number;
  findTileOnCell: (cell: GameCell) => GameTile | undefined;
  findCellWithTile: (tile: GameTile) => GameCell | undefined;
  isTilePlaced: (tile: GameTile) => boolean;
  getCurrentTurnTopRightCell: () => GameCell | undefined;
  isCellTopRightInCurrentTurn: (cell: GameCell) => boolean;
  wasTileUsedInPreviousTurn: (tile: GameTile) => boolean;
};

export type AppCommands = {
  changeBonusDistribution: (bonusDistribution: GameBonusDistribution) => void;
  changeDifficulty: (difficulty: GameDifficulty) => void;
  placeTile: (args: { cell: GameCell; tile: GameTile }) => void;
  undoPlaceTile: (tile: GameTile) => void;
  clearTiles: () => void;
  handleSaveTurn: () => { userResponse: AppTurnResponse; opponentTurn?: Promise<AppTurnResponse> };
  handlePassTurn: () => { opponentTurn?: Promise<AppTurnResponse> };
  handleResignMatch: () => void;
  clearAllEvents: () => Array<GameEvent>;
};

export type AppDependencies = {
  idGenerator: IdGenerator;
  clock: Clock;
  scheduler: Scheduler;
  versionProvider: VersionProvider;
  repositories: {
    game: GameRepository;
    dictionary: DictionaryRepository;
  };
};

export type AppTurnResponse = Result<{ words: ReadonlyArray<string> }, string>;
