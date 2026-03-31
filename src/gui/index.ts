import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from '@/gui/components/App/App.vue';
import DirectivesPlugin from '@/gui/plugins/DirectivesPlugin/DirectivesPlugin.ts';
import LocalesPlugin from '@/gui/plugins/LocalesPlugin/LocalesPlugin.ts';
import ProvidesPlugin from '@/gui/plugins/ProvidesPlugin.ts';
import MatchStore from '@/gui/stores/MatchStore.ts';

class Application {
  private app = createApp(App);

  async start(): Promise<void> {
    try {
      await Promise.allSettled([this.installAsyncPlugins(), MatchStore.start()]);
      this.installPlugins();
      this.mount();
    } catch (error) {
      console.error(error);
    }
  }

  private async installAsyncPlugins(): Promise<void> {
    await LocalesPlugin.create().install(this.app);
  }

  private installPlugins(): void {
    this.app.use(createPinia());
    this.app.use(new DirectivesPlugin());
    this.app.use(new ProvidesPlugin());
  }

  private mount(): void {
    this.app.mount('#app');
  }
}

new Application().start();
