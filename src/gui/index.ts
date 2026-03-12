import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import directives from './plugins/directives/index.ts';
import provides from './plugins/provides/index.ts';
import LocalesPlugin from './plugins/locales/index.ts';

class Application {
  private app = createApp(App);

  async start(): Promise<void> {
    try {
      this.installPlugins();
      await this.installAsyncPlugins();
      this.mount();
    } catch (error) {
      console.error(error);
    }
  }

  private installPlugins(): void {
    this.app.use(directives);
    this.app.use(provides);
    this.app.use(createPinia());
  }

  private async installAsyncPlugins(): Promise<void> {
    await LocalesPlugin.create().install(this.app);
  }

  private mount(): void {
    this.app.mount('#app');
  }
}

new Application().start();
