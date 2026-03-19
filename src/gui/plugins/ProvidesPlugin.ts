import { App } from 'vue';
import type { InjectionKey } from 'vue';

export default class ProvidesPlugin {
  static readonly TRANSITION_DURATION_MS_KEY: InjectionKey<number> = Symbol('transitionDurationMs');

  install(app: App): void {
    app.provide(ProvidesPlugin.TRANSITION_DURATION_MS_KEY, 250);
  }
}
