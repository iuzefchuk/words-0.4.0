export type IdentifierGateway = {
  create(): string;
};

export type RandomizerGateway = {
  createFunctionFromSeed(seed: number): () => number;
  createNewSeed(): number;
};
