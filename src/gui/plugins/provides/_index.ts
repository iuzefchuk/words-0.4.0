import { App } from 'vue';
import type { InjectionKey } from 'vue';

export const transitionDurationMsKey: InjectionKey<number> = Symbol('transitionDurationMs');

export default {
  install(app: App) {
    app.provide(transitionDurationMsKey, 250);
  },
};
