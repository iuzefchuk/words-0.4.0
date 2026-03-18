import { ref, computed, watch, inject } from 'vue';
import UseCounter from '@/gui/composables/UseCounter.ts';
import { transitionDurationMsKey } from '@/gui/plugins/provides/index.ts';
import Game from '@/application/index.ts';

export default class UseLoader {
  static readonly word = [Game.letters.W, Game.letters.O, Game.letters.R, Game.letters.D, Game.letters.S];

  private readonly counter;
  private readonly isRenderedRef = ref(false);

  constructor(
    private readonly props: { isActive: boolean },
    private readonly emit: (event: 'derendered') => void,
  ) {
    const transitionDurationMs = inject(transitionDurationMsKey, 0);
    this.counter = new UseCounter(transitionDurationMs);
    watch(
      () => this.props.isActive,
      newValue => {
        if (newValue) this.initRenderWithCounter();
      },
      { immediate: true },
    );
  }

  get isRendered(): boolean {
    return this.isRenderedRef.value;
  }

  set isRendered(newValue: boolean) {
    this.isRenderedRef.value = newValue;
  }

  get allTilesAreHighlighted(): boolean {
    return computed(() => this.counter.value > 0 && this.remainingCounterValue === 0).value;
  }

  isTileElevated(idx: number): boolean {
    return idx < this.remainingCounterValue;
  }

  private get remainingCounterValue(): number {
    return computed(() => this.counter.value % (UseLoader.word.length + 1)).value;
  }

  private get onlyFirstTileIsElevated(): boolean {
    return computed(() =>
      UseLoader.word.every((_, idx) => (idx === 0 ? this.isTileElevated(idx) : !this.isTileElevated(idx))),
    ).value;
  }

  private initRenderWithCounter(): void {
    this.isRendered = true;
    this.counter.restartCounter(() => this.onIncrementCounter());
  }

  private deinitRenderWithCounter(): void {
    this.isRendered = false;
    this.counter.stopCounter();
    this.emit('derendered');
  }

  private onIncrementCounter(): void {
    if (this.counter.value <= 1) return;
    if (!this.props.isActive && this.onlyFirstTileIsElevated) this.deinitRenderWithCounter();
  }
}
