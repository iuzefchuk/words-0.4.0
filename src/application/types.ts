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
import type {
  DictionaryRepository,
  EventRepository,
  GameBoardView,
  GameCell,
  GameEvent,
  GameGeneratorResult,
  GameInventoryView,
  GameMatchView,
  GameSettings,
  GameTile,
  GameTurnsView,
  IdentityService,
  SeedingService,
} from '@/domain/types.ts';

export type { GameBoardView, GameCell, GameEvent, GameGeneratorResult, GameInventoryView, GameMatchView, GameSettings, GameTile, GameTurnsView };
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
  changeBoardType: (boardType: GameBonusDistribution) => void;
  changeDifficulty: (difficulty: GameDifficulty) => void;
  clearTiles: () => void;
  drainNewEvents: () => Array<GameEvent>;
  handlePassTurn: () => { opponentTurn: Promise<AppTurnResponse> | undefined };
  handleResignMatch: () => void;
  handleSaveTurn: () => { opponentTurn: Promise<AppTurnResponse> | undefined; userResponse: AppTurnResponse };
  placeTile: (args: { cell: GameCell; tile: GameTile }) => void;
  undoPlaceTile: (tile: GameTile) => void;
};

export type AppConfig = {
  boardCells: ReadonlyArray<GameCell>;
  boardCellsPerAxis: number;
};

export type AppDependencies = {
  repositories: {
    dictionary: DictionaryRepository;
    events: EventRepository;
  };
  services: {
    identity: IdentityService;
    scheduling: SchedulingService;
    seeding: SeedingService;
  };
};

export type AppQueries = {
  areTilesSame: (firstTile: GameTile, secondTile: GameTile) => boolean;
  findCellWithTile: (tile: GameTile) => GameCell | undefined;
  findTileOnCell: (cell: GameCell) => GameTile | undefined;
  getBoardType: () => GameBonusDistribution;
  getCellBonus: (cell: GameCell) => GameBonus | null;
  getCellColumnIndex: (cell: GameCell) => number;
  getCellRowIndex: (cell: GameCell) => number;
  getCurrentTurnScore: () => number | undefined;
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
  isCurrentPlayerUser: () => boolean;
  isCurrentTurnValid: () => boolean;
  isMatchFinished: () => boolean;
  isTilePlaced: (tile: GameTile) => boolean;
  settingsChangeIsAllowed: () => boolean;
  wasTileUsedInPreviousTurn: (tile: GameTile) => boolean;
  willUserPassBeResign: () => boolean;
};

export type AppTurnResponse = Result<{ words: ReadonlyArray<string> }, string>;

export type SchedulingService = {
  getCurrentTime(): number;
  wait(ms: number): Promise<void>;
  yield(): Promise<void>;
};
