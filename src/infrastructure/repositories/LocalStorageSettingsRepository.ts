import { GameMatchSettings } from '@/application/types/index.ts';
import { SettingsRepository } from '@/application/types/repositories.ts';
import LocalStorageService from '@/infrastructure/services/LocalStorageService.ts';

export default class LocalStorageSettingsRepository implements SettingsRepository {
  private static readonly KEY = 'settings';

  load(): null | Partial<GameMatchSettings> {
    return LocalStorageService.load(LocalStorageSettingsRepository.KEY) as null | Partial<GameMatchSettings>;
  }

  save(settings: Partial<GameMatchSettings>): void {
    const existing = this.load() ?? {};
    LocalStorageService.save(LocalStorageSettingsRepository.KEY, { ...existing, ...settings });
  }
}
