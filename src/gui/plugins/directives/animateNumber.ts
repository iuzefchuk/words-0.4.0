import type { ObjectDirective } from 'vue';

type AnimatedHtmlElement = HTMLElement & {
  _animationFrameRequestId?: number;
};

type BindingValue = {
  number: number;
  animationDelay?: number;
  animationDuration?: number;
};

function performAnimation({
  el,
  startValue = 0,
  endValue,
  animationDelay = 0,
  animationDuration = 500,
}: {
  el: AnimatedHtmlElement;
  startValue?: BindingValue['number'];
  endValue: BindingValue['number'];
  animationDelay?: BindingValue['animationDelay'];
  animationDuration?: BindingValue['animationDuration'];
}): void {
  if (el._animationFrameRequestId) cancelAnimationFrame(el._animationFrameRequestId);
  const startTime = performance.now() + animationDelay;
  handleNextFrame();

  function frameCallback(nowTime: number): void {
    if (nowTime < startTime) return handleNextFrame();
    const progress = Math.min((nowTime - startTime) / animationDuration, 1); // 0 - 1
    const animationIsUnfinished = progress < 1;
    const nextValue = animationIsUnfinished ? Math.floor(startValue + (endValue - startValue) * progress) : endValue;
    el.textContent = window.n(nextValue);
    if (animationIsUnfinished) handleNextFrame();
  }

  function handleNextFrame(): void {
    el._animationFrameRequestId = requestAnimationFrame(frameCallback);
  }
}
const directive: ObjectDirective<AnimatedHtmlElement, BindingValue> = {
  mounted(el, binding) {
    const { number, animationDelay, animationDuration } = binding.value;
    performAnimation({
      el,
      endValue: number,
      ...(animationDelay && { animationDelay }),
      ...(animationDuration && { animationDuration }),
    });
  },

  beforeUpdate(el, binding) {
    const { value, oldValue } = binding;
    if (oldValue?.number === value.number) return;
    performAnimation({
      el,
      startValue: oldValue?.number,
      endValue: value.number,
      ...(value.animationDelay && { animationDelay: value.animationDelay }),
      ...(value.animationDuration && { animationDuration: value.animationDuration }),
    });
  },
};

export default directive;
