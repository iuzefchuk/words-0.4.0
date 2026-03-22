import { Domain, DomainTile } from '@/domain/types.ts';

export default class UndoPlaceTileCommand {
  static execute(domain: Domain, tile: DomainTile): void {
    domain.undoPlaceTile({ tile });
    domain.validateCurrentTurn();
  }
}
