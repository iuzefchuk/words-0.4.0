import TurnGenerator from '@/application/services/TurnGenerator.ts';
import TurnDirector from '@/application/services/TurnDirector.ts';
import Board from '@/domain/models/Board.ts';
import Dictionary from '@/domain/models/Dictionary.ts';
import Inventory from '@/domain/models/Inventory.ts';
import { TurnGeneratorWorkerRequest } from './TurnGeneratorWorker.ts';

self.onmessage = (event: MessageEvent<TurnGeneratorWorkerRequest>) => {
  const { context, player } = event.data;
  Board.hydrate(context.board);
  Dictionary.hydrate(context.dictionary);
  Inventory.hydrate(context.inventory);
  TurnDirector.hydrate(context.turnDirector);
  for (const result of TurnGenerator.execute(context, player)) return self.postMessage({ return: result });
  self.postMessage({ return: null });
};
