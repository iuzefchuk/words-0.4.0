import { DirectiveBinding, ObjectDirective } from 'vue';

export default abstract class Directive<DirectiveHtmlElement extends HTMLElement, BindingValue> {
  get directive(): ObjectDirective<DirectiveHtmlElement, BindingValue> {
    return {
      beforeMount: this.beforeMount?.bind(this),
      beforeUpdate: this.beforeUpdate?.bind(this),
      mounted: this.mounted?.bind(this),
      unmounted: this.unmounted?.bind(this),
      updated: this.updated?.bind(this),
    };
  }
  beforeMount?(el: DirectiveHtmlElement, binding: DirectiveBinding<BindingValue>): void;
  beforeUpdate?(el: DirectiveHtmlElement, binding: DirectiveBinding<BindingValue>): void;
  mounted?(el: DirectiveHtmlElement, binding: DirectiveBinding<BindingValue>): void;
  unmounted?(el: DirectiveHtmlElement): void;

  updated?(el: DirectiveHtmlElement, binding: DirectiveBinding<BindingValue>): void;
}
