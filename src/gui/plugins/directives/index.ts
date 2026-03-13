import { App, } from 'vue';
import ClickOutside from '@/gui/plugins/directives/ClickOutside.ts';
import AnimateNumber from '@/gui/plugins/directives/AnimateNumber.ts';

export default {
  install(app: App) {
    app
      .directive('animate-number', new AnimateNumber().directive)
      .directive('on-click-outside', new ClickOutside().directive);
  },
};
