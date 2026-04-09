import { IdentityService } from '@/domain/types.ts';

export default class CryptoIdentityService implements IdentityService {
  createUniqueId(): string {
    return crypto.randomUUID();
  }
}
