import { describe, it, expect, vi } from 'vitest';
import { createTestContext, cellIndex } from '$/helpers.ts';
import { Player } from '@/domain/enums.ts';
import { TurnOutcomeType } from '@/domain/models/TurnTracker.ts';
import TurnExecutor from '@/application/services/TurnExecutor.ts';

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

describe('TurnExecutor', () => {
  it('falls back to pass when worker returns null', async () => {
    const MockWorker = await getMockWorkerClass();
    MockWorker.mockExecute = () => Promise.resolve(null);

    const context = createTestContext();
    const executor = new TurnExecutor();
    const outcome = await executor.execute(context, Player.Opponent);

    expect(outcome.type).toBe(TurnOutcomeType.Pass);
    executor.terminate();
  });

  it('falls back to pass when worker throws an error', async () => {
    const MockWorker = await getMockWorkerClass();
    MockWorker.mockExecute = () => Promise.reject(new Error('Worker crashed'));

    const context = createTestContext();
    const executor = new TurnExecutor();
    const outcome = await executor.execute(context, Player.Opponent);

    expect(outcome.type).toBe(TurnOutcomeType.Pass);
    executor.terminate();
  });

  it('falls back to pass when worker times out', async () => {
    const MockWorker = await getMockWorkerClass();
    MockWorker.mockExecute = () => Promise.reject(new Error('Worker timed out'));

    const context = createTestContext();
    const executor = new TurnExecutor();
    const outcome = await executor.execute(context, Player.Opponent);

    expect(outcome.type).toBe(TurnOutcomeType.Pass);
    executor.terminate();
  });

  it('falls back to resign when worker fails and player already passed', async () => {
    const MockWorker = await getMockWorkerClass();
    MockWorker.mockExecute = () => Promise.reject(new Error('Worker error'));

    const context = createTestContext();
    // Simulate opponent having already passed once
    context.turnDirector.passCurrentTurn(); // User → Opponent (records User pass)
    context.turnDirector.passCurrentTurn(); // Opponent → User (records Opponent pass)
    context.turnDirector.passCurrentTurn(); // User → Opponent (records User pass, 2nd consecutive)

    const executor = new TurnExecutor();
    const outcome = await executor.execute(context, Player.Opponent);

    expect(outcome.type).toBe(TurnOutcomeType.Resign);
    executor.terminate();
  });
});
