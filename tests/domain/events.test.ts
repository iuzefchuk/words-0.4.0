import { describe, it, expect } from 'vitest';
import { DomainEventCollector, DomainEvent } from '@/domain/events.ts';

describe('DomainEventCollector', () => {
  it('starts empty', () => {
    const collector = new DomainEventCollector();
    expect(collector.drain()).toEqual([]);
  });

  it('collects raised events', () => {
    const collector = new DomainEventCollector();
    collector.raise(DomainEvent.TilePlaced);
    collector.raise(DomainEvent.TurnSaved);
    expect(collector.drain()).toEqual([DomainEvent.TilePlaced, DomainEvent.TurnSaved]);
  });

  it('drain clears events', () => {
    const collector = new DomainEventCollector();
    collector.raise(DomainEvent.TilePlaced);
    collector.drain();
    expect(collector.drain()).toEqual([]);
  });

  it('preserves order', () => {
    const collector = new DomainEventCollector();
    collector.raise(DomainEvent.TilesShuffled);
    collector.raise(DomainEvent.TurnPassed);
    collector.raise(DomainEvent.GameWon);
    const events = collector.drain();
    expect(events).toEqual([DomainEvent.TilesShuffled, DomainEvent.TurnPassed, DomainEvent.GameWon]);
  });
});
