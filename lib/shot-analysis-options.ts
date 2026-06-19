export const tastes = ["sour", "bitter", "both", "balanced"] as const;

export type Taste = (typeof tastes)[number];

export const roastLevels = ["light", "medium", "dark"] as const;

export type RoastLevel = (typeof roastLevels)[number];

export const shotAnalysisModels = [
  {
    id: "ollama-gemma4-31b",
    label: "Ollama Cloud: gemma4:31b",
    provider: "ollama",
    model: "gemma4:31b",
  },
  {
    id: "ollama-deepseek-v4-flash",
    label: "Ollama Cloud: deepseekv4 flash",
    provider: "ollama",
    model: "deepseek-v4-flash:cloud",
  },
  {
    id: "openai-gpt-5-4-mini",
    label: "OpenAI: GPT-5.4 mini",
    provider: "openai",
    model: "gpt-5.4-mini",
  },
] as const;

export type ShotAnalysisModel = (typeof shotAnalysisModels)[number];

export type ShotAnalysisModelId = ShotAnalysisModel["id"];
