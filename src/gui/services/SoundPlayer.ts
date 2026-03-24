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

type SoundDefinition = {
  frequency: number;
  duration: number;
  type: OscillatorType;
  gain: number;
  ramp?: number;
};

export default class SoundPlayer {
  private static readonly DEFINITIONS: Record<Sound, ReadonlyArray<SoundDefinition>> = {
    [Sound.ActionGood]: [
      { frequency: 523, duration: 0.08, type: 'sine', gain: 0.12 },
      { frequency: 659, duration: 0.1, type: 'sine', gain: 0.15 },
    ],
    [Sound.ActionNeutral]: [{ frequency: 440, duration: 0.07, type: 'sine', gain: 0.12 }],
    [Sound.ActionNeutralReverse]: [{ frequency: 330, duration: 0.07, type: 'sine', gain: 0.1 }],
    [Sound.ActionBad]: [
      { frequency: 392, duration: 0.08, type: 'sine', gain: 0.12 },
      { frequency: 311, duration: 0.12, type: 'sine', gain: 0.14 },
    ],
    [Sound.ActionMix]: [
      { frequency: 554, duration: 0.04, type: 'sine', gain: 0.1 },
      { frequency: 440, duration: 0.04, type: 'sine', gain: 0.1 },
      { frequency: 622, duration: 0.04, type: 'sine', gain: 0.11 },
      { frequency: 370, duration: 0.04, type: 'sine', gain: 0.1 },
    ],
    [Sound.AltActionGood]: [
      { frequency: 220, duration: 0.1, type: 'triangle', gain: 0.1 },
      { frequency: 262, duration: 0.08, type: 'triangle', gain: 0.08 },
    ],
    [Sound.EndGood]: [
      { frequency: 523, duration: 0.12, type: 'square', gain: 0.06 },
      { frequency: 659, duration: 0.12, type: 'square', gain: 0.07 },
      { frequency: 784, duration: 0.12, type: 'square', gain: 0.08 },
      { frequency: 1047, duration: 0.2, type: 'square', gain: 0.09 },
    ],
    [Sound.EndNeutral]: [
      { frequency: 440, duration: 0.15, type: 'square', gain: 0.06 },
      { frequency: 523, duration: 0.15, type: 'square', gain: 0.06 },
      { frequency: 440, duration: 0.2, type: 'square', gain: 0.05 },
    ],
    [Sound.EndBad]: [
      { frequency: 370, duration: 0.15, type: 'square', gain: 0.06 },
      { frequency: 311, duration: 0.15, type: 'square', gain: 0.07 },
      { frequency: 262, duration: 0.25, type: 'square', gain: 0.08 },
    ],
  };

  private static readonly FADE_OUT = 0.03;

  private _context: AudioContext | null = null;
  private queueEnd: number = 0;

  play(sound: Sound): void {
    const notes = SoundPlayer.DEFINITIONS[sound];
    if (notes.length === 0) return;
    setTimeout(() => this.scheduleSound(notes), 0);
  }

  private get context(): AudioContext {
    if (!this._context) this._context = new AudioContext();
    return this._context;
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
    gainNode.gain.setValueAtTime(note.gain, end - SoundPlayer.FADE_OUT);
    gainNode.gain.linearRampToValueAtTime(0.001, end);
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(start);
    osc.stop(end);
  }
}
