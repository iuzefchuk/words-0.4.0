export enum MatchResult {
  Win = 'Win',
  Lose = 'Lose',
  Tie = 'Tie',
}

export enum Event {
  TilesShuffled = 'TilesShuffled',
  GameWon = 'GameWon',
  GameTied = 'GameTied',
  GameLost = 'GameLost',
  OpponentTurnGenerated = 'OpponentTurnGenerated',
}

export enum Sound {
  ActionGood = 'ActionGood',
  ActionNeutral = 'ActionNeutral',
  ActionNeutralReverse = 'ActionNeutralReverse',
  ActionBad = 'ActionBad',
  ActionMix = 'ActionMix',
  AltActionGood = 'AltActionGood',
  EndGood = 'EndGood',
  EndNeutral = 'EndNeutral',
  EndBad = 'EndBad',
}
