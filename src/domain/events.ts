export enum DomainEvent {
  TilePlaced = 'TilePlaced',
  TileUndoPlaced = 'TileUndoPlaced',
  TurnSaved = 'TurnSaved',
  TurnPassed = 'TurnPassed',
  TilesShuffled = 'TilesShuffled',
  GameWon = 'GameWon',
  GameTied = 'GameTied',
  GameLost = 'GameLost',
  OpponentTurnGenerated = 'OpponentTurnGenerated',
}

export class EventCollector {
  private events: Array<DomainEvent> = [];

  raise(event: DomainEvent): void {
    this.events.push(event);
  }

  drain(): Array<DomainEvent> {
    const copy = [...this.events];
    this.events.length = 0;
    return copy;
  }
}
