import {
  GameDictionary,
  GameGeneratorContextData,
  GameGeneratorPartition,
  GamePlayer,
  GameTurnGenerator,
} from '@/application/types/index.ts';
import { WorkerRequestType, WorkerResponseType } from '@/application/types/ports.ts';
import Dictionary from '@/domain/models/dictionary/Dictionary.ts';
import { DictionaryBuffer } from '@/domain/models/dictionary/types.ts';
import { GeneratorResult } from '@/domain/services/generation/turn/types.ts';

type StreamInput = {
  attemptsLimit: number;
  buffer: DictionaryBuffer;
  partition?: GameGeneratorPartition;
  player: GamePlayer;
} & GameGeneratorContextData;

class TurnGenerationHandler {
  private dictionary: Dictionary | null = null;

  handleMessage(event: MessageEvent<{ input: unknown; type: string }>): void {
    if (event.data.type === (WorkerRequestType.Init as string)) {
      this.init(event.data.input as DictionaryBuffer);
    } else {
      this.stream(event.data.input as StreamInput);
    }
  }

  private findBestResult(input: StreamInput): GeneratorResult | null {
    const dictionary = this.dictionary ?? GameDictionary.createFromBuffer(input.buffer);
    const context = GameTurnGenerator.hydrateContext(input, dictionary);
    let bestResult: GeneratorResult | null = null;
    let bestScore = -1;
    let count = 0;
    for (const result of GameTurnGenerator.execute(context, input.player, input.partition)) {
      if (result.validationResult.score > bestScore) {
        bestResult = result;
        bestScore = result.validationResult.score;
      }
      if (++count >= input.attemptsLimit) break;
    }
    return bestResult;
  }

  private init(buffer: DictionaryBuffer): void {
    this.dictionary = GameDictionary.createFromBuffer(buffer);
    self.postMessage({ type: WorkerResponseType.Ready });
  }

  private stream(input: StreamInput): void {
    const bestResult = this.findBestResult(input);
    if (bestResult !== null) {
      self.postMessage({ type: WorkerResponseType.Result, value: bestResult });
    }
    self.postMessage({ type: WorkerResponseType.Done });
  }
}

const handler = new TurnGenerationHandler();

self.onmessage = (event: MessageEvent<{ input: unknown; type: string }>) => {
  try {
    handler.handleMessage(event);
  } catch (error) {
    self.postMessage({ error: String(error), type: WorkerResponseType.Error });
  }
};
