import { DirectiveBinding, ObjectDirective } from 'vue';

export default abstract class Directive<DirectiveHtmlElement extends HTMLElement, BindingValue> {
  get directive(): ObjectDirective<DirectiveHtmlElement, BindingValue> {
    return {
      ...(this.beforeMount && { beforeMount: this.beforeMount.bind(this) }),
      ...(this.beforeUpdate && { beforeUpdate: this.beforeUpdate.bind(this) }),
      ...(this.mounted && { mounted: this.mounted.bind(this) }),
      ...(this.unmounted && { unmounted: this.unmounted.bind(this) }),
      ...(this.updated && { updated: this.updated.bind(this) }),
    };
  }

  beforeMount?(el: DirectiveHtmlElement, binding: DirectiveBinding<BindingValue>): void;

  beforeUpdate?(el: DirectiveHtmlElement, binding: DirectiveBinding<BindingValue>): void;

  mounted?(el: DirectiveHtmlElement, binding: DirectiveBinding<BindingValue>): void;

  unmounted?(el: DirectiveHtmlElement): void;

  updated?(el: DirectiveHtmlElement, binding: DirectiveBinding<BindingValue>): void;
}
