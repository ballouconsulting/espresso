import assert from "node:assert/strict";
import test from "node:test";

import { POST as calculate } from "../app/api/brew-calculator/route.ts";
import { POST as advise } from "../app/api/dial-in/route.ts";
import { calculateBrew } from "../lib/brew-calculator.ts";
import { temperatureForZip, temperatureGuidance } from "../lib/brew-temperature.ts";
import {
  handleShotAnalysisRequest,
  parseShotAnalysisInput,
} from "../lib/shot-analysis.ts";
import { shotAnalysisModels } from "../lib/shot-analysis-options.ts";
import { ApiError } from "../lib/api.ts";

test("shot analysis accepts required measurements without optional context", () => {
  const result = parseShotAnalysisInput({
    doseGrams: 18,
    yieldGrams: 36,
    timeSeconds: 28,
    modelId: "openai-gpt-5-4-mini",
  });

  assert.equal(result.ratio, 2);
  assert.equal(result.model.provider, "openai");
  assert.equal(result.taste, undefined);
  assert.equal(result.roastLevel, undefined);
});

test("dial-in endpoint streams model analysis chunks", async () => {
  const response = await handleShotAnalysisRequest(
    jsonRequest("http://localhost/api/dial-in", {
      doseGrams: 18,
      yieldGrams: 36,
      timeSeconds: 22,
      taste: "sour",
      roastLevel: "light",
      modelId: "ollama-gemma4-31b",
    }),
    (model) => {
      assert.equal(model, shotAnalysisModels[0]);

      return {
        async *stream() {
          yield { content: "Snapshot: 1:2 in 22s.\n" };
          yield { content: [{ text: "Next shot: grind a touch finer." }] };
        },
      };
    },
  );
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  const first = await reader.read();
  const second = await reader.read();

  assert.equal(response.status, 200);
  assert.match(response.headers.get("Content-Type") ?? "", /text\/plain/);
  assert.equal(decoder.decode(first.value), "Snapshot: 1:2 in 22s.\n");
  assert.equal(decoder.decode(second.value), "Next shot: grind a touch finer.");
});

test("dial-in endpoint returns readable provider errors before streaming", async () => {
  const response = await handleShotAnalysisRequest(
    jsonRequest("http://localhost/api/dial-in", {
      doseGrams: 18,
      yieldGrams: 36,
      timeSeconds: 28,
      modelId: "ollama-nemotron-3-super",
    }),
    () => ({
      async *stream() {
        throw new Error("this model requires a subscription, upgrade for access");
      },
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 502);
  assert.equal(body.error.code, "model_unavailable");
  assert.match(body.error.message, /requires access/);
});

test("dial-in endpoint validates required numeric fields", async () => {
  const response = await advise(
    jsonRequest("http://localhost/api/dial-in", {
      doseGrams: 18,
      yieldGrams: 36,
      modelId: "openai-gpt-5-4-mini",
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, "validation_error");
  assert.ok(body.error.fields.timeSeconds);
});

test("shot analysis rejects invalid direct-call measurements", () => {
  assert.throws(
    () =>
      parseShotAnalysisInput({
        doseGrams: 0,
        yieldGrams: 36,
        timeSeconds: 30,
        modelId: "openai-gpt-5-4-mini",
      }),
    (error: unknown) =>
      error instanceof ApiError &&
      error.status === 400 &&
      error.code === "validation_error",
  );
});

test("brew calculator computes a missing value and converts units", () => {
  assert.deepEqual(
    calculateBrew({
      dose: 18,
      ratio: 2,
      unit: "g",
      outputUnit: "oz",
    }),
    {
      dose: 0.635,
      yield: 1.27,
      ratio: 2,
      unit: "oz",
      ratioLabel: "1:2",
    },
  );
});

test("brew calculator endpoint requires exactly two recipe values", async () => {
  const response = await calculate(
    jsonRequest("http://localhost/api/brew-calculator", {
      dose: 18,
      yield: 36,
      ratio: 2,
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, "validation_error");
});

test("temperature guidance lowers the range when elevation constrains boiling", () => {
  const result = temperatureGuidance(
    "80435",
    {
      "place name": "Dillon",
      state: "Colorado",
      latitude: "39.6303",
      longitude: "-106.0434",
    },
    2775,
  );

  assert.equal(result.location.elevation.feet, 9104);
  assert.ok(
    result.temperature.recommendedRange.maximum.fahrenheit <
      result.temperature.estimatedBoilingPoint.fahrenheit,
  );
  assert.match(result.guidance, /limits the usual espresso temperature range/);
});

test("temperature lookup combines ZIP and elevation services", async () => {
  const requests: string[] = [];
  const fetcher: typeof fetch = async (input) => {
    const url = String(input);
    requests.push(url);

    if (url.includes("zippopotam")) {
      return Response.json({
        places: [
          {
            "place name": "Boulder",
            state: "Colorado",
            latitude: "40.015",
            longitude: "-105.2705",
          },
        ],
      });
    }

    return Response.json({ elevation: [1624] });
  };

  const result = await temperatureForZip("80302", fetcher);

  assert.equal(requests.length, 2);
  assert.equal(result.location.name, "Boulder");
  assert.equal(result.location.elevation.meters, 1624);
});

test("temperature lookup reports upstream network failures as a 502", async () => {
  const fetcher: typeof fetch = async () => {
    throw new Error("network unavailable");
  };

  await assert.rejects(
    temperatureForZip("80302", fetcher),
    (error: unknown) =>
      error instanceof ApiError &&
      error.status === 502 &&
      error.code === "location_service_unavailable",
  );
});

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
