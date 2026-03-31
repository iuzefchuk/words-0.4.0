export enum Sound {
  GameLongBad = 'GameLongBad',
  GameLongGood = 'GameLongGood',
  GameLongNeutral = 'GameLongNeutral',
  GameShortAltBad = 'GameShortAltBad',
  GameShortAltGood = 'GameShortAltGood',
  GameShortBad = 'GameShortBad',
  GameShortGood = 'GameShortGood',
  GameShortNeutral = 'GameShortNeutral',
  GameShortNeutralReverse = 'GameShortNeutralReverse',
  SystemClear = 'SystemClear',
  SystemDialog = 'SystemDialog',
  SystemShuffle = 'SystemShuffle',
}

type Note = { duration: number; frequency: number; gain: number; ramp?: number; type: OscillatorType };

export default class SoundPlayer {
  private static context = new AudioContext();
  private static readonly FADE_OUT_MS = 0.03;
  private static readonly NOTES: Record<Sound, ReadonlyArray<Note>> = {
    [Sound.GameLongBad]: [
      { duration: 0.15, frequency: 370, gain: 0.06, type: 'square' },
      { duration: 0.15, frequency: 311, gain: 0.07, type: 'square' },
      { duration: 0.25, frequency: 262, gain: 0.08, type: 'square' },
    ],
    [Sound.GameLongGood]: [
      { duration: 0.12, frequency: 523, gain: 0.06, type: 'square' },
      { duration: 0.12, frequency: 659, gain: 0.07, type: 'square' },
      { duration: 0.12, frequency: 784, gain: 0.08, type: 'square' },
      { duration: 0.2, frequency: 1047, gain: 0.09, type: 'square' },
    ],
    [Sound.GameLongNeutral]: [
      { duration: 0.15, frequency: 440, gain: 0.06, type: 'square' },
      { duration: 0.15, frequency: 523, gain: 0.06, type: 'square' },
      { duration: 0.2, frequency: 440, gain: 0.05, type: 'square' },
    ],
    [Sound.GameShortAltBad]: [
      { duration: 0.1, frequency: 262, gain: 0.1, type: 'triangle' },
      { duration: 0.12, frequency: 220, gain: 0.08, type: 'triangle' },
    ],
    [Sound.GameShortAltGood]: [
      { duration: 0.1, frequency: 220, gain: 0.1, type: 'triangle' },
      { duration: 0.08, frequency: 262, gain: 0.08, type: 'triangle' },
    ],
    [Sound.GameShortBad]: [
      { duration: 0.08, frequency: 392, gain: 0.12, type: 'sine' },
      { duration: 0.12, frequency: 311, gain: 0.14, type: 'sine' },
    ],
    [Sound.GameShortGood]: [
      { duration: 0.08, frequency: 523, gain: 0.12, type: 'sine' },
      { duration: 0.1, frequency: 659, gain: 0.15, type: 'sine' },
    ],
    [Sound.GameShortNeutral]: [{ duration: 0.07, frequency: 440, gain: 0.12, type: 'sine' }],
    [Sound.GameShortNeutralReverse]: [{ duration: 0.07, frequency: 330, gain: 0.1, type: 'sine' }],
    [Sound.SystemClear]: [
      { duration: 0.06, frequency: 660, gain: 0.06, type: 'triangle' },
      { duration: 0.06, frequency: 660, gain: 0.05, type: 'triangle' },
    ],
    [Sound.SystemDialog]: [
      { duration: 0.05, frequency: 880, gain: 0.05, type: 'triangle' },
      { duration: 0.08, frequency: 440, gain: 0.06, type: 'triangle' },
    ],
    [Sound.SystemShuffle]: [
      { duration: 0.04, frequency: 554, gain: 0.06, type: 'triangle' },
      { duration: 0.04, frequency: 440, gain: 0.06, type: 'triangle' },
      { duration: 0.04, frequency: 622, gain: 0.07, type: 'triangle' },
      { duration: 0.04, frequency: 370, gain: 0.06, type: 'triangle' },
    ],
  };
  private static queueEnd = 0;

  static play(sound: Sound): void {
    const notes = this.NOTES[sound];
    setTimeout(() => this.playNotes(notes), 0);
  }

  private static playNote(note: Note, start: number, end: number): void {
    const { frequency, gain, type } = note;
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
}
