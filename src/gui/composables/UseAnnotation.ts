import { computed } from 'vue';
import { GameEvent, GameEventType } from '@/application/types.ts';
import MatchStore from '@/gui/stores/MatchStore.ts';

const ANNOTATION_EVENT_TYPES: ReadonlySet<GameEventType> = new Set([
  GameEventType.UserTurnSaved,
  GameEventType.UserTurnPassed,
  GameEventType.OpponentTurnSaved,
  GameEventType.OpponentTurnPassed,
]);

export default class UseAnnotation {
  readonly messages = computed(() => {
    const events = this.getRecentAnnotationEvents();
    return events.map((event, index) => ({
      key: this.getMessageKey(index),
      html: this.createEventHtml(event),
    }));
  });

  private static readonly MAX_DISPLAYED_MESSAGES = 3;

  private get matchStore() {
    return MatchStore.INSTANCE();
  }

  private get annotationEvents(): ReadonlyArray<GameEvent> {
    return this.matchStore.eventLog.filter(event => ANNOTATION_EVENT_TYPES.has(event.type));
  }

  private getRecentAnnotationEvents(): ReadonlyArray<GameEvent> {
    const events = this.annotationEvents;
    const start = Math.max(0, events.length - UseAnnotation.MAX_DISPLAYED_MESSAGES);
    return events.slice(start);
  }

  private getMessageKey(index: number): number {
    const total = this.annotationEvents.length;
    const start = Math.max(0, total - UseAnnotation.MAX_DISPLAYED_MESSAGES);
    return start + index;
  }

  private createEventHtml(event: GameEvent): string {
    switch (event.type) {
      case GameEventType.UserTurnSaved:
        return window.t('game.message_save_user', { words: event.words.join(', '), score: event.score });
      case GameEventType.OpponentTurnSaved:
        return window.t('game.message_save_opponent', { words: event.words.join(', '), score: event.score });
      case GameEventType.UserTurnPassed:
        return window.t('game.message_pass_user');
      case GameEventType.OpponentTurnPassed:
        return window.t('game.message_pass_opponent');
      default:
        return '';
    }
  }
}
