import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import AppDialog from '@/gui/components/App/AppDialog.vue';
import DialogStore, { DialogStatus } from '@/gui/stores/DialogStore.ts';

function mountDialog() {
  return mount(AppDialog, {
    global: {
      plugins: [createPinia()],
      directives: { 'on-click-outside': {} },
    },
  });
}

describe('AppDialog', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('is hidden when no title is set', () => {
    const wrapper = mountDialog();
    expect(wrapper.find('.dialog').exists()).toBe(false);
  });

  it('renders title and html when triggered', async () => {
    const wrapper = mountDialog();
    const store = DialogStore.INSTANCE();

    store.trigger({ title: 'Confirm?', html: '<p>Are you sure?</p>' });
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.dialog').exists()).toBe(true);
    expect(wrapper.find('.dialog__content-title').text()).toBe('Confirm?');
    expect(wrapper.find('.dialog__content').html()).toContain('Are you sure?');
  });

  it('resolves with Confirmed when confirm button is clicked', async () => {
    const wrapper = mountDialog();
    const store = DialogStore.INSTANCE();

    const resultPromise = store.trigger({ title: 'Test', html: 'body' });
    await wrapper.vm.$nextTick();

    const buttons = wrapper.findAll('.dialog__footer button');
    const confirmButton = buttons[buttons.length - 1];
    await confirmButton.trigger('click');

    const result = await resultPromise;
    expect(result.isConfirmed).toBe(true);
    expect(result.isCanceled).toBe(false);
    expect(result.isDismissed).toBe(false);
  });

  it('resolves with Canceled when cancel button is clicked', async () => {
    const wrapper = mountDialog();
    const store = DialogStore.INSTANCE();

    const resultPromise = store.trigger({ title: 'Test', html: 'body' });
    await wrapper.vm.$nextTick();

    const cancelButton = wrapper.findAll('.dialog__footer button')[0];
    await cancelButton.trigger('click');

    const result = await resultPromise;
    expect(result.isCanceled).toBe(true);
    expect(result.isConfirmed).toBe(false);
  });

  it('hides cancel button when cancelIsHidden is true', async () => {
    const wrapper = mountDialog();
    const store = DialogStore.INSTANCE();

    store.trigger({ title: 'Info', html: 'ok only', cancelIsHidden: true });
    await wrapper.vm.$nextTick();

    const buttons = wrapper.findAll('.dialog__footer button');
    expect(buttons).toHaveLength(1);
  });

  it('hides confirm button when confirmIsHidden is true', async () => {
    const wrapper = mountDialog();
    const store = DialogStore.INSTANCE();

    store.trigger({ title: 'Info', html: 'cancel only', confirmIsHidden: true });
    await wrapper.vm.$nextTick();

    const buttons = wrapper.findAll('.dialog__footer button');
    expect(buttons).toHaveLength(1);
  });

  it('resets dialog after resolution', async () => {
    const wrapper = mountDialog();
    const store = DialogStore.INSTANCE();

    const resultPromise = store.trigger({ title: 'Test', html: 'body' });
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.dialog').exists()).toBe(true);

    store.resolve({ status: DialogStatus.Confirmed });
    await resultPromise;
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.dialog').exists()).toBe(false);
  });
});
