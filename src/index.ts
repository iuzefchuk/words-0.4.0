import Application from '@/application/index.ts';
import { GameMatchDifficulty, GameMatchSettings, GameMatchType } from '@/application/types/index.ts';
import { BootProgressPublisher } from '@/application/types/ports.ts';
import DependenciesFactory from '@/infrastructure/factories/DependenciesFactory.ts';

const DEFAULT_SETTINGS: GameMatchSettings = {
  difficulty: GameMatchDifficulty.Low,
  type: GameMatchType.Classic,
};

export default function launchWords(): {
  app: Promise<Application>;
  bootProgressPublisher: Pick<BootProgressPublisher, 'subscribe'>;
} {
  const dependencies = DependenciesFactory.create();
  const persistedSettings = dependencies.repositories.settings.load();
  const settings: GameMatchSettings = {
    difficulty: persistedSettings?.difficulty ?? DEFAULT_SETTINGS.difficulty,
    type: persistedSettings?.type ?? DEFAULT_SETTINGS.type,
  };
  return {
    app: Application.create(dependencies, settings),
    bootProgressPublisher: dependencies.services.bootProgressPublisher,
  };
}
