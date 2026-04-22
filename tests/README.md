# HOW TO UNIT TEST

Two patterns depending on the class under test:

- **Stateless services** — methods (usually static) that take arguments and return values. No instance state.
- **Stateful classes** — instances whose behavior depends on state built up over method calls.

Thrown-error cases and mutation-testing validation apply to both patterns and are covered at the bottom.

## Stateless services

Follow these steps when writing unit tests for a stateless service.

### 1. Identify entities

Read the file that is being tested and identify the entities. To do so, look at the methods of the class and the arguments they accept — those arguments are your entities.
For example, if the service under test exposes `getTotal(order)`, `applyCoupon(order, coupon)`, and `validate(amount)`, the entities are `order`, `coupon`, and `amount`.

### 2. Define case types

Define one type per entity at the top of the test file. Name them with the plural suffix `Cases` (e.g. `OrderCases`, `CouponCases`, `AmountCases`). You can skip the exact field values until step 3.

### 3. Build the `<Filename>Cases`

Create a `<Filename>Cases` class with one public method per entity (`for<Entity>()`). Use as many private helper methods as you need.
Each cases method contains the entity itself plus one expected value per method where the entity appears as an argument. Name each expected-value field after the noun the method returns, not after the method itself — e.g. in `OrderCases`, an `order` field for the entity, a `total` field for `getTotal(order)`, an `items` field for `listItems(order)`.

#### Reuse fixtures for complex entities

When an entity is a rich type (a class instance, a domain object with its own invariants) rather than a primitive or enum, check `/tests/fixtures/` first — if a builder already produces an instance matching the state you need, reuse it in the Cases record instead of constructing one inline:

```ts
// tests/fixtures/OrderFixtures.ts already exposes OrderFixtures.buildEmpty, OrderFixtures.buildWithItems, ...
static createOrderCases(): ReadonlyArray<OrderCases> {
  return [
    { items: [], order: OrderFixtures.buildEmpty(), total: 0 },
    { items: [item1, item2], order: OrderFixtures.buildWithItems([item1, item2]), total: 20 },
    { items: maxedItems, order: OrderFixtures.buildMaxedOut(), total: 1000 },
  ];
}
```

Only build an entity inline when no fixture fits; in that case add a new builder under `/tests/fixtures/<entity>.ts` so the next test can reuse it.

#### Coverage

Cases must be as extensive as possible. For bounded entities (integers, enums, indices), iterate every value in the valid range — boundaries AND every value in between, not just hand-picked edge cases. For unbounded entities (objects, strings, collections), cover every equivalence class — empty, single, many, boundary states — plus any known edge cases.

#### Skip methods with no logic of their own

If a method's body is just a single-constant comparison (e.g. `value === DEFAULT_VALUE`) or a tiny enum mapping (e.g. `status === Status.Active ? Status.Inactive : Status.Active`), skip it. Any test's expected value can only restate the method's body — the test verifies nothing.
If this leaves an entity with no methods left to test, drop that entity's Cases type and factory method entirely (even though the entity appeared in step 1's list).

#### Do not duplicate the tested logic

The factory must not reimplement the formula it is testing, or the test becomes tautological.
For example, if a method computes `Math.floor(itemIndex / PAGE_SIZE)` to return a page number, do not recompute the same formula in the factory — derive expected values from an alternate representation (e.g. a pre-built list of pages where the page number is the array index). Prefix helpers and locals that build the alternate representation with `Alt` (e.g. `buildAltGrid`, `altPages`) so the alternate model is visually distinct from the tested code's vocabulary.

#### Vitest features

Make extensive use of vitest functionality (mocking, snapshots) when it makes the tests better — never just for the sake of using it.

### 4. Write the tests

Use `describe.each` for every entity to run tests on every case. The `describe.each` label carries the case identity (e.g. `'for order $order.id'`), so individual test names only need to name the action under test (e.g. `'calculates total'`). Together they must pinpoint which case and which method failed.
Keep test descriptions minimal; all the logic lives in `<Filename>Cases`.
Again, use vitest functionality (`beforeAll`, `afterAll`, `beforeEach`, `afterEach`, snapshots) only when it makes the tests better.

#### Mocking

Mock only at external or unstable boundaries — I/O, network, database, filesystem, system clock, randomness, third-party services. Do **not** mock internal collaborators: if the class under test depends on another pure service in the same domain, let the real one run so the test exercises integrated behavior. Mocking internal code replaces the thing you want to verify with a stand-in that always agrees with your assumptions — the test becomes a mirror of the mock, not of reality.

#### Exceptions

For scenarios that don't fit the entity model (multi-step behavior, one-off integration-like checks), write a standalone `test(...)` block outside any `describe.each` and add a short comment explaining why the factory doesn't apply. Error paths have their own pattern — see [Thrown errors](#thrown-errors) below.

## Stateful classes

Stateful classes hold state across method calls. The flow above still applies — identify entities, define Cases types, build the `<Filename>Cases`, write `describe.each` tests — with the modifications below. The coverage, skip-trivial, duplication, and mocking rules all carry over unchanged.

### 1. Identify entities — also include construction

Method arguments are entities as before. **Additionally**, treat the constructor's arguments as a _construction_ entity — the inputs that produce an instance. Cover every equivalence class of construction input (valid, invalid, edge-of-range) the same way you cover method arguments.

### 2. Build (or reuse) fixtures for every meaningful state

**Before writing a new fixture, check `/tests/fixtures/` — if a builder already covers the state you need, reuse it.** Only add a new builder when no existing one fits; every new fixture goes under `/tests/fixtures/<entity>.ts`.

Fixtures are named functions that return pre-constructed instances in distinct, meaningful states:

```ts
// tests/fixtures/cart.ts
export default class CartFixtures {
  static buildEmpty(): Cart {
    return new Cart();
  }

  static buildWithItems(items: ReadonlyArray<Item> = [defaultItem]): Cart {
    const cart = new Cart();
    items.forEach(item => cart.add(item));
    return cart;
  }

  static buildMaxedOut(): Cart {
    /* ... */
  }

  static buildWithDiscount(discount = 0.1): Cart {
    /* ... */
  }
}
```

Aim to cover every state the class can meaningfully be in — empty, single-element, many-elements, at capacity, after a mutation, post-error-recovery, and so on. **Build each fixture entirely through the class's public API**, never by poking private fields; otherwise the fixture starts lying about what's reachable in production.

Cases records then carry a **fixture builder** (not a pre-built instance — every test must get a fresh one) alongside the action under test and the expected post-state values named after the query methods:

```ts
type CartCases = {
  readonly action: (cart: Cart) => void;
  readonly buildCart: () => Cart;
  readonly itemCount: number; // expected result of cart.getItemCount() after action
  readonly name: string;
  readonly total: number; // expected result of cart.getTotal() after action
};
```

### 4. Build from the fixture, assert through the public API

Call the fixture builder inside `beforeEach` — never share instances across cases:

```ts
describe.each(<Filename>Cases.createCartCases())('$name', ({ action, buildCart, itemCount, total }) => {
  let cart: Cart;
  beforeEach(() => {
    cart = buildCart();
  });

  test('updates total', () => {
    action(cart);
    expect(cart.getTotal()).toBe(total);
  });

  test('updates item count', () => {
    action(cart);
    expect(cart.getItemCount()).toBe(itemCount);
  });
});
```

Verify state **only** through the class's public query methods — never by inspecting private fields. Reaching into internals couples the test to the implementation and breaks on every refactor. If the class exposes only mutations with no way to read state back, add public queries first — a class with no observable state isn't really testable.

## Thrown errors

Some methods throw instead of returning. Cover them with a dedicated factory method per entity, alongside the normal Cases:

```ts
type OrderErrorCases = {
  readonly error: new (...args: Array<unknown>) => Error;
  readonly input: Order;
  readonly message?: string | RegExp;
};

class <Filename>Cases {
  static createOrderErrorCases(): ReadonlyArray<OrderErrorCases> {
    return [
      { error: ValidationError, input: malformedOrder, message: /missing total/ },
      // ...
    ];
  }
}

describe.each(<Filename>Cases.createOrderErrorCases())(
  'for malformed order $input.id',
  ({ error, input, message }) => {
    test('throws', () => {
      const act = () => service.validate(input);
      expect(act).toThrow(error);
      if (message !== undefined) expect(act).toThrow(message);
    });
  },
);
```

**Guidelines:**

- **Match on the error _class_, not the full message.** Messages rot under refactors; class contracts don't. Use the optional `message` field only for a short, load-bearing substring or regex — never the full text.
- **For async throws**, assert with `await expect(service.foo(input)).rejects.toThrow(error)`.
- **The skip-trivial rule still applies.** An unconditional `throw new Error('...')` with no branching isn't worth testing — only throws guarded by a real condition (input validation, invariant check) deserve coverage.

## Validate

Applies to tests for **both stateless services and stateful classes**.

To verify your tests actually catch bugs — not just that they pass — run **mutation testing** with Stryker: `npx stryker run`. Stryker automatically modifies the source in small ways (flips operators, inverts conditions, swaps constants, removes calls) and re-runs the suite against each mutation.

- A mutant **killed** by the tests → your suite caught the change (good).
- A mutant that **survives** → tests still pass despite the code being wrong → a gap in your suite.

Surviving mutants point at exactly which lines your tests don't verify. Add cases until they're killed.
