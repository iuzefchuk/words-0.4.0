import { describe, it, expect } from 'vitest';
import { createApp } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import DialogStore, { DialogStatus } from '@/gui/stores/DialogStore.ts';

describe('DialogStore', () => {
  function createStore() {
    const app = createApp({});
    const pinia = createPinia();
    app.use(pinia);
    setActivePinia(pinia);
    return DialogStore.INSTANCE();
  }

  it('resolves with confirmed result when confirm is called', async () => {
    const store = createStore();

    const promise = store.trigger({ title: 'Test', html: '<p>Confirm?</p>' });
    store.resolve({ status: DialogStatus.Confirmed });

    const result = await promise;
    expect(result.isConfirmed).toBe(true);
    expect(result.isCanceled).toBe(false);
    expect(result.isDismissed).toBe(false);
  });

  it('resolves with canceled result when cancel is called', async () => {
    const store = createStore();

    const promise = store.trigger({ title: 'Test', html: '<p>Cancel?</p>' });
    store.resolve({ status: DialogStatus.Canceled });

    const result = await promise;
    expect(result.isCanceled).toBe(true);
    expect(result.isConfirmed).toBe(false);
    expect(result.isDismissed).toBe(false);
  });

  it('resolves with dismissed result when dismissed', async () => {
    const store = createStore();

    const promise = store.trigger({ title: 'Test', html: '<p>Dismiss?</p>' });
    store.resolve({ status: DialogStatus.Dismissed });

    const result = await promise;
    expect(result.isDismissed).toBe(true);
    expect(result.isConfirmed).toBe(false);
    expect(result.isCanceled).toBe(false);
  });

  it('resets state after resolution', async () => {
    const store = createStore();

    const promise = store.trigger({
      title: 'Custom Title',
      html: '<p>Custom</p>',
      cancelText: 'Nope',
      confirmText: 'Yep',
    });
    store.resolve({ status: DialogStatus.Confirmed });
    await promise;

    // After reset, refs should be back to defaults
    expect(store.title).toBe('');
    expect(store.html).toBe('');
    expect(store.cancelText).toBe('general.cancel');
    expect(store.confirmText).toBe('general.ok');
  });

  it('sets dialog properties when triggered', () => {
    const store = createStore();

    store.trigger({
      title: 'My Title',
      html: '<p>Body</p>',
      cancelIsHidden: true,
      confirmText: 'OK!',
    });

    expect(store.title).toBe('My Title');
    expect(store.html).toBe('<p>Body</p>');
    expect(store.cancelIsHidden).toBe(true);
    expect(store.confirmText).toBe('OK!');

    // Clean up by resolving
    store.resolve({ status: DialogStatus.Dismissed });
  });
});
