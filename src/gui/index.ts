import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import directives from './plugins/directives/index.js';
import provides from './plugins/provides/index.js';
import locales from './plugins/locales/index.js';

(async function init() {
  try {
    const app = createApp(App);
    app.use(directives);
    app.use(provides);
    await locales.install(app);
    app.use(createPinia());
    app.mount('#app');
  } catch (error) {
    console.error(error);
  }
})();
