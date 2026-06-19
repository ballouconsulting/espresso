export const tastes = ["sour", "bitter", "both", "balanced"] as const;

export type Taste = (typeof tastes)[number];

export const roastLevels = ["light", "medium", "dark"] as const;

export type RoastLevel = (typeof roastLevels)[number];

export const shotAnalysisModels = [
  {
    id: "ollama-gemma4-31b",
    label: "Gemma 4 31B",
    provider: "ollama",
    model: "gemma4:31b",
    think: true,
  },
  {
    id: "ollama-nemotron-3-super",
    label: "Nemotron 3 Super",
    provider: "ollama",
    model: "nemotron-3-super:cloud",
    think: true,
  },
  {
    id: "openai-gpt-5-4-mini",
    label: "GPT-5.4 Mini",
    provider: "openai",
    model: "gpt-5.4-mini",
  },
] as const;

export type ShotAnalysisModel = (typeof shotAnalysisModels)[number];

export type ShotAnalysisModelId = ShotAnalysisModel["id"];
