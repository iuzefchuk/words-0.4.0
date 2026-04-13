import { DirectiveBinding } from 'vue';
import Directive from './DirectiveClass.ts';

type BindingValue = { callback: () => void };

type ClickOutsideHtmlElement = { _clickOutside: (event: Event) => void } & HTMLElement;

export default class ClickOutside extends Directive<ClickOutsideHtmlElement, BindingValue> {
  override beforeMount(element: ClickOutsideHtmlElement, binding: DirectiveBinding<BindingValue>): void {
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

  override unmounted(element: ClickOutsideHtmlElement): void {
    document.removeEventListener('click', element._clickOutside);
    document.removeEventListener('touchstart', element._clickOutside);
    element._clickOutside = () => {};
  }
}
