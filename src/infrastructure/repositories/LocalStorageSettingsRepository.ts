import { GameMatchSettings } from '@/application/types/index.ts';
import { SettingsRepository } from '@/application/types/repositories.ts';
import LocalStorageGateway from '@/infrastructure/gateways/LocalStorageGateway.ts';

export default class LocalStorageSettingsRepository implements SettingsRepository {
  private static readonly KEY = 'settings';

  load(): null | Partial<GameMatchSettings> {
    return LocalStorageGateway.load(LocalStorageSettingsRepository.KEY) as null | Partial<GameMatchSettings>;
  }

  save(settings: Partial<GameMatchSettings>): void {
    const existing = this.load() ?? {};
    LocalStorageGateway.save(LocalStorageSettingsRepository.KEY, { ...existing, ...settings });
  }
}
