export { EventType as GameEventType } from '@/domain/events/enums.ts';

export { Axis as GameAxis, Type as GameBoardType, Bonus as GameBonus } from '@/domain/models/board/enums.ts';

export {
  Difficulty as GameMatchDifficulty,
  Result as GameMatchResult,
  Type as GameMatchType,
} from '@/domain/models/match/enums.ts';

export { ValidationError as GameValidationError, ValidationStatus as GameValidationStatus } from '@/domain/models/turns/enums.ts';

export enum GameLetter {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  E = 'E',
  F = 'F',
  G = 'G',
  H = 'H',
  I = 'I',
  J = 'J',
  K = 'K',
  L = 'L',
  M = 'M',
  N = 'N',
  O = 'O',
  P = 'P',
  Q = 'Q',
  R = 'R',
  S = 'S',
  T = 'T',
  U = 'U',
  V = 'V',
  W = 'W',
  X = 'X',
  Y = 'Y',
  Z = 'Z',
}

export enum GamePlayer {
  Opponent = 'Opponent',
  User = 'User',
}
