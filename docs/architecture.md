# Architecture

This codebase follows Domain-Driven Design with four layers under `src/`:

```
interface  ──▶  application  ──▶  domain  ◀──  infrastructure
```

Dependencies point inward: `interface` calls `application`, `application` calls
`domain`, and `infrastructure` implements ports declared by `domain` and
`application`. The `domain` layer has no outward dependencies.

## Aggregate boundaries

`Game` (`src/domain/Game.ts`) is the **only aggregate root**. All state changes
go through it and are recorded in its event log.

The following are **internal entities of the `Game` aggregate** — they are not
aggregate roots and must not be persisted, referenced by ID, or mutated from
outside `Game`:

- `Match` (`src/domain/models/match/Match.ts`) — settings, scores, results.
- `Board` (`src/domain/models/board/Board.ts`) — cell grid, bonuses, placements.
- `Inventory` (`src/domain/models/inventory/Inventory.ts`) — tile pools.
- `Turns` (`src/domain/models/turns/Turns.ts`) — current turn and history.
- `Events` (`src/domain/events/Events.ts`) — append-only event log.

Cross-entity consistency is enforced inside `Game` via `applyEvent`, which
applies the event to internal state and then records it. State outside the
aggregate is referenced by identity only:

- Players: `GamePlayer` enum.
- Tiles: opaque `GameTile` string identifiers.
- Cells: numeric `GameCell` indices.
- Turns: identity assigned via `IdentityService`.

`Dictionary` is a value object loaded by infrastructure and injected into
`Game.setDictionary`; it is read-only and not part of the persisted state.

### Mutation rule

Internal entities never expose public setters that bypass the event log. The
only path to mutate game state is:

1. A command method on `Game` (e.g. `changeMatchDifficulty`).
2. `Game.applyEvent` builds the event and routes to `Game.applyToState`.
3. `applyToState` calls a narrowly-scoped `apply…` method on the entity
   (e.g. `Match.applyDifficultyChange`).
4. The event is appended to the log.

This is what keeps event-sourced replay (`Game.createFromEvents`) consistent
with live execution.

## Ports and adapters

Ports are interfaces consumed by inner layers and implemented by
`infrastructure/`. Placement follows the **layer that depends on them** rule:

- **Domain ports** — `src/domain/types/ports.ts` — used by domain code.
  - `IdentityService` (turn IDs).
  - `SeedingService` (deterministic randomness for board / inventory).

- **Application ports** — `src/application/types/ports.ts` — used by
  application services to orchestrate use cases without knowing about the host
  environment.
  - `SchedulingService` (defer / debounce work).
  - `WorkerService` (off-thread turn generation).

- **Repositories** — `src/application/types/repositories.ts` — own the
  persistence contract for the application layer.
  - `EventRepository` (append-only event log persistence).
  - `SettingsRepository` (user-preferred match settings).

If a port is needed by domain code, declare it in `domain/types/ports.ts`.
If only application services need it, declare it in `application/types/ports.ts`.
Never import `infrastructure/*` from `domain/*` or `application/*`.

## Event sourcing

`Game` state is derived from a stream of `GameEvent`s persisted by
`IndexedDbEventRepository`. The repository combines the application build
version with an internal **event-schema version** to invalidate the cache when
either changes; this lets event shapes evolve independently of app releases.
