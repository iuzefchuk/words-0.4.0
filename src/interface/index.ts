import { createPinia } from 'pinia';
import { createApp } from 'vue';
import Index from '@/interface/components/by-hierarchy/index.vue';
import DirectivesPlugin from '@/interface/plugins/DirectivesPlugin/DirectivesPlugin.ts';
import LocalesPlugin from '@/interface/plugins/LocalesPlugin/LocalesPlugin.ts';
import ProvidesPlugin from '@/interface/plugins/ProvidesPlugin.ts';

class Presentation {
  private readonly app = createApp(Index);

  async start(): Promise<void> {
    await this.installAsyncPlugins();
    this.installPlugins();
    this.mount();
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

void new Presentation().start();
