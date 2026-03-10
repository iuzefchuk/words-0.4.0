export enum PlayerMove {
  StartedGame = 'StartedGame',
  PlayedBySave = 'PlayedBySave',
  PlayedByPass = 'PlayedByPass',
  Won = 'Won',
  Tied = 'Tied',
}

export enum ValidationStatus {
  Unvalidated = 'Unvalidated',
  Pending = 'Pending',
  Invalid = 'Invalid',
  Valid = 'Valid',
}

export enum ValidationErrors {
  InvalidTilePlacement = 'error_tile_1',
  InvalidCellPlacement = 'error_cell_2',
  NoCellsUsableAsFirst = 'error_cell_3',
  WordNotInDictionary = 'error_tile_4',
}

export enum GenerationDirection {
  Left = -1,
  Right = 1,
}

export enum GenerationTask {
  EvaluateTraversal = 'EvaluateTraversal',
  ValidateTraversal = 'ValidateTraversal',
  CalculateCandidate = 'CalculateCandidate',
  ResolveCandidate = 'ResolveCandidate',
  DoResolve = 'DoResolve',
  UndoResolve = 'UndoResolve',
}

export enum TaskCommandType {
  ContinueExecute = 'ContinueExecute',
  StopExecute = 'StopExecute',
  ReturnResult = 'ReturnResult',
}
