import { GameValidationError } from '@/domain/enums.ts';
import { GamePlacement, GameTile } from '@/domain/types/index.ts';

export default class WordsValidationService {
  static execute(
    placements: ReadonlyArray<GamePlacement>,
    getTileLetter: (tile: GameTile) => string,
    containsAllWords: (words: ReadonlyArray<string>) => boolean,
  ): GameValidationError | ReadonlyArray<string> {
    const words: Array<string> = [];
    for (let idx = 0; idx < placements.length; idx++) {
      const placement = placements[idx];
      if (placement === undefined) throw new ReferenceError(`expected placement at index ${String(idx)}, got undefined`);
      let word = '';
      for (const { tile } of placement) word += getTileLetter(tile);
      words[idx] = word;
    }
    return containsAllWords(words) ? words : GameValidationError.WordNotInDictionary;
  }
}
