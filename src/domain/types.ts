export { Player as DomainPlayer, Letter as DomainLetter } from '@/domain/enums.ts';
export { CellIndex as DomainCell, Bonus as DomainBonus } from '@/domain/models/Board.ts';
export { TileId as DomainTile } from '@/domain/models/Inventory.ts';
export {
  TurnOutcome as DomainTurnOutcome,
  TurnOutcomeType as DomainTurnOutcomeType,
  ValidationStatus as DomainValidationStatus,
} from '@/domain/models/TurnTracker.ts';
// TODO
export { DomainEvent, DomainEventCollector } from '@/domain/events.ts';
export type { default as Domain } from '@/domain/index.ts';
export type { default as DomainDictionary } from '@/domain/models/Dictionary.ts';

export type DomainTurnResult = Result<{ words: ReadonlyArray<string> }, string>;
