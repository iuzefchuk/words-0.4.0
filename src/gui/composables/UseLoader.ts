import { ref, computed, watch, inject } from 'vue';
import UseCounter from '@/gui/composables/UseCounter.ts';
import { transitionDurationMsKey } from '@/gui/plugins/provides/index.ts';
import Game from '@/application/index.ts';

export default class UseLoader {
  static readonly WORD = [Game.LETTERS.W, Game.LETTERS.O, Game.LETTERS.R, Game.LETTERS.D, Game.LETTERS.S];

  private readonly counter;
  private readonly isRenderedRef = ref(false);

  readonly isRendered = computed({
    get: () => this.isRenderedRef.value,
    set: (newValue: boolean) => {
      this.isRenderedRef.value = newValue;
    },
  });

  readonly allTilesAreHighlighted = computed(() => this.counter.value > 0 && this.remainingCounterValue.value === 0);

  private readonly remainingCounterValue = computed(() => this.counter.value % (UseLoader.WORD.length + 1));

  private readonly onlyFirstTileIsElevated = computed(() =>
    UseLoader.WORD.every((_, idx) => (idx === 0 ? this.isTileElevated(idx) : !this.isTileElevated(idx))),
  );

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

  isTileElevated(idx: number): boolean {
    return idx < this.remainingCounterValue.value;
  }

  private initRenderWithCounter(): void {
    this.isRendered.value = true;
    this.counter.restartCounter(() => this.onIncrementCounter());
  }

  private deinitRenderWithCounter(): void {
    this.isRendered.value = false;
    this.counter.stopCounter();
    this.emit('derendered');
  }

  private onIncrementCounter(): void {
    if (this.counter.value <= 1) return;
    if (!this.props.isActive && this.onlyFirstTileIsElevated.value) this.deinitRenderWithCounter();
  }
}
