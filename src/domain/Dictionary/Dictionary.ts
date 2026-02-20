import DATA from './data.js';

type State = { id: number; isFinal: boolean; transitions: { [char: string]: State } };

class FstRootStateCreator {
  private nextId = 0;
  private unminimizedStates: Array<{ parent: State; char: string; child: State }> = [];
  private minimizedStateRegistry = new Map<string, State>();
  private previousWord = '';
  private root: State;

  constructor() {
    this.root = this.newState();
  }

  static create(wordsInAlphabeticalOrder: ReadonlyArray<string>): State {
    const creator = new FstRootStateCreator();
    for (const word of wordsInAlphabeticalOrder) creator.insert(word);
    creator.minimizeStates(0); // finish remaining unminimized states
    return creator.root;
  }

  private newState(): State {
    return { id: this.nextId++, isFinal: false, transitions: {} };
  }

  private insert(word: string): void {
    const prefix = this.getCommonPrefix(word, this.previousWord);
    this.minimizeStates(prefix);
    let state = prefix === 0 ? this.root : this.unminimizedStates[prefix - 1].child;
    for (const char of word.slice(prefix)) {
      const next = this.newState();
      state.transitions[char] = next;
      this.unminimizedStates.push({ parent: state, char, child: next });
      state = next;
    }
    state.isFinal = true;
    this.previousWord = word;
  }

  private getCommonPrefix(a: string, b: string): number {
    let i = 0;
    while (i < a.length && a[i] === b[i]) i++;
    return i;
  }

  private minimizeStates(downTo: number): void {
    for (let i = this.unminimizedStates.length - 1; i >= downTo; i--) {
      const { parent, char, child } = this.unminimizedStates[i];
      const key = this.createStateKey(child);
      const existing = this.minimizedStateRegistry.get(key);
      if (existing) {
        parent.transitions[char] = existing;
      } else {
        this.minimizedStateRegistry.set(key, child);
      }
      this.unminimizedStates.pop();
    }
  }

  private createStateKey(state: State): string {
    let key = state.isFinal ? '1|' : '0|';
    for (const char in state.transitions) {
      // char code + state id ensures deterministic unique key
      key += char.charCodeAt(0).toString(36) + ':' + state.transitions[char].id + ',';
    }
    return key;
  }
}

export class Dictionary {
  private constructor(private readonly rootState: State) {}

  static create(): Dictionary {
    const rootState = FstRootStateCreator.create(DATA);
    return new Dictionary(rootState);
  }

  hasWord(word: string): boolean {
    let state = this.rootState;
    for (const char of word) {
      const charState = state.transitions[char];
      if (!charState) return false;
      state = charState;
    }
    return state.isFinal;
  }

  hasWords(words: ReadonlyArray<string>): boolean {
    return words.every(word => this.hasWord(word));
  }
}
