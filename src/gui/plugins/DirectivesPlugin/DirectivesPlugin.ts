import { App } from 'vue';
import AnimateNumber from './AnimateNumber.ts';
import ClickOutside from './ClickOutside.ts';

export default class DirectivesPlugin {
  private static readonly ANIMATE_NUMBER = new AnimateNumber().directive;
  private static readonly CLICK_OUTSIDE = new ClickOutside().directive;

  install(app: App) {
    app.directive('animate-number', DirectivesPlugin.ANIMATE_NUMBER).directive('on-click-outside', DirectivesPlugin.CLICK_OUTSIDE);
  }
}
