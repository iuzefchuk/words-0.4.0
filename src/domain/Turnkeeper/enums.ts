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

export enum GenerationPhase {
  Explore = 'Explore',
  ValidateBounds = 'ValidateBounds',
  CalculateTarget = 'CalculateTarget',
  ResolveTarget = 'ResolveTarget',
  UndoResolveTarget = 'UndoResolveTarget',
}

export enum GenerationDirection {
  Left = -1,
  Right = 1,
}

export enum GenerationTransitionResultType {
  Continue = 'Continue',
  Success = 'Success',
  Fail = 'Fail',
}
