import { DirectiveBinding } from 'vue';
import Directive from './DirectiveClass.ts';

type AnimatedHtmlElement = { _animationFrameRequestId?: number } & HTMLElement;

type BindingValue = { animationDelay?: number; animationDuration?: number; number: number };

class Animator {
  private readonly startTime: number;

  private constructor(
    private readonly element: AnimatedHtmlElement,
    private readonly endValue: number,
    private readonly delay = 0,
    private readonly duration = 500,
    private readonly startValue = 0,
  ) {
    this.startTime = performance.now() + this.delay;
  }

  static create(element: AnimatedHtmlElement, bindingValue: BindingValue, startValue?: number): Animator {
    const { animationDelay: delay, animationDuration: duration, number: endValue } = bindingValue;
    return new Animator(element, endValue, delay, duration, startValue);
  }

  execute(): void {
    if (this.element._animationFrameRequestId !== undefined) cancelAnimationFrame(this.element._animationFrameRequestId);
    this.handleNextFrame();
  }

  private frameCallback(nowTime: number): void {
    if (nowTime < this.startTime) {
      this.handleNextFrame();
      return;
    }
    const progress = Math.min((nowTime - this.startTime) / this.duration, 1); // 0 - 1
    const animationIsUnfinished = progress < 1;
    const nextValue = animationIsUnfinished
      ? Math.floor(this.startValue + (this.endValue - this.startValue) * progress)
      : this.endValue;
    this.element.textContent = window.number(nextValue);
    if (animationIsUnfinished) this.handleNextFrame();
  }

  private handleNextFrame(): void {
    this.element._animationFrameRequestId = requestAnimationFrame(time => {
      this.frameCallback(time);
    });
  }
}

export default class AnimateNumber extends Directive<AnimatedHtmlElement, BindingValue> {
  override beforeUpdate(element: AnimatedHtmlElement, binding: DirectiveBinding<BindingValue>): void {
    const { oldValue, value } = binding;
    if (value.number === oldValue?.number) return;
    Animator.create(element, binding.value, oldValue?.number).execute();
  }

  override mounted(element: AnimatedHtmlElement, binding: DirectiveBinding<BindingValue>): void {
    Animator.create(element, binding.value).execute();
  }

  override unmounted(element: AnimatedHtmlElement): void {
    if (element._animationFrameRequestId !== undefined) {
      cancelAnimationFrame(element._animationFrameRequestId);
    }
  }
}
