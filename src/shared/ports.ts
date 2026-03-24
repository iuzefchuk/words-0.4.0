export type Clock = {
  now(): number;
  wait(ms: number): Promise<void>;
};

export type IdGenerator = {
  execute(): string;
};

export type TurnGenerationWorker<Player, Cell, Tile> = {
  execute(request: {
    domain: unknown;
    player: Player;
  }): Promise<{ tiles: ReadonlyArray<Tile>; cells: ReadonlyArray<Cell> } | null>;
  terminate(): void;
};
