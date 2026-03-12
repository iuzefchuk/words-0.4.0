export enum GenerationDirection {
  Left = -1,
  Right = 1,
}

export enum GenerationTask {
  EvaluateTraversal = 'EvaluateTraversal',
  ValidateTraversal = 'ValidateTraversal',
  CalculateCandidate = 'CalculateCandidate',
  ResolveCandidate = 'ResolveCandidate',
  ApplyResolution = 'ApplyResolution',
  ReverseResolution = 'ReverseResolution',
}

export enum GenerationCommandType {
  ContinueExecute = 'ContinueExecute',
  StopExecute = 'StopExecute',
  ReturnResult = 'ReturnResult',
}
