import { AppDependencies } from '@/application/types/index.ts';
import TurnGenerationWorker from '@/application/workers/turnGeneration.worker.ts?worker';
import IndexedDbEventRepository from '@/infrastructure/repositories/IndexedDbEventRepository.ts';
import LocalStorageSettingsRepository from '@/infrastructure/repositories/LocalStorageSettingsRepository.ts';
import AsyncSchedulingService from '@/infrastructure/services/AsyncSchedulingService.ts';
import CryptoIdentityService from '@/infrastructure/services/CryptoIdentityService.ts';
import CryptoSeedingService from '@/infrastructure/services/CryptoSeedingService.ts';
import FetchFileService from '@/infrastructure/services/FetchFileService.ts';
import VersioningService from '@/infrastructure/services/VersioningService.ts';
import WebWorkerService from '@/infrastructure/services/WebWorkerService.ts';

export default class Infrastructure {
  private static readonly DICTIONARY_URL = '/dictionary.bin';

  static createAppDependencies(): AppDependencies {
    const version = new VersioningService().getAppVersion();
    const identity = new CryptoIdentityService();
    const turnGenerationTaskId = identity.createUniqueId();
    return {
      config: { dictionaryUrl: Infrastructure.DICTIONARY_URL },
      repositories: {
        events: new IndexedDbEventRepository(version),
        settings: new LocalStorageSettingsRepository(),
      },
      services: {
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
