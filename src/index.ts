import Application from '@/application/index.ts';
import { GameMatchDifficulty, GameMatchSettings, GameMatchType } from '@/application/types/index.ts';
import Infrastructure from '@/infrastructure/index.ts';

const DEFAULT_SETTINGS: GameMatchSettings = {
  difficulty: GameMatchDifficulty.Low,
  type: GameMatchType.Classic,
};

export default async function launchWords(): Promise<Application> {
  const dependencies = Infrastructure.createAppDependencies();
  const persistedSettings = dependencies.repositories.settings.load();
  const settings: GameMatchSettings = {
    difficulty: persistedSettings?.difficulty ?? DEFAULT_SETTINGS.difficulty,
    type: persistedSettings?.type ?? DEFAULT_SETTINGS.type,
  };
  return await Application.create(dependencies, settings);
}
