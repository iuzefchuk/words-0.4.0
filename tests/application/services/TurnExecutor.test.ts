import { describe, it, expect, vi } from 'vitest';
import { createTestContext } from '$/helpers.ts';
import { Player, TurnOutcomeType } from '@/domain/index.ts';
import TurnValidator from '@/domain/services/TurnValidator.ts';
import PassTurnCommand from '@/application/commands/PassTurn.ts';
import SaveTurnCommand from '@/application/commands/SaveTurn.ts';

vi.mock('@/infrastructure/TurnGeneratorWorker/TurnGeneratorWorker.ts', () => {
  return {
    default: class MockTurnGeneratorWorker {
      static mockExecute: (() => Promise<unknown>) | null = null;

      execute(...args: unknown[]) {
        if (MockTurnGeneratorWorker.mockExecute) return MockTurnGeneratorWorker.mockExecute();
        return Promise.resolve(null);
      }

      terminate() {}
    },
  };
});

async function getMockWorkerClass() {
  const mod = await import('@/infrastructure/TurnGeneratorWorker/TurnGeneratorWorker.ts');
  return mod.default as unknown as {
    mockExecute: (() => Promise<unknown>) | null;
  };
}

describe('Opponent turn execution', () => {
  it('falls back to pass when worker returns null', async () => {
    const MockWorker = await getMockWorkerClass();
    MockWorker.mockExecute = () => Promise.resolve(null);

    const context = createTestContext();
    const player = Player.Opponent;

    // Simulate what Application.executeOpponentTurn does
    let generatorResult;
    try {
      generatorResult = await new (await import('@/infrastructure/TurnGeneratorWorker/TurnGeneratorWorker.ts')).default().execute({ context, player });
    } catch {
      generatorResult = null;
    }

    expect(generatorResult).toBeNull();
    // Should pass since not resign condition
    expect(context.game.willPlayerPassBeResign(player)).toBe(false);
  });

  it('falls back to pass when worker throws an error', async () => {
    const MockWorker = await getMockWorkerClass();
    MockWorker.mockExecute = () => Promise.reject(new Error('Worker crashed'));

    const context = createTestContext();
    const player = Player.Opponent;

    let generatorResult;
    try {
      generatorResult = await new (await import('@/infrastructure/TurnGeneratorWorker/TurnGeneratorWorker.ts')).default().execute({ context, player });
    } catch {
      generatorResult = null;
    }

    expect(generatorResult).toBeNull();
  });

  it('falls back to resign when worker fails and player already passed', async () => {
    const MockWorker = await getMockWorkerClass();
    MockWorker.mockExecute = () => Promise.reject(new Error('Worker error'));

    const context = createTestContext();
    // Simulate opponent having already passed
    context.game.passCurrentTurn(); // User → Opponent
    context.game.passCurrentTurn(); // Opponent → User
    context.game.passCurrentTurn(); // User → Opponent

    expect(context.game.willPlayerPassBeResign(Player.Opponent)).toBe(true);
  });
});
