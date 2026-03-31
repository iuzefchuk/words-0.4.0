import { computed } from 'vue';
import { GameEvent, GameEventType } from '@/application/types.ts';
import MatchStore from '@/gui/stores/MatchStore.ts';

const ANNOTATION_EVENT_TYPES: ReadonlySet<GameEventType> = new Set([
  GameEventType.OpponentTurnPassed,
  GameEventType.OpponentTurnSaved,
  GameEventType.UserTurnPassed,
  GameEventType.UserTurnSaved,
]);

export default class UseAnnotation {
  private static readonly MAX_DISPLAYED_MESSAGES = 3;

  readonly messages = computed(() => {
    const events = this.getRecentAnnotationEvents();
    return events.map((event, index) => ({
      html: this.createEventHtml(event),
      key: this.getMessageKey(index),
    }));
  });

  private get annotationEvents(): ReadonlyArray<GameEvent> {
    return this.matchStore.eventLog.filter(event => ANNOTATION_EVENT_TYPES.has(event.type));
  }

  private get matchStore() {
    return MatchStore.INSTANCE();
  }

  private createEventHtml(event: GameEvent): string {
    switch (event.type) {
      case GameEventType.OpponentTurnPassed:
        return window.t('game.message_pass_opponent');
      case GameEventType.OpponentTurnSaved:
        return window.t('game.message_save_opponent', { score: event.score, words: event.words.join(', ') });
      case GameEventType.UserTurnPassed:
        return window.t('game.message_pass_user');
      case GameEventType.UserTurnSaved:
        return window.t('game.message_save_user', { score: event.score, words: event.words.join(', ') });
      default:
        return '';
    }
  }

  private getMessageKey(index: number): number {
    const total = this.annotationEvents.length;
    const start = Math.max(0, total - UseAnnotation.MAX_DISPLAYED_MESSAGES);
    return start + index;
  }

  private getRecentAnnotationEvents(): ReadonlyArray<GameEvent> {
    const events = this.annotationEvents;
    const start = Math.max(0, events.length - UseAnnotation.MAX_DISPLAYED_MESSAGES);
    return events.slice(start);
  }
}
