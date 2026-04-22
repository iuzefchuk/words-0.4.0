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

  private get applicationStore(): ReturnType<typeof ApplicationStore.INSTANCE> {
    return ApplicationStore.INSTANCE();
  }

  private get displayedEvents(): ReadonlyArray<GameEvent> {
    const events = this.allDisplayedEvents;
    const start = Math.max(0, events.length - UseNotifications.MAX_DISPLAYED_MESSAGES);
    return events.slice(start);
  }

  private static createPassMessage(player: GamePlayer): string {
    return player === GamePlayer.User ? window.text('game.message_pass_user') : window.text('game.message_pass_opponent');
  }

  private static createSaveMessage(player: GamePlayer, score: number, words: ReadonlyArray<string>): string {
    const joinedWords = words.join(', ');
    return player === GamePlayer.User
      ? window.text('game.message_save_user', { score, words: joinedWords })
      : window.text('game.message_save_opponent', { score, words: joinedWords });
  }

  private createEventHtml(event: GameEvent): string {
    switch (event.type) {
      case GameEventType.DifficultyChanged:
      case GameEventType.MatchFinished:
      case GameEventType.MatchStarted:
      case GameEventType.MatchTypeChanged:
      case GameEventType.TilePlaced:
      case GameEventType.TileUndoPlaced:
      case GameEventType.TurnValidated:
        return '';
      case GameEventType.TurnPassed:
        return UseNotifications.createPassMessage(event.player);
      case GameEventType.TurnSaved:
        return UseNotifications.createSaveMessage(event.player, event.score, event.words);
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
