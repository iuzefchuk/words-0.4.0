import { App } from 'vue';
import animateNumber from './animateNumber.js';
import clickOutside from './clickOutside.js';

export default {
  install(app: App) {
    app.directive('animate-number', animateNumber).directive('on-click-outside', clickOutside);
  },
};
