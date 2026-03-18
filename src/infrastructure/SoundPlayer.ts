export enum Sound {
  ActionGood = 'ActionGood',
  ActionNeutral = 'ActionNeutral',
  ActionNeutralReverse = 'ActionNeutralReverse',
  ActionBad = 'ActionBad',
  Mixer = 'Mixer',
  OpponentPlayed = 'OpponentPlayed',
  EndGood = 'EndGood',
  EndNeutral = 'EndNeutral',
  EndBad = 'EndBad',
}

type SoundDefinition = {
  frequency: number;
  duration: number;
  type: OscillatorType;
  gain: number;
  ramp?: number;
};

export default class SoundPlayer {
  private static readonly definitions: Record<Sound, ReadonlyArray<SoundDefinition>> = {
    [Sound.ActionGood]: [
      { frequency: 330, duration: 0.12, type: 'sine', gain: 0.1 },
      { frequency: 495, duration: 0.12, type: 'sine', gain: 0.15 },
    ],
    [Sound.ActionNeutral]: [{ frequency: 880, duration: 0.06, type: 'sine', gain: 0.15 }],
    [Sound.ActionNeutralReverse]: [{ frequency: 440, duration: 0.06, type: 'sine', gain: 0.1 }],
    [Sound.ActionBad]: [
      { frequency: 330, duration: 0.12, type: 'sine', gain: 0.1 },
      { frequency: 247, duration: 0.12, type: 'sine', gain: 0.15 },
    ],
    [Sound.Mixer]: [
      { frequency: 600, duration: 0.04, type: 'sine', gain: 0.1 },
      { frequency: 700, duration: 0.04, type: 'sine', gain: 0.1 },
      { frequency: 500, duration: 0.04, type: 'sine', gain: 0.1 },
      { frequency: 800, duration: 0.04, type: 'sine', gain: 0.1 },
    ],
    [Sound.OpponentPlayed]: [{ frequency: 660, duration: 0.1, type: 'triangle', gain: 0.12 }],
    [Sound.EndGood]: [
      { frequency: 523, duration: 0.15, type: 'sine', gain: 0.15 },
      { frequency: 659, duration: 0.15, type: 'sine', gain: 0.17 },
      { frequency: 784, duration: 0.15, type: 'sine', gain: 0.19 },
      { frequency: 1047, duration: 0.25, type: 'sine', gain: 0.2 },
    ],
    [Sound.EndNeutral]: [
      { frequency: 440, duration: 0.2, type: 'sine', gain: 0.12 },
      { frequency: 523, duration: 0.2, type: 'sine', gain: 0.14 },
      { frequency: 440, duration: 0.25, type: 'sine', gain: 0.1 },
    ],
    [Sound.EndBad]: [
      { frequency: 330, duration: 0.2, type: 'sine', gain: 0.15 },
      { frequency: 294, duration: 0.2, type: 'sine', gain: 0.17 },
      { frequency: 262, duration: 0.3, type: 'sine', gain: 0.19 },
    ],
  };

  private static readonly fadeOut = 0.03;

  private _context: AudioContext | null = null;
  private queueEnd: number = 0;

  private get context(): AudioContext {
    if (!this._context) this._context = new AudioContext();
    return this._context;
  }

  play(sound: Sound): void {
    const notes = SoundPlayer.definitions[sound];
    if (notes.length === 0) return;
    setTimeout(() => this.scheduleSound(notes), 0);
  }

  private scheduleSound(notes: ReadonlyArray<SoundDefinition>): void {
    try {
      const ctx = this.context;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime + 0.02;
      let time = Math.max(now, this.queueEnd);

      for (const note of notes) {
        const end = time + note.duration;
        this.scheduleNote(ctx, note, time, end);
        time = end;
      }

      this.queueEnd = time;
    } catch (e) {
      console.error('[SoundPlayer]', e);
    }
  }

  private scheduleNote(ctx: AudioContext, note: SoundDefinition, start: number, end: number): void {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = note.type;
    osc.frequency.value = note.frequency;

    gainNode.gain.setValueAtTime(note.gain, start);
    gainNode.gain.setValueAtTime(note.gain, end - SoundPlayer.fadeOut);
    gainNode.gain.linearRampToValueAtTime(0.001, end);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(start);
    osc.stop(end);
  }
}
