import { DirectiveBinding } from 'vue';
import Directive from './DirectiveClass.ts';

type AnimatedHtmlElement = { _animationFrameRequestId?: number } & HTMLElement;

type BindingValue = { animationDelay?: number; animationDuration?: number; number: number };

export default class AnimateNumber extends Directive<AnimatedHtmlElement, BindingValue> {
  private static Animator = class Animator {
    private readonly startTime: number;

    private constructor(
      private readonly element: AnimatedHtmlElement,
      private readonly endValue: number,
      private readonly delay: number = 0,
      private readonly duration: number = 500,
      private readonly startValue: number = 0,
    ) {
      this.startTime = performance.now() + this.delay;
    }

    static create(element: AnimatedHtmlElement, bindingValue: BindingValue, startValue?: number): Animator {
      const { animationDelay: delay, animationDuration: duration, number: endValue } = bindingValue;
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
      const nextValue = animationIsUnfinished ? Math.floor(this.startValue + (this.endValue - this.startValue) * progress) : this.endValue;
      this.element.textContent = window.n(nextValue);
      if (animationIsUnfinished) this.handleNextFrame();
    }

    private handleNextFrame(): void {
      this.element._animationFrameRequestId = requestAnimationFrame(time => this.frameCallback(time));
    }
  };

  override beforeUpdate(element: AnimatedHtmlElement, binding: DirectiveBinding<BindingValue>): void {
    const { oldValue, value } = binding;
    if (value.number === oldValue?.number) return;
    AnimateNumber.Animator.create(element, binding.value, oldValue?.number).execute();
  }

  override mounted(element: AnimatedHtmlElement, binding: DirectiveBinding<BindingValue>): void {
    AnimateNumber.Animator.create(element, binding.value).execute();
  }
}
