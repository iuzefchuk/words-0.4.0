# HOW TO UNIT TEST

Two shapes of class under test:

- **Stateless services** — methods that take arguments and return values.
- **Stateful classes** — instances whose behavior depends on accumulated state.

The same flow applies to both. Where it differs, notes appear inline.

**Every section below is required.** A test file isn't complete until every rule applies — "Vitest passes" means tests ran, not that they catch bugs. If any rule can't be met, say so explicitly; don't skip silently.

Mutation testing with [Stryker](https://stryker-mutator.io/) is the final check — §6 has the details; §2–§3 reference it in passing.

## 0. Examine file structure

```ts
// intentional gaps - created in §5

type <Entity>PositiveCases = { ... }; // - created in §2
type <Entity>NegativeCases = { ... }; // - created in §2

class <Filename>Cases {
  static for<Entity>Positive(): ReadonlyArray<<Entity>PositiveCases> { ... }
  static for<Entity>Negative(): ReadonlyArray<<Entity>NegativeCases> { ... }
  // private static helpers with neutral names
} // - created in §3

describe('<Filename>', () => {
  describe.each(<Filename>Cases.for<Entity>Positive())('for $...', (fields) => { ... });
  describe.each(<Filename>Cases.for<Entity>Negative())('for invalid $...', (fields) => { ... });
  // standalone test(...) for exceptions
}); // - created in §4
```

Each section below fills in one part of this shape.

## 1. Identify entities

**Entities are method arguments or constructor arguments (if it's public). Nothing else.** Walk each public method (including the constructor, for stateful classes) and list its parameters. Cover each one's equivalence classes (valid, invalid, edge-of-range).

A zero-argument public method has no entity — it falls into [Exceptions](#exceptions) with a standalone `test(...)`.

### What is NOT an entity

- Return values, or types nested in them.
- Private state, cached values, internal constants.
- Test groupings (those are scopes; they live in the case name's `<Scope>` suffix).

If the instinct says "iterate every X in the output", that's a factory-built field, not a new `*Cases`.

## 2. Define case types

`<Entity><Positive|Negative><Scope?>Cases`:

- **`<Entity>`** — capitalized argument name; sorts related cases together.
- **`<Positive|Negative>`** — always present. Positive = valid inputs, expected output. Negative = invalid inputs, expected throw.
- **`<Scope>`** — optional; names a Positive sub-group that needs its own factory and `describe.each`. Use it when one entity has multiple Positive test groups with different case fields. See `BonusService.test.ts`, which splits the `Type` entity into four Positive scopes (`Single`, `Preset`, `Random`, `Pair`) plus a separate `Negative`.

Each case holds only the fields the consuming describe block uses.

For **stateful cases** whose tests apply a mutating action, the record carries a **fixture builder** (not a pre-built instance — every test needs a fresh one), plus the action and expected post-state values named after the query methods.

### Positive cases

A Positive case carries the input and each expected output named after the method's return noun. Example from `LayoutService.test.ts` — one `Cell` input, one expected field per query method:

```ts
type CellPositiveCases = {
  readonly adjacentCells: ReadonlyArray<Cell>;
  readonly cell: Cell;
  readonly column: number;
  readonly isBottomEdge: boolean;
  readonly isLeftEdge: boolean;
  readonly isRightEdge: boolean;
  readonly isTopEdge: boolean;
  readonly row: number;
};
```

### Negative cases

A Negative case carries the error class, the arguments that trigger it, and an optional substring/regex. Example from `LayoutService.test.ts`:

```ts
type CellNegativeCases = {
  readonly cell: Cell;
  readonly error: new (...args: Array<unknown>) => Error;
  readonly message?: RegExp | string;
};
```

- Match on the error **class**, not the full message. Messages rot; class contracts don't. Use `message` only for a short load-bearing substring or regex.
- For async, assert with `await expect(service.foo(input)).rejects.toThrow(error)`.

## 3. Build the `<Filename>Cases`

One factory per case type, co-located in the test file as static methods on a `<Filename>Cases` class: `for<Entity><Positive|Negative><Scope?>()` returning `ReadonlyArray<<Entity><Positive|Negative><Scope?>Cases>`. Private helpers use neutral/data-structure vocabulary — never the tested code's domain terms.

```ts
// good — neutral structural helper
private static buildIndexMatrix(): ReadonlyArray<ReadonlyArray<number>> { ... }

// bad — reuses "layout" from the class under test
private static buildAltLayout(): ReadonlyArray<ReadonlyArray<Cell>> { ... }
```

### Don't call the method under test inside the factory

Factories return inputs; tests make the calls. If the factory calls the method under test to precompute an expected field, any mutation that makes that method throw also breaks setup. Stryker scores setup failures as Survived.

**To break the "compare output to itself" tautology,** store the expected output as a fixture under `/tests/fixtures/` and compare against it. Static data is untouched by mutation, so any output change fails the test.

### Carry data, not assertions

Fields are values a test feeds into a standard matcher: `expect(serviceCall(...)).matcher(caseField)`. Never embed assertion closures — they hide intent and route failures to the factory.

Name each field after the noun the method returns (`order`, `total`, `items`), not after the method.

For invariant tests (symmetry, ordering, bookkeeping) with no scalar expected value, pre-compute the data the invariant iterates over as a field; the test walks it and asserts each step with a standard matcher.

### Avoid branching in test bodies

If a test would read `if (x) expect(a).toEqual(b); else expect(a).not.toEqual(b)`, restructure. Either split into two factories with distinct assertion shapes, or keep one factory carrying separate inputs per direction.

### Fixtures for complex entities

For rich types (class instances, domain objects with their own invariants), check `/tests/fixtures/` first. Only add a new builder when no existing one fits; new fixtures live under `/tests/fixtures/<entity>.ts`.

**Build each fixture entirely through the class's public API** — never poke private fields, or the fixture starts lying about what's reachable in production. Cover every meaningful state: empty, single-element, many-elements, at capacity, after a mutation, post-error-recovery, and so on.

### Coverage

Bounded entities (integers, enums, indices): iterate every value in range. Unbounded (objects, strings, collections): cover every equivalence class plus known edges.

### Skip methods with no logic of their own

Single-constant comparisons and tiny enum mappings — skip them. The expected value can only restate the body. If an entity has no testable methods left, drop its cases.

### Do not duplicate the tested logic

Factories must not reimplement the formula being tested. Derive expected values from an alternate representation.

Concrete example — `LayoutService` maps a flat `Cell` index to row/column/edge/neighbor via arithmetic (`%`, `Math.floor`, offset math). The factory instead builds a 2D matrix by chunking `[0..N²-1]` into rows of length N with a plain reducer (`buildIndexMatrix`), then reads row/column from the array position and edges from boundary comparisons (`row === 0`, `column === matrixRow.length - 1`). Neighbors come from a 4-direction lookup (`getOrthogonalNeighbors`) on that matrix. Same cells, structurally different derivation — mutations to the production arithmetic don't alter the matrix-based expected values, so any formula change fails the test.

**Exception — invariant tests.** When the test verifies a property rather than a scalar return, encoding that property is fine — the property is the spec.

### Vitest features

Use them when they make tests better — not for their own sake.

## 4. Write the tests

`describe.each` per factory. Label carries case identity (`'for $type'`); test name states the action. Keep bodies minimal — one matcher per test, reading case fields.

For **stateful cases with builders**, call the builder inside `beforeEach` — never share instances across cases. Verify state only through public query methods — never private fields. If a class has no queries, add them; state with no observable surface isn't testable.

**Overlapping labels are fine.** Multiple factories iterating the same entity can produce the same describe label; Vitest renders them side by side and the inner test names disambiguate.

See `BonusService.test.ts` and `LayoutService.test.ts` for the full shape.

### Mocking

External or unstable boundaries only — I/O, network, filesystem, clocks, randomness, third-party services. Never mock internal collaborators in the same domain: the test becomes a mirror of the mock.

### Exceptions

Scenarios that don't fit the entity model go in a standalone `test(...)` with a short comment. Error paths use the [Negative cases](#negative-cases) from step 2.

## 5. Document intentional gaps

Step 5 in the authoring order, line 1 in the file — write this section last, but place it as the first non-import line. One or two lines stating what the tests don't verify. Decisions, not TODOs. A long list means the tests are under-specified — push back.

```ts
// test does not verify exact positions of preset bonuses, nor exact per-type counts
```

## 6. Test the tests

Run `npx stryker run --mutate <path-to-source>` scoped to the file. Scoped runs finish in seconds to a minute.

- **Killed** — good.
- **Survived** — gap.
- **No coverage** — no test executed this line. Expected for methods skipped per §3 ("Skip methods with no logic of their own"); otherwise it's a gap — add a case that exercises the path.

For every survivor, one of:

1. A new case kills it. Re-run to confirm.
2. A one-sentence justification. Acceptable categories include: unreachable error guard, deliberate invariant-only trade-off, static-initializer writing to dead cache entries, equivalent mutation (same runtime behavior), module-load-error (Stryker can't score class-init failures).

Report back in chat after a Stryker run with: the score, the survivor count, and each survivor's category. "I ran Stryker, moved on" isn't acceptable.

### Don't refactor the source just to improve the score

Rearranging source to make more mutations scorable often backfires — what was "Survived because Stryker couldn't score it" becomes "Survived because tests genuinely can't tell the difference." Source changes are for correctness or clarity, not Stryker-wrangling.

## 7. Source refactor suggestions

Once the criteria are met, scan the survivor list one more time with a different lens: **are any survivors symptoms of small source smells?** Dead defensive code, clever workarounds for missing defaults, patterns that exist only to satisfy the type checker in states that can't happen — if removing them is independently justified (clearer code, simpler API, no Stryker in the motivation), do it and the mutation kill comes free.

Don't chase:

- Module-load-error survivors — fixes here usually trade one kind of Survived for another.
- Mutations inside skip-trivial methods — ceremony for genuinely trivial code.
- Anything that widens the public API for test visibility — defeats the purpose of mutation testing.

**Rule of thumb:** if you can't explain the source change without mentioning Stryker, don't make it.
