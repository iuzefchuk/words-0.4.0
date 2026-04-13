import { computed } from 'vue';
import { GameEvent, GameEventType, GamePlayer } from '@/application/types/index.ts';
import ApplicationStore from '@/interface/stores/ApplicationStore.ts';

export default class UseNotifications {
  private static readonly MAX_DISPLAYED_MESSAGES = 3;

  readonly messages = computed(() => {
    return this.displayedEvents.map((event, index) => ({
      html: this.createEventHtml(event),
      key: this.createEventKey(index),
    }));
  });

  private get allDisplayedEvents(): ReadonlyArray<GameEvent> {
    return this.applicationStore.eventsLog.filter(event => this.isEventDisplayed(event));
  }

  private get applicationStore() {
    return ApplicationStore.INSTANCE();
  }

  private get displayedEvents(): ReadonlyArray<GameEvent> {
    const events = this.allDisplayedEvents;
    const start = Math.max(0, events.length - UseNotifications.MAX_DISPLAYED_MESSAGES);
    return events.slice(start);
  }

  private createEventHtml(event: GameEvent): string {
    switch (event.type) {
      case GameEventType.TurnPassed:
        return event.player === GamePlayer.User ? window.t('game.message_pass_user') : window.t('game.message_pass_opponent');
      case GameEventType.TurnSaved: {
        const words = event.words.join(', ');
        return event.player === GamePlayer.User
          ? window.t('game.message_save_user', { score: event.score, words })
          : window.t('game.message_save_opponent', { score: event.score, words });
      }
      default:
        return '';
    }
  }

  private createEventKey(index: number): number {
    const total = this.allDisplayedEvents.length;
    const start = Math.max(0, total - UseNotifications.MAX_DISPLAYED_MESSAGES);
    return start + index;
  }

  private isEventDisplayed(event: GameEvent): boolean {
    return event.type === GameEventType.TurnPassed || event.type === GameEventType.TurnSaved;
  }
}
