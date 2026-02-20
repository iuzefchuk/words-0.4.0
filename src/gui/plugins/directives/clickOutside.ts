import type { ObjectDirective } from 'vue';

type ClickOutsideHtmlElement = HTMLElement & {
  _clickOutside: (event: Event) => void;
};

type BindingValue = {
  callback: () => void;
};

const directive: ObjectDirective<ClickOutsideHtmlElement, BindingValue> = {
  beforeMount(el, binding) {
    const { callback } = binding.value || {};
    el._clickOutside = (event: Event): void => {
      event.stopPropagation();
      const target = event.target as Node;
      if (!el.isEqualNode(target) && !el.contains(target)) callback();
    };
    window.requestAnimationFrame(() => {
      document.addEventListener('click', el._clickOutside);
      document.addEventListener('touchstart', el._clickOutside);
    });
  },

  unmounted(el) {
    document.removeEventListener('click', el._clickOutside);
    document.removeEventListener('touchstart', el._clickOutside);
    el._clickOutside = () => {};
  },
};

export default directive;
