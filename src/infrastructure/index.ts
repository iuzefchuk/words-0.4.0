import { AppDependencies } from '@/application/types/index.ts';
import TurnGenerationWorker from '@/application/workers/turnGeneration.worker.ts?worker';
import AsyncSchedulingService from '@/infrastructure/adapters/AsyncSchedulingService.ts';
import CryptoIdentityService from '@/infrastructure/adapters/CryptoIdentityService.ts';
import CryptoSeedingService from '@/infrastructure/adapters/CryptoSeedingService.ts';
import FetchFileService from '@/infrastructure/adapters/FetchFileService.ts';
import MessageChannelObserverService from '@/infrastructure/adapters/MessageChannelObserverService.ts';
import WebWorkerService from '@/infrastructure/adapters/WebWorkerService.ts';
import IndexedDbEventRepository from '@/infrastructure/repositories/IndexedDbEventRepository.ts';
import LocalStorageSettingsRepository from '@/infrastructure/repositories/LocalStorageSettingsRepository.ts';
import VersioningService from '@/infrastructure/services/VersioningService.ts';

export default class Infrastructure {
  private static readonly DICTIONARY_URL = '/dictionary.bin';

  static createAppDependencies(): AppDependencies {
    const version = VersioningService.appVersion;
    const identity = new CryptoIdentityService();
    const turnGenerationTaskId = identity.createUniqueId();
    return {
      config: { dictionaryUrl: Infrastructure.DICTIONARY_URL },
      repositories: {
        events: new IndexedDbEventRepository(version),
        settings: new LocalStorageSettingsRepository(),
      },
      services: {
        bootObserver: new MessageChannelObserverService(),
        file: new FetchFileService(),
        identity,
        scheduling: new AsyncSchedulingService(),
        seeding: new CryptoSeedingService(),
        worker: new WebWorkerService({
          [turnGenerationTaskId]: TurnGenerationWorker,
        }),
      },
      tasks: { turnGeneration: turnGenerationTaskId },
    };
  }
}
