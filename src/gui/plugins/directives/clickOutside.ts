import { DirectiveBinding } from 'vue';
import { Directive } from '@/gui/plugins/directives/index.ts';

type ClickOutsideHtmlElement = HTMLElement & { _clickOutside: (event: Event) => void };
type BindingValue = { callback: () => void };

export default class ClickOutside extends Directive<ClickOutsideHtmlElement, BindingValue> {
  beforeMount(element: ClickOutsideHtmlElement, binding: DirectiveBinding<BindingValue>): void {
    const { callback } = binding.value || {};
    element._clickOutside = (event: Event): void => {
      const target = event.target as Node;
      if (element !== target && !element.contains(target)) callback();
    };
    window.requestAnimationFrame(() => {
      document.addEventListener('click', element._clickOutside);
      document.addEventListener('touchstart', element._clickOutside);
    });
  }

  unmounted(element: ClickOutsideHtmlElement): void {
    document.removeEventListener('click', element._clickOutside);
    document.removeEventListener('touchstart', element._clickOutside);
    element._clickOutside = () => {};
  }
}
