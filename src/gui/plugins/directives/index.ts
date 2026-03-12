import { App, DirectiveBinding, ObjectDirective } from 'vue';
import ClickOutside from '@/gui/plugins/directives/ClickOutside.ts';
import AnimateNumber from '@/gui/plugins/directives/AnimateNumber.ts';

export abstract class Directive<DirectiveHtmlElement extends HTMLElement, BindingValue> {
  beforeMount?(el: DirectiveHtmlElement, binding: DirectiveBinding<BindingValue>): void;
  mounted?(el: DirectiveHtmlElement, binding: DirectiveBinding<BindingValue>): void;
  beforeUpdate?(el: DirectiveHtmlElement, binding: DirectiveBinding<BindingValue>): void;
  updated?(el: DirectiveHtmlElement, binding: DirectiveBinding<BindingValue>): void;
  unmounted?(el: DirectiveHtmlElement): void;

  get directive(): ObjectDirective<DirectiveHtmlElement, BindingValue> {
    return {
      mounted: this.mounted?.bind(this),
      beforeUpdate: this.beforeUpdate?.bind(this),
      updated: this.updated?.bind(this),
      unmounted: this.unmounted?.bind(this),
    };
  }
}

export default {
  install(app: App) {
    app
      .directive('animate-number', new AnimateNumber().directive)
      .directive('on-click-outside', new ClickOutside().directive);
  },
};
