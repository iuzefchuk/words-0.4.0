import {
  AppDependencies,
  AppPlayer,
  AppCell,
  AppTile,
  AppDictionary,
  AppDictionaryProps,
} from '@/application/types.ts';
import IdGenerator from '@/infrastructure/CryptoIdGenerator.ts';
import DateApiClock from '@/infrastructure/DateApiClock.ts';
import IndexedDb from '@/infrastructure/IndexedDb.ts';
import WebWorker from '@/infrastructure/WebWorker.ts';
import AudioSoundPlayer from '@/infrastructure/SoundPlayer.ts';
import { TurnGenerationWorker } from '@/shared/ports.ts';

export default class AppDependenciesFactory {
  private static readonly CACHE_VERSION = 1;
  private static readonly DICTIONARY_WORKER_PATH = './workers/TurnGeneratorWorker.ts';
  private static readonly DICTIONARY_DB_NAME = 'words-dictionary';
  private static readonly DICTIONARY_STORE_NAME = 'props';
  private static readonly DICTIONARY_CACHE_KEY = 'dictionary';

  static async execute(): Promise<AppDependencies> {
    const dictionary = await this.createDictionary();
    const turnGenerationWorker = this.createTurnGenerationWorker();
    const idGenerator = new IdGenerator();
    const clock = new DateApiClock();
    const soundPlayer = new AudioSoundPlayer();
    return { dictionary, turnGenerationWorker, idGenerator, clock, soundPlayer };
  }

  private static async createDictionary(): Promise<AppDictionary> {
    const db = new IndexedDb<AppDictionaryProps>(
      this.DICTIONARY_DB_NAME,
      this.DICTIONARY_STORE_NAME,
      this.DICTIONARY_CACHE_KEY,
    );
    const cache = await db.load(this.CACHE_VERSION);
    if (cache) {
      const dictionary = AppDictionary.restoreFromProps(cache);
      if (dictionary) return dictionary;
    }
    const dictionary = AppDictionary.create();
    db.save(this.CACHE_VERSION, dictionary[this.DICTIONARY_STORE_NAME]);
    return dictionary;
  }

  private static createTurnGenerationWorker(): TurnGenerationWorker<AppPlayer, AppTile, AppCell> {
    return WebWorker.create<
      { domain: unknown; player: AppPlayer },
      { tiles: ReadonlyArray<AppTile>; cells: ReadonlyArray<AppCell> }
    >(AppDependenciesFactory.DICTIONARY_WORKER_PATH);
  }
}
