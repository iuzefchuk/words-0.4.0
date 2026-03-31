import { inject, ref, watch } from 'vue';
import { GameLetter } from '@/application/types.ts';
import UseCounter from '@/gui/composables/UseCounter.ts';
import ProvidesPlugin from '@/gui/plugins/ProvidesPlugin.ts';

export default class UseLoader {
  static readonly LETTERS = [GameLetter.W, GameLetter.O, GameLetter.R, GameLetter.D, GameLetter.S];
  readonly isRendered = ref(false);

  private get isBuildingPhase(): boolean {
    return this.step > 0 && this.step <= this.lettersLength;
  }

  private get isEmphasizedPhase(): boolean {
    return this.step === this.lettersLength + 1;
  }

  private get isFinishedPhase(): boolean {
    return this.step > this.lettersLength + 1;
  }

  private get lettersLength(): number {
    return UseLoader.LETTERS.length;
  }

  private get step(): number {
    return this.counter.value;
  }

  private constructor(
    private readonly props: { isActive: boolean },
    private readonly emit: (event: 'derendered') => void,
    private readonly counter: UseCounter,
  ) {}

  static create(props: { isActive: boolean }, emit: (event: 'derendered') => void): UseLoader {
    const transitionDurationMs = inject(ProvidesPlugin.TRANSITION_DURATION_MS_KEY, 0);
    const counter = new UseCounter(transitionDurationMs);
    const loader = new UseLoader(props, emit, counter);
    loader.initRenderWatcher();
    return loader;
  }

  isItemEmphasized(): boolean {
    return this.isEmphasizedPhase;
  }

  isItemRendered(idx: number): boolean {
    if (this.isItemEmphasized()) return true;
    return this.isItemVisible(idx);
  }

  private deinitRenderWithCounter(): void {
    this.isRendered.value = false;
    this.counter.stopCounter();
    this.emit('derendered');
  }

  private initRenderWatcher(): void {
    watch(
      () => this.props.isActive,
      newValue => {
        if (newValue) this.initRenderWithCounter();
      },
      { immediate: true },
    );
  }

  private initRenderWithCounter(): void {
    this.isRendered.value = true;
    this.counter.restartCounter(() => this.onIncrementCounter());
  }

  private isItemVisible(idx: number): boolean {
    return this.step > idx && this.isBuildingPhase;
  }

  private onIncrementCounter(): void {
    // Wait until full cycle is done
    if (!this.props.isActive && this.isFinishedPhase) this.deinitRenderWithCounter();
  }
}
