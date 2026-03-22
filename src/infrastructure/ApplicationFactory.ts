import Application from '@/application/index.ts';
import { AppDictionary } from '@/application/types.ts';
import IndexedDbDictionaryFactory from '@/infrastructure/IndexedDbDictionaryFactory.ts';
import IdGenerator from '@/infrastructure/CryptoIdGenerator.ts';
import DateApiClock from '@/infrastructure/DateApiClock.ts';

export default class ApplicationFactory {
  private static dictionary: AppDictionary;

  static async create(): Promise<Application> {
    if (!ApplicationFactory.dictionary) ApplicationFactory.dictionary = await IndexedDbDictionaryFactory.create();
    const idGenerator = new IdGenerator();
    const clock = new DateApiClock();
    return Application.create({ dictionary: ApplicationFactory.dictionary, idGenerator, clock });
  }
}
