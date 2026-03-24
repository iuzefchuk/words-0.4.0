import { IdGenerator } from '@/shared/ports.ts';

export default class CryptoIdGenerator implements IdGenerator {
  execute(): string {
    return crypto.randomUUID();
  }
}
