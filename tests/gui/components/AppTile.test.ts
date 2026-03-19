import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AppTile from '@/gui/components/shared/AppTile.vue';
import ProvidesPlugin from '@/gui/plugins/ProvidesPlugin.ts';

function mountTile(props: { letter: string; isInverted?: boolean; isHighlighted?: boolean; isElevated?: boolean }) {
  return mount(AppTile, {
    props,
    global: {
      provide: { [ProvidesPlugin.TRANSITION_DURATION_MS_KEY as symbol]: 0 },
    },
  });
}

describe('AppTile', () => {
  it('renders an svg element', () => {
    const wrapper = mountTile({ letter: 'A' });
    expect(wrapper.find('svg').exists()).toBe(true);
  });

  it('applies tile class by default', () => {
    const wrapper = mountTile({ letter: 'A' });
    const svg = wrapper.find('svg');
    expect(svg.classes()).toContain('tile');
  });

  it('applies inverted class when isInverted is true', () => {
    const wrapper = mountTile({ letter: 'A', isInverted: true });
    expect(wrapper.find('svg').classes()).toContain('tile--inverted');
  });

  it('does not apply inverted class when isInverted is false', () => {
    const wrapper = mountTile({ letter: 'A', isInverted: false });
    expect(wrapper.find('svg').classes()).not.toContain('tile--inverted');
  });

  it('applies highlighted class when isHighlighted is true', () => {
    const wrapper = mountTile({ letter: 'A', isHighlighted: true });
    expect(wrapper.find('svg').classes()).toContain('tile--highlighted');
  });

  it('applies elevated class when isElevated is true', () => {
    const wrapper = mountTile({ letter: 'A', isElevated: true });
    expect(wrapper.find('svg').classes()).toContain('tile--elevated');
  });

  it('renders svg content for the letter', () => {
    const wrapper = mountTile({ letter: 'A' });
    const svg = wrapper.find('svg');
    expect(svg.html()).toContain('<path');
  });
});
