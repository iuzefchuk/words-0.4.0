import { TileId } from '../Inventory.js';
import DATA from './data.js';

type State = { id: number; isFinal: boolean; transitions: Map<TileId, State> };

export type FrozenState = {
  readonly id: number;
  readonly isFinal: boolean;
  readonly transitions: ReadonlyArray<readonly [TileId, FrozenState]>;
};

class DictionaryRootStateFactory {
  private result = this.createState();
  private nextId = 0;
  private unminimizedList: Array<{ parent: State; char: TileId; child: State }> = [];
  private minimizedMap = new Map<string, State>();
  private previousWord = '';

  create(sortedWords: ReadonlyArray<string>): State {
    for (const word of sortedWords) this.insertWordIntoResult(word);
    this.minimizeUnminimized({ downTo: 0 });
    return this.result;
  }

  private createState(): State {
    return { id: this.nextId++, isFinal: false, transitions: new Map() };
  }

  private insertWordIntoResult(word: string): void {
    let commonPrefix = 0;
    const minLength = Math.min(word.length, this.previousWord.length);
    while (commonPrefix < minLength && word[commonPrefix] === this.previousWord[commonPrefix]) commonPrefix++;
    this.minimizeUnminimized({ downTo: commonPrefix });
    let node = commonPrefix === 0 ? this.result : this.unminimizedList[commonPrefix - 1].child;
    for (let i = commonPrefix; i < word.length; i++) {
      const wordChar = word[i] as TileId;
      const newState = this.createState();
      node.transitions.set(wordChar, newState);
      this.unminimizedList.push({ parent: node, char: wordChar, child: newState });
      node = newState;
    }
    node.isFinal = true;
    this.previousWord = word;
  }

  private minimizeUnminimized({ downTo }: { downTo: number }): void {
    for (let i = this.unminimizedList.length - 1; i >= downTo; i--) {
      const { parent, char, child } = this.unminimizedList[i];
      const key = this.generateKeyFor(child);
      const existing = this.minimizedMap.get(key);
      if (existing) {
        parent.transitions.set(char, existing);
      } else {
        this.minimizedMap.set(key, child);
      }
      this.unminimizedList.pop();
    }
  }

  private generateKeyFor(state: State): string {
    let key = state.isFinal ? '1' : '0';
    for (const [char, child] of state.transitions) key += char + child.id;
    return key;
  }
}

export class Dictionary {
  private constructor(public readonly rootState: FrozenState) {}

  static create(): Dictionary {
    const rootState = new DictionaryRootStateFactory().create(DATA);
    const frozenRootState = this.freezeState(rootState);
    return new Dictionary(frozenRootState);
  }

  private static freezeState(state: State): FrozenState {
    const cache = new Map<number, FrozenState>();
    const dfs = (node: State): FrozenState => {
      const cached = cache.get(node.id);
      if (cached) return cached;
      const frozenTransitions: Array<readonly [TileId, FrozenState]> = [];
      const frozen: FrozenState = { id: node.id, isFinal: node.isFinal, transitions: frozenTransitions };
      cache.set(node.id, frozen);
      for (const [char, child] of node.transitions) frozenTransitions.push([char, dfs(child)]);
      return frozen;
    };
    return dfs(state);
  }

  hasWord(word: string): boolean {
    let state = this.rootState;
    for (let i = 0; i < word.length; i++) {
      const char = word[i] as TileId;
      let found: FrozenState | null = null;
      for (const [c, next] of state.transitions) {
        if (c === char) {
          found = next;
          break;
        }
      }
      if (!found) return false;
      state = found;
    }
    return state.isFinal;
  }

  hasWords(words: ReadonlyArray<string>): boolean {
    return words.every(word => this.hasWord(word));
  }
}
