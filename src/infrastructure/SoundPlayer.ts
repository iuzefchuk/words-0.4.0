export enum Sound {
  TilePlaced = 'TilePlaced',
  TileReturned = 'TileReturned',
  TurnSaved = 'TurnSaved',
  TurnPassed = 'TurnPassed',
  TilesShuffled = 'TilesShuffled',
  GameFinished = 'GameFinished',
}

type SoundDefinition = {
  frequency: number;
  duration: number;
  type: OscillatorType;
  gain: number;
  ramp?: number;
};

export default class SoundPlayer {
  private static readonly soundDefinitions: Record<Sound, ReadonlyArray<SoundDefinition>> = {
    [Sound.TilePlaced]: [{ frequency: 880, duration: 0.06, type: 'sine', gain: 0.15 }],
    [Sound.TileReturned]: [{ frequency: 440, duration: 0.06, type: 'sine', gain: 0.1 }],
    [Sound.TurnSaved]: [
      { frequency: 330, duration: 0.12, type: 'sine', gain: 0.15 },
      { frequency: 330, duration: 0.12, type: 'sine', gain: 0.1 },
    ], // TODO change
    [Sound.TurnPassed]: [
      { frequency: 330, duration: 0.12, type: 'sine', gain: 0.1 },
      { frequency: 330, duration: 0.12, type: 'sine', gain: 0.15 },
    ],
    [Sound.TilesShuffled]: [
      { frequency: 600, duration: 0.04, type: 'sine', gain: 0.1 },
      { frequency: 700, duration: 0.04, type: 'sine', gain: 0.1 },
      { frequency: 500, duration: 0.04, type: 'sine', gain: 0.1 },
      { frequency: 800, duration: 0.04, type: 'sine', gain: 0.1 },
    ],
    [Sound.GameFinished]: [
      { frequency: 523, duration: 0.15, type: 'sine', gain: 0.2 },
      { frequency: 659, duration: 0.15, type: 'sine', gain: 0.2 },
      { frequency: 784, duration: 0.15, type: 'sine', gain: 0.2 },
      { frequency: 1047, duration: 0.3, type: 'sine', gain: 0.2 },
    ], //TODO add for losers
    // TODO generate pina colada on win ?
  };

  private _context: AudioContext | null = null;

  private get context(): AudioContext {
    if (!this._context) this._context = new AudioContext();
    return this._context;
  }

  play(sound: Sound): void {
    try {
      const notes = SoundPlayer.soundDefinitions[sound];
      let offset = 0;
      for (const note of notes) {
        this.scheduleNote(this.context, note, offset);
        offset += note.duration;
      }
    } catch {
      // silently fail - audio is best-effort
    }
  }

  private scheduleNote(context: AudioContext, note: SoundDefinition, offset: number): void {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    oscillator.type = note.type;
    oscillator.frequency.value = note.frequency;
    gainNode.gain.setValueAtTime(note.gain, context.currentTime + offset);
    gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + offset + note.duration);
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start(context.currentTime + offset);
    oscillator.stop(context.currentTime + offset + note.duration);
  }
}
