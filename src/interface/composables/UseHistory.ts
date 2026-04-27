import { computed } from 'vue';
import { GameEvent, GameEventType, GamePlayer } from '@/application/types/index.ts';
import MainStore from '@/interface/stores/MainStore.ts';

export default class UseHistory {
  private static readonly MAX_DISPLAYED_EVENTS = 3;

  readonly history = computed(() => {
    return this.displayedEvents.map((event, index) => ({
      html: this.createEventHtml(event),
      key: this.createEventKey(index),
    }));
  });

  private get allDisplayedEvents(): ReadonlyArray<GameEvent> {
    return this.mainStore.eventsLog.filter(event => this.isEventDisplayed(event));
  }

  private get displayedEvents(): ReadonlyArray<GameEvent> {
    const events = this.allDisplayedEvents;
    const start = Math.max(0, events.length - UseHistory.MAX_DISPLAYED_EVENTS);
    return events.slice(start);
  }

  private get mainStore(): ReturnType<typeof MainStore.INSTANCE> {
    return MainStore.INSTANCE();
  }

  private static getPassText(player: GamePlayer): string {
    return player === GamePlayer.User ? window.text('game.event_pass_user') : window.text('game.event_pass_opponent');
  }

  private static getSaveText(player: GamePlayer, score: number, words: ReadonlyArray<string>): string {
    const joinedWords = words.join(', ');
    return player === GamePlayer.User
      ? window.text('game.event_save_user', { score, words: joinedWords })
      : window.text('game.event_save_opponent', { score, words: joinedWords });
  }

  private createEventHtml(event: GameEvent): string {
    switch (event.type) {
      case GameEventType.MatchDifficultyChanged:
      case GameEventType.MatchFinished:
      case GameEventType.MatchStarted:
      case GameEventType.MatchTypeChanged:
      case GameEventType.TilePlaced:
      case GameEventType.TileUndoPlaced:
      case GameEventType.TurnValidated:
        return '';
      case GameEventType.TurnPassed:
        return UseHistory.getPassText(event.player);
      case GameEventType.TurnSaved:
        return UseHistory.getSaveText(event.player, event.score, event.words);
    }
  }

  private createEventKey(index: number): number {
    const total = this.allDisplayedEvents.length;
    const start = Math.max(0, total - UseHistory.MAX_DISPLAYED_EVENTS);
    return start + index;
  }

  private isEventDisplayed(event: GameEvent): boolean {
    return event.type === GameEventType.TurnPassed || event.type === GameEventType.TurnSaved;
  }
}
