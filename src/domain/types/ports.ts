export type IdentifierService = {
  create(): string;
};

export type RandomizerService = {
  createFunctionFromSeed(seed: number): () => number;
  createNewSeed(): number;
};
