import { AppDependencies } from '@/application/types/index.ts';
import TurnGenerationWorker from '@/application/workers/turnGeneration.worker.ts?worker';
import BrowserSchedulerGateway from '@/infrastructure/gateways/BrowserSchedulerGateway.ts';
import CryptoIdentifierGateway from '@/infrastructure/gateways/CryptoIdentifierGateway.ts';
import HttpLoaderGateway from '@/infrastructure/gateways/HttpLoaderGateway.ts';
import Mulberry32RandomizerGateway from '@/infrastructure/gateways/Mulberry32RandomizerGateway.ts';
import WebWorkerGateway from '@/infrastructure/gateways/WebWorkerGateway.ts';
import CallbackBootProgressPublisher from '@/infrastructure/publishers/CallbackBootProgressPublisher.ts';
import IndexedDbEventRepository from '@/infrastructure/repositories/IndexedDbEventRepository.ts';
import LocalStorageSettingsRepository from '@/infrastructure/repositories/LocalStorageSettingsRepository.ts';
import { appVersion } from '@/infrastructure/version.ts';

export default class DependenciesFactory {
  private static readonly DICTIONARY_URL = '/dictionary.bin';

  static create(): AppDependencies {
    const turnGenerationTaskId = CryptoIdentifierGateway.create();
    return {
      config: { dictionaryUrl: DependenciesFactory.DICTIONARY_URL },
      repositories: {
        events: new IndexedDbEventRepository(appVersion),
        settings: new LocalStorageSettingsRepository(),
      },
      services: {
        bootProgressPublisher: new CallbackBootProgressPublisher(),
        identifier: CryptoIdentifierGateway,
        loader: HttpLoaderGateway,
        randomizer: Mulberry32RandomizerGateway,
        scheduler: BrowserSchedulerGateway,
        worker: new WebWorkerGateway({ [turnGenerationTaskId]: TurnGenerationWorker }),
      },
      tasks: { turnGeneration: turnGenerationTaskId },
    };
  }
}
