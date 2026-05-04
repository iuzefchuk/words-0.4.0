import Application from '@/application/index.ts';
import { GameMatchDifficulty, GameMatchSettings, GameMatchType } from '@/application/types/index.ts';
import { ObserverService } from '@/application/types/ports.ts';
import Infrastructure from '@/infrastructure/index.ts';

const DEFAULT_SETTINGS: GameMatchSettings = {
  difficulty: GameMatchDifficulty.Low,
  type: GameMatchType.Classic,
};

export default function launchWords(): { app: Promise<Application>; bootObserver: Pick<ObserverService, 'observe'> } {
  const dependencies = Infrastructure.createAppDependencies();
  const persistedSettings = dependencies.repositories.settings.load();
  const settings: GameMatchSettings = {
    difficulty: persistedSettings?.difficulty ?? DEFAULT_SETTINGS.difficulty,
    type: persistedSettings?.type ?? DEFAULT_SETTINGS.type,
  };
  return { app: Application.create(dependencies, settings), bootObserver: dependencies.services.bootObserver };
}
