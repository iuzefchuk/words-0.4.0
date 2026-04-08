import { createPinia } from 'pinia';
import { createApp } from 'vue';
import Index from '@/presentation/components/by-hierarchy/index.vue';
import DirectivesPlugin from '@/presentation/plugins/DirectivesPlugin/DirectivesPlugin.ts';
import LocalesPlugin from '@/presentation/plugins/LocalesPlugin/LocalesPlugin.ts';
import ProvidesPlugin from '@/presentation/plugins/ProvidesPlugin.ts';
import MainStore from '@/presentation/stores/MainStore.ts';

class Presentation {
  private app = createApp(Index);

  async start(): Promise<void> {
    try {
      await Promise.all([this.installAsyncPlugins(), MainStore.initiate()]);
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

new Presentation().start();
