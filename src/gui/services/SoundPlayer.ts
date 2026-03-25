export enum Sound {
  ActionGood = 'ActionGood',
  ActionNeutral = 'ActionNeutral',
  ActionNeutralReverse = 'ActionNeutralReverse',
  ActionBad = 'ActionBad',
  ActionMix = 'ActionMix',
  AltActionGood = 'AltActionGood',
  AltActionBad = 'AltActionBad',
  EndGood = 'EndGood',
  EndNeutral = 'EndNeutral',
  EndBad = 'EndBad',
}

type Note = { frequency: number; duration: number; type: OscillatorType; gain: number; ramp?: number };

export default class SoundPlayer {
  private static readonly NOTES: Record<Sound, ReadonlyArray<Note>> = {
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
    [Sound.AltActionBad]: [
      { frequency: 262, duration: 0.1, type: 'triangle', gain: 0.1 },
      { frequency: 220, duration: 0.12, type: 'triangle', gain: 0.08 },
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
  private static readonly FADE_OUT_MS = 0.03;
  private static context = new AudioContext();
  private static queueEnd = 0;

  static play(sound: Sound): void {
    const notes = this.NOTES[sound];
    setTimeout(() => this.playNotes(notes), 0);
  }

  private static playNotes(notes: ReadonlyArray<Note>): void {
    try {
      if (this.context.state === 'suspended') this.context.resume();
      const now = this.context.currentTime + this.FADE_OUT_MS;
      let time = Math.max(now, this.queueEnd);
      for (const note of notes) {
        const end = time + note.duration;
        this.playNote(note, time, end);
        time = end;
      }
      this.queueEnd = time;
    } catch (error) {
      console.error(error);
    }
  }

  private static playNote(note: Note, start: number, end: number): void {
    const { type, frequency, gain } = note;
    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gainNode.gain.setValueAtTime(gain, start);
    gainNode.gain.setValueAtTime(gain, end - this.FADE_OUT_MS);
    gainNode.gain.linearRampToValueAtTime(0.001, end);
    oscillator.connect(gainNode);
    gainNode.connect(this.context.destination);
    oscillator.start(start);
    oscillator.stop(end);
  }
}
