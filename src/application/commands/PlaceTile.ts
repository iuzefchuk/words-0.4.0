import { Domain, DomainCell, DomainTile } from '@/domain/types.ts';

export default class PlaceTileCommand {
  static execute(domain: Domain, { cell, tile }: { cell: DomainCell; tile: DomainTile }): void {
    domain.placeTile({ cell, tile });
    domain.validateCurrentTurn();
  }
}
