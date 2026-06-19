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
  },
  {
    id: "ollama-deepseek-v4-flash",
    label: "DeepSeek V4 Flash",
    provider: "ollama",
    model: "deepseek-v4-flash:cloud",
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
