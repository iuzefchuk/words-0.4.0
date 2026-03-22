export { Player as DomainPlayer, Letter as DomainLetter } from '@/domain/enums.ts';
export type { CellIndex as DomainCell } from '@/domain/models/Board.ts';
export { Bonus as DomainBonus } from '@/domain/models/Board.ts';
export type { TileId as DomainTile } from '@/domain/models/Inventory.ts';
export type { TurnOutcome as DomainTurnOutcome } from '@/domain/models/TurnTracker.ts';
export {
  TurnOutcomeType as DomainTurnOutcomeType,
  ValidationStatus as DomainValidationStatus,
} from '@/domain/models/TurnTracker.ts';
export { DomainEvent, DomainEventCollector } from '@/domain/events.ts';
export type { default as Domain } from '@/domain/index.ts';
export type { default as DomainDictionary } from '@/domain/models/Dictionary.ts';

export type DomainTurnResult = Result<{ words: ReadonlyArray<string> }, string>;
