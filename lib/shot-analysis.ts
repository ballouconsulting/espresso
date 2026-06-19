import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOllama } from "@langchain/ollama";
import { ChatOpenAI } from "@langchain/openai";
import {
  apiErrorResponse,
  ApiError,
  finiteNumber,
  readJsonObject,
} from "./api.ts";
import {
  encodeShotAnalysisStreamEvent,
  streamPartsFromChunk,
} from "./shot-analysis-stream.ts";
import {
  roastLevels,
  shotAnalysisModels,
  tastes,
  type RoastLevel,
  type ShotAnalysisModel,
  type Taste,
} from "./shot-analysis-options.ts";

export type ShotAnalysisInput = {
  doseGrams: number;
  yieldGrams: number;
  timeSeconds: number;
  model: ShotAnalysisModel;
  ratio: number;
  taste?: Taste;
  roastLevel?: RoastLevel;
  brewTemperatureF?: number;
  elevationFeet?: number;
  notes?: string;
};

type ShotAnalysisClient = {
  stream(
    messages: Array<SystemMessage | HumanMessage>,
    options?: {
      runName?: string;
      tags?: string[];
      metadata?: Record<string, string | number | boolean>;
      signal?: AbortSignal;
    },
  ): Promise<AsyncIterable<unknown>> | AsyncIterable<unknown>;
};

type ShotAnalysisClientFactory = (model: ShotAnalysisModel) => ShotAnalysisClient;

const systemPrompt = `You are an expert home espresso dial-in coach.

Analyze one espresso shot from the user's measurements and optional context. The request is stateless: do not assume prior shots or conversation history.

Be concise, practical, and specific for a home barista. Use dose, yield, and time to calculate ratio and assess pace, then let taste and context refine the diagnosis when present. If optional fields are missing, say what can be inferred and avoid inventing details.

Return plain text with exactly this structure:
Snapshot: one sentence with ratio, time, and the strongest signal.
Likely diagnosis: one concise paragraph.
Next shot: 2-3 bullets, each changing only one variable unless puck prep is the main issue.
Watch for: one short sentence describing what should improve or what to check.

Prefer small adjustments: grind one notch, yield changes of 1-3 g, temperature changes of 1-2 F, and puck prep changes before recipe changes when sour and bitter notes appear together.`;

export async function handleShotAnalysisRequest(
  request: Request,
  modelFactory: ShotAnalysisClientFactory = createShotAnalysisClient,
) {
  try {
    const body = await readJsonObject(request);
    const input = parseShotAnalysisInput(body);
    const stream = await createShotAnalysisStream(input, modelFactory, request.signal);

    return new Response(stream, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/x-ndjson; charset=utf-8",
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export function parseShotAnalysisInput(body: Record<string, unknown>): ShotAnalysisInput {
  const model = modelFromBody(body.modelId);
  const taste = optionalEnum(body, "taste", tastes);
  const roastLevel = optionalEnum(body, "roastLevel", roastLevels);
  const brewTemperatureF = finiteNumber(body, "brewTemperatureF", {
    min: 185,
    max: 212,
    optional: true,
  });
  const elevationFeet = finiteNumber(body, "elevationFeet", {
    min: -1500,
    max: 20000,
    optional: true,
  });
  const notes = optionalString(body, "notes", 600);
  const doseGrams = finiteNumber(body, "doseGrams", { min: 5, max: 40 })!;
  const yieldGrams = finiteNumber(body, "yieldGrams", { min: 5, max: 150 })!;
  const timeSeconds = finiteNumber(body, "timeSeconds", { min: 1, max: 120 })!;

  return {
    doseGrams,
    yieldGrams,
    timeSeconds,
    model,
    ratio: round(yieldGrams / doseGrams, 2),
    ...(taste ? { taste } : {}),
    ...(roastLevel ? { roastLevel } : {}),
    ...(brewTemperatureF !== undefined ? { brewTemperatureF } : {}),
    ...(elevationFeet !== undefined ? { elevationFeet } : {}),
    ...(notes ? { notes } : {}),
  };
}

export function createShotAnalysisMessages(input: ShotAnalysisInput) {
  return [
    new SystemMessage(systemPrompt),
    new HumanMessage(formatShotForPrompt(input)),
  ];
}

export async function createShotAnalysisStream(
  input: ShotAnalysisInput,
  modelFactory: ShotAnalysisClientFactory = createShotAnalysisClient,
  signal?: AbortSignal,
) {
  const messages = createShotAnalysisMessages(input);
  const model = modelFactory(input.model);

  const langChainStream = await model.stream(messages, {
    runName: "espresso-shot-analysis",
    tags: ["dial-in-advisor", input.model.provider],
    metadata: {
      modelId: input.model.id,
      provider: input.model.provider,
      ratio: input.ratio,
    },
    signal,
  });
  const iterator = langChainStream[Symbol.asyncIterator]();
  const firstChunk = await firstStreamChunk(iterator, input.model);
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let thinkingCompleteSent = false;
      let sawThinking = false;

      const onAnswerStart = () => {
        if (thinkingCompleteSent) {
          return;
        }

        thinkingCompleteSent = true;

        if (sawThinking) {
          controller.enqueue(
            encoder.encode(encodeShotAnalysisStreamEvent({ type: "thinking_complete" })),
          );
        }
      };

      try {
        if (!firstChunk.done) {
          enqueueStreamChunk(controller, encoder, firstChunk.value, onAnswerStart, (thinking) => {
            if (thinking) {
              sawThinking = true;
            }
          });
        }

        while (true) {
          const chunk = await iterator.next();

          if (chunk.done) {
            break;
          }

          enqueueStreamChunk(controller, encoder, chunk.value, onAnswerStart, (thinking) => {
            if (thinking) {
              sawThinking = true;
            }
          });
        }

        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

async function firstStreamChunk(
  iterator: AsyncIterator<unknown>,
  model: ShotAnalysisModel,
) {
  try {
    return await iterator.next();
  } catch (error) {
    throw providerError(model, error);
  }
}

function enqueueStreamChunk(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  chunk: unknown,
  onAnswerStart: () => void,
  onThinking?: (thinking: string) => void,
) {
  const parts = streamPartsFromChunk(chunk);

  if (parts.thinking) {
    onThinking?.(parts.thinking);
    controller.enqueue(
      encoder.encode(
        encodeShotAnalysisStreamEvent({ type: "thinking", delta: parts.thinking }),
      ),
    );
  }

  if (parts.answer) {
    onAnswerStart();
    controller.enqueue(
      encoder.encode(
        encodeShotAnalysisStreamEvent({ type: "answer", delta: parts.answer }),
      ),
    );
  }
}

function createShotAnalysisClient(model: ShotAnalysisModel): ShotAnalysisClient {
  enableLangSmithTracing();

  if (model.provider === "openai") {
    return new ChatOpenAI({
      apiKey: requiredEnv("OPENAI_API_KEY", "OpenAI"),
      maxRetries: 1,
      model: model.model,
      temperature: 0.2,
    });
  }

  return new ChatOllama({
    baseUrl: process.env.OLLAMA_BASE_URL ?? "https://ollama.com",
    headers: {
      Authorization: `Bearer ${requiredEnv("OLLAMA_API_KEY", "Ollama Cloud")}`,
    },
    model: model.model,
    numPredict: 420,
    temperature: 0.2,
    ...(model.think ? { think: true } : {}),
  });
}

function enableLangSmithTracing() {
  process.env.LANGCHAIN_CALLBACKS_BACKGROUND ??= "false";

  if (process.env.LANGSMITH_API_KEY) {
    process.env.LANGSMITH_TRACING ??= "true";
  }
}

function requiredEnv(name: string, provider: string) {
  const value = process.env[name];

  if (!value) {
    throw new ApiError(
      500,
      "configuration_error",
      `${provider} is not configured for shot analysis.`,
    );
  }

  return value;
}

function providerError(model: ShotAnalysisModel, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("requires a subscription")) {
    return new ApiError(
      502,
      "model_unavailable",
      `${model.label} requires access that is not enabled for this API key. Choose another model or update Ollama access.`,
    );
  }

  if (normalizedMessage.includes("model") && normalizedMessage.includes("not found")) {
    return new ApiError(
      502,
      "model_unavailable",
      `${model.label} is not available from the selected provider.`,
    );
  }

  return new ApiError(
    502,
    "model_unavailable",
    `${model.label} could not complete the analysis. Try another model or retry later.`,
  );
}

function modelFromBody(value: unknown) {
  if (typeof value !== "string") {
    throw new ApiError(400, "validation_error", "Check the request fields.", {
      modelId: "Choose a model.",
    });
  }

  const model = shotAnalysisModels.find((candidate) => candidate.id === value);

  if (!model) {
    throw new ApiError(400, "validation_error", "Check the request fields.", {
      modelId: "Choose a supported model.",
    });
  }

  return model;
}

function optionalEnum<const Values extends readonly string[]>(
  body: Record<string, unknown>,
  field: string,
  values: Values,
): Values[number] | undefined {
  const value = body[field];

  if (value === undefined || value === "") {
    return undefined;
  }

  if (typeof value === "string" && values.includes(value)) {
    return value as Values[number];
  }

  throw new ApiError(400, "validation_error", "Check the request fields.", {
    [field]: `Must be one of: ${values.join(", ")}.`,
  });
}

function optionalString(
  body: Record<string, unknown>,
  field: string,
  maxLength: number,
) {
  const value = body[field];

  if (value === undefined || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new ApiError(400, "validation_error", "Check the request fields.", {
      [field]: "Must be text.",
    });
  }

  const trimmed = value.trim();

  if (trimmed.length > maxLength) {
    throw new ApiError(400, "validation_error", "Check the request fields.", {
      [field]: `Must be ${maxLength} characters or fewer.`,
    });
  }

  return trimmed || undefined;
}

function formatShotForPrompt(input: ShotAnalysisInput) {
  return [
    `Selected model: ${input.model.label}`,
    `Dose in: ${input.doseGrams} g`,
    `Yield out: ${input.yieldGrams} g`,
    `Measured ratio: 1:${input.ratio}`,
    `Time: ${input.timeSeconds} seconds`,
    input.taste ? `Taste: ${input.taste}` : "Taste: not provided",
    input.roastLevel ? `Roast level: ${input.roastLevel}` : "Roast level: not provided",
    input.brewTemperatureF
      ? `Brew temperature: ${input.brewTemperatureF} F`
      : "Brew temperature: not provided",
    input.elevationFeet !== undefined
      ? `Elevation: ${input.elevationFeet} ft`
      : "Elevation: not provided",
    input.notes ? `Notes: ${input.notes}` : "Notes: not provided",
  ].join("\n");
}

function round(value: number, places: number) {
  return Number(value.toFixed(places));
}
