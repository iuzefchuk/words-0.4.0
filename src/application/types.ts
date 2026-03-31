import { Clock, Scheduler, VersionProvider } from '@/application/ports.ts';
import { IdGenerator } from '@/domain/ports.ts';
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
import type { DictionaryRepository, GameRepository } from '@/domain/ports.ts';
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

export type {
  GameBoardView,
  GameCell,
  GameEvent,
  GameGeneratorResult,
  GameInventoryView,
  GameMatchView,
  GameSettings,
  GameTile,
  GameTurnsView,
};
export {
  GameBonus,
  GameBonusDistribution,
  GameDictionary,
  GameDifficulty,
  GameEventType,
  GameLetter,
  GameMatchResult,
  GamePlayer,
  GameTurnGenerator,
};

export type AppCommands = {
  changeBonusDistribution: (bonusDistribution: GameBonusDistribution) => void;
  changeDifficulty: (difficulty: GameDifficulty) => void;
  clearAllEvents: () => Array<GameEvent>;
  clearTiles: () => void;
  handlePassTurn: () => { opponentTurn?: Promise<AppTurnResponse> };
  handleResignMatch: () => void;
  handleSaveTurn: () => { opponentTurn?: Promise<AppTurnResponse>; userResponse: AppTurnResponse };
  placeTile: (args: { cell: GameCell; tile: GameTile }) => void;
  undoPlaceTile: (tile: GameTile) => void;
};

export type AppConfig = {
  boardCells: ReadonlyArray<GameCell>;
  boardCellsPerAxis: number;
};

export type AppDependencies = {
  clock: Clock;
  idGenerator: IdGenerator;
  repositories: {
    dictionary: DictionaryRepository;
    game: GameRepository;
  };
  scheduler: Scheduler;
  versionProvider: VersionProvider;
};

export type AppQueries = {
  areTilesSame: (firstTile: GameTile, secondTile: GameTile) => boolean;
  findCellWithTile: (tile: GameTile) => GameCell | undefined;
  findTileOnCell: (cell: GameCell) => GameTile | undefined;
  getBonusDistribution: () => GameBonusDistribution;
  getCellBonus: (cell: GameCell) => GameBonus | null;
  getCellColumnIndex: (cell: GameCell) => number;
  getCellRowIndex: (cell: GameCell) => number;
  getCurrentTurnScore: () => number | undefined;
  getCurrentTurnTopRightCell: () => GameCell | undefined;
  getDifficulty: () => GameDifficulty;
  getEventLog: () => ReadonlyArray<GameEvent>;
  getMatchResult: () => GameMatchResult | undefined;
  getOpponentScore: () => number;
  getTileLetter: (tile: GameTile) => GameLetter;
  getTilesRemaining: () => number;
  getUserScore: () => number;
  getUserTiles: () => ReadonlyArray<GameTile>;
  hasPriorTurns: () => boolean;
  isCellCenter: (cell: GameCell) => boolean;
  isCellTopRightInCurrentTurn: (cell: GameCell) => boolean;
  isCurrentPlayerUser: () => boolean;
  isCurrentTurnValid: () => boolean;
  isMatchFinished: () => boolean;
  isTilePlaced: (tile: GameTile) => boolean;
  settingsChangeIsAllowed: () => boolean;
  wasTileUsedInPreviousTurn: (tile: GameTile) => boolean;
  willUserPassBeResign: () => boolean;
};

export type AppTurnResponse = Result<{ words: ReadonlyArray<string> }, string>;
