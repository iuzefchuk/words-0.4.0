import { AppDependencies } from '@/application/types/index.ts';
import TurnGenerationWorker from '@/application/workers/turnGeneration.worker.ts?worker';
import IdentifierServiceAdapter from '@/infrastructure/adapters/IdentifierServiceAdapter.ts';
import LoaderServiceAdapter from '@/infrastructure/adapters/LoaderServiceAdapter.ts';
import ObserverServiceAdapter from '@/infrastructure/adapters/ObserverServiceAdapter.ts';
import RandomizerServiceAdapter from '@/infrastructure/adapters/RandomizerServiceAdapter.ts';
import SchedulerServiceAdapter from '@/infrastructure/adapters/SchedulerServiceAdapter.ts';
import WorkerServiceAdapter from '@/infrastructure/adapters/WorkerServiceAdapter.ts';
import IndexedDbEventRepository from '@/infrastructure/repositories/IndexedDbEventRepository.ts';
import LocalStorageSettingsRepository from '@/infrastructure/repositories/LocalStorageSettingsRepository.ts';
import VersioningService from '@/infrastructure/services/VersioningService.ts';

export default class Infrastructure {
  private static readonly DICTIONARY_URL = '/dictionary.bin';

  static createAppDependencies(): AppDependencies {
    const version = VersioningService.appVersion;
    const turnGenerationTaskId = IdentifierServiceAdapter.create();
    return {
      config: { dictionaryUrl: Infrastructure.DICTIONARY_URL },
      repositories: {
        events: new IndexedDbEventRepository(version),
        settings: new LocalStorageSettingsRepository(),
      },
      services: {
        bootObserver: new ObserverServiceAdapter(),
        identifier: IdentifierServiceAdapter,
        loader: LoaderServiceAdapter,
        randomizer: RandomizerServiceAdapter,
        scheduler: SchedulerServiceAdapter,
        worker: new WorkerServiceAdapter({ [turnGenerationTaskId]: TurnGenerationWorker }),
      },
      tasks: { turnGeneration: turnGenerationTaskId },
    };
  }
}
