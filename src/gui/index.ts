import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from '@/gui/components/App/App.vue';
import directives from '@/gui/plugins/directives/index.ts';
import provides from '@/gui/plugins/provides/index.ts';
import LocalesPlugin from '@/gui/plugins/locales/index.ts';
import { startGame } from '@/gui/stores/MatchStore.ts';

class Application {
  private app = createApp(App);

  async start(): Promise<void> {
    try {
      await Promise.allSettled([this.installAsyncPlugins(), startGame()]);
      this.installPlugins();
      this.mount();
    } catch (error) {
      console.error(error);
    }
  }

  private installPlugins(): void {
    this.app.use(createPinia());
    this.app.use(directives);
    this.app.use(provides);
  }

  private async installAsyncPlugins(): Promise<void> {
    await LocalesPlugin.create().install(this.app);
  }

  private mount(): void {
    this.app.mount('#app');
  }
}

new Application().start();
