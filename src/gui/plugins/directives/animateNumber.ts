import { DirectiveBinding } from 'vue';
import Directive from '@/gui/plugins/directives/Directive.ts';

type AnimatedHtmlElement = HTMLElement & { _animationFrameRequestId?: number };
type BindingValue = { number: number; animationDelay?: number; animationDuration?: number };

export default class AnimateNumber extends Directive<AnimatedHtmlElement, BindingValue> {
  mounted(element: AnimatedHtmlElement, binding: DirectiveBinding<BindingValue>): void {
    AnimateNumber.Animator.create(element, binding.value).execute();
  }

  beforeUpdate(element: AnimatedHtmlElement, binding: DirectiveBinding<BindingValue>): void {
    const { value, oldValue } = binding;
    if (value.number === oldValue?.number) return;
    AnimateNumber.Animator.create(element, binding.value, oldValue?.number).execute();
  }

  private static Animator = class Animator {
    private constructor(
      private readonly element: AnimatedHtmlElement,
      private readonly endValue: number,
      private readonly delay: number = 0,
      private readonly duration: number = 500,
      private readonly startValue: number = 0,
    ) {}

    private get startTime(): number {
      return performance.now() + this.delay;
    }

    static create(element: AnimatedHtmlElement, bindingValue: BindingValue, startValue?: number): Animator {
      const { number: endValue, animationDelay: delay, animationDuration: duration } = bindingValue;
      return new Animator(element, endValue, delay, duration, startValue);
    }

    execute(): void {
      if (this.element._animationFrameRequestId) cancelAnimationFrame(this.element._animationFrameRequestId);
      this.handleNextFrame();
    }

    private frameCallback(nowTime: number): void {
      if (nowTime < this.startTime) return this.handleNextFrame();
      const progress = Math.min((nowTime - this.startTime) / this.duration, 1); // 0 - 1
      const animationIsUnfinished = progress < 1;
      const nextValue = animationIsUnfinished
        ? Math.floor(this.startValue + (this.endValue - this.startValue) * progress)
        : this.endValue;
      this.element.textContent = window.n(nextValue);
      if (animationIsUnfinished) this.handleNextFrame();
    }

    private handleNextFrame(): void {
      this.element._animationFrameRequestId = requestAnimationFrame(this.frameCallback);
    }
  };
}
