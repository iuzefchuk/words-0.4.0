import { ref, computed, watch, inject, type Ref } from 'vue';
import { useCounter } from '@/gui/composables/counter.ts';
import { transitionDurationMsKey } from '@/gui/plugins/provides/index.ts';
import GameStore from '@/gui/stores/GameStore.ts';

// TODO polish
export default class LoaderController {
  private storeGame = GameStore.getInstance();
  private transitionDurationMs = inject(transitionDurationMsKey, 0);
  private counterApi = useCounter(this.transitionDurationMs);
  readonly isRendered = ref(false);
  readonly INTRO_LETTERS = [
    this.storeGame.letters.W,
    this.storeGame.letters.O,
    this.storeGame.letters.R,
    this.storeGame.letters.D,
    this.storeGame.letters.S,
  ];

  constructor(
    private props: { isActive: boolean },
    private emit: (event: 'derendered') => void,
  ) {
    watch(
      () => this.props.isActive,
      newValue => {
        if (newValue) this.initRenderWithCounter();
      },
      { immediate: true },
    );
  }

  readonly remainingCounterValue = computed(() => this.counterApi.counter.value % (this.INTRO_LETTERS.length + 1));
  readonly allTilesAreHighlighted = computed(
    () => this.counterApi.counter.value > 0 && this.remainingCounterValue.value === 0,
  );
  readonly onlyFirstTileIsElevated = computed(() =>
    this.INTRO_LETTERS.every((_, idx) => (idx === 0 ? this.isTileElevated(idx) : !this.isTileElevated(idx))),
  );

  initRenderWithCounter(): void {
    this.isRendered.value = true;
    this.counterApi.restartCounter(this.onIncrementCounter.bind(this));
  }

  deinitRenderWithCounter(): void {
    this.isRendered.value = false;
    this.counterApi.stopCounter();
    this.emit('derendered');
  }

  private onIncrementCounter(): void {
    if (this.counterApi.counter.value <= 1) return;
    if (!this.props.isActive && this.onlyFirstTileIsElevated.value) {
      this.deinitRenderWithCounter();
    }
  }

  isTileElevated(idx: number): boolean {
    return idx < this.remainingCounterValue.value;
  }

  get counter(): Ref<number> {
    return this.counterApi.counter;
  }
}
