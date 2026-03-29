import { IdGenerator } from '@/domain/ports.ts';

export default class CryptoIdGenerator implements IdGenerator {
  execute(): string {
    return crypto.randomUUID();
  }
}
