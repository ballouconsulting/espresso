"use client";

import { FormEvent, useState } from "react";
import {
  roastLevels,
  shotAnalysisModels,
  type RoastLevel,
  type ShotAnalysisModelId,
  type Taste,
} from "../../lib/shot-analysis-options.ts";
import type { TargetRecipe } from "./ShotCalculator.tsx";

const tasteOptions: Array<{ value: Taste | ""; label: string }> = [
  { value: "", label: "Not sure" },
  { value: "sour", label: "Sour" },
  { value: "bitter", label: "Bitter" },
  { value: "both", label: "Both" },
  { value: "balanced", label: "Balanced" },
];

const roastLabels: Record<RoastLevel, string> = {
  light: "Light",
  medium: "Medium",
  dark: "Dark",
};

type DialInAdvisorProps = {
  targetRecipe: TargetRecipe;
};

export function DialInAdvisor({ targetRecipe }: DialInAdvisorProps) {
  const [dose, setDose] = useState(targetRecipe.dose.toFixed(1));
  const [yieldGrams, setYieldGrams] = useState(targetRecipe.yieldGrams.toFixed(1));
  const [timeSeconds, setTimeSeconds] = useState("28");
  const [taste, setTaste] = useState<Taste | "">("");
  const [roastLevel, setRoastLevel] = useState<RoastLevel | "">("");
  const [brewTemperatureF, setBrewTemperatureF] = useState("");
  const [elevationFeet, setElevationFeet] = useState("");
  const [notes, setNotes] = useState("");
  const [modelId, setModelId] = useState<ShotAnalysisModelId>(shotAnalysisModels[0].id);
  const [analysis, setAnalysis] = useState("");
  const [lastShot, setLastShot] = useState<{
    modelLabel: string;
    ratio: string;
    timeSeconds: string;
  } | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  const useTargetRecipe = () => {
    setDose(targetRecipe.dose.toFixed(1));
    setYieldGrams(targetRecipe.yieldGrams.toFixed(1));
  };

  const submitShot = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    setError("");
    setAnalysis("");

    const selectedModel =
      shotAnalysisModels.find((model) => model.id === modelId) ?? shotAnalysisModels[0];

    try {
      setLastShot({
        modelLabel: selectedModel.label,
        ratio: ratioLabel(Number(dose), Number(yieldGrams)),
        timeSeconds,
      });

      const response = await fetch("/api/dial-in", {
        headers: { "Content-Type": "application/json" },
        method: "POST",
        body: JSON.stringify(compactPayload({
          doseGrams: Number(dose),
          yieldGrams: Number(yieldGrams),
          timeSeconds: Number(timeSeconds),
          modelId,
          taste,
          roastLevel,
          brewTemperatureF: brewTemperatureF ? Number(brewTemperatureF) : undefined,
          elevationFeet: elevationFeet ? Number(elevationFeet) : undefined,
          notes,
        })),
      });

      if (!response.ok) {
        throw new Error(await responseErrorMessage(response));
      }

      if (!response.body) {
        throw new Error("The analysis stream could not be opened.");
      }

      await streamAnalysis(response.body, setAnalysis);
      setStatus("idle");
    } catch (fetchError) {
      setAnalysis("");
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "The request could not be completed.",
      );
      setStatus("error");
    }
  };

  return (
    <section className="section shell tool-section" id="advisor">
      <div className="tool-heading">
        <div>
          <p className="eyebrow">Pull, taste, adjust</p>
          <h2>
            Analyze the shot.
            <br />
            <em>Watch the plan stream in.</em>
          </h2>
        </div>
        <p>
          Enter the shot data you know. The selected model reads the recipe,
          taste, and context once, then streams a concise next-shot plan.
        </p>
      </div>

      <div className="advisor-grid">
        <form className="tool-card advisor-form" onSubmit={submitShot}>
          <div className="tool-card-top">
            <span>Shot log</span>
            <button type="button" onClick={useTargetRecipe}>
              Use target
            </button>
          </div>

          <label className="model-field">
            <span>Analysis model</span>
            <select
              onChange={(event) => setModelId(event.currentTarget.value as ShotAnalysisModelId)}
              required
              value={modelId}
            >
              {shotAnalysisModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label}
                </option>
              ))}
            </select>
          </label>

          <div className="field-grid">
            <label>
              <span>Dose in</span>
              <input
                inputMode="decimal"
                min="5"
                max="40"
                onChange={(event) => setDose(event.currentTarget.value)}
                step="0.1"
                type="number"
                value={dose}
                required
              />
              <small>grams</small>
            </label>
            <label>
              <span>Yield out</span>
              <input
                inputMode="decimal"
                min="5"
                max="150"
                onChange={(event) => setYieldGrams(event.currentTarget.value)}
                step="0.1"
                type="number"
                value={yieldGrams}
                required
              />
              <small>grams</small>
            </label>
            <label>
              <span>Time</span>
              <input
                inputMode="numeric"
                min="1"
                max="120"
                onChange={(event) => setTimeSeconds(event.currentTarget.value)}
                step="1"
                type="number"
                value={timeSeconds}
                required
              />
              <small>seconds</small>
            </label>
          </div>

          <fieldset className="taste-picker">
            <legend>Taste</legend>
            {tasteOptions.map((option) => (
              <label className={taste === option.value ? "selected" : ""} key={option.value}>
                <input
                  checked={taste === option.value}
                  name="taste"
                  onChange={() => setTaste(option.value)}
                  type="radio"
                  value={option.value}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>

          <details className="optional-context">
            <summary>Optional context</summary>
            <div className="optional-grid">
              <label>
                <span>Roast level</span>
                <select
                  onChange={(event) => setRoastLevel(event.currentTarget.value as RoastLevel | "")}
                  value={roastLevel}
                >
                  <option value="">Not sure</option>
                  {roastLevels.map((level) => (
                    <option key={level} value={level}>
                      {roastLabels[level]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Brew temp</span>
                <input
                  inputMode="decimal"
                  max="212"
                  min="185"
                  onChange={(event) => setBrewTemperatureF(event.currentTarget.value)}
                  placeholder="200"
                  step="0.5"
                  type="number"
                  value={brewTemperatureF}
                />
                <small>Fahrenheit</small>
              </label>
              <label>
                <span>Elevation</span>
                <input
                  inputMode="numeric"
                  max="20000"
                  min="-1500"
                  onChange={(event) => setElevationFeet(event.currentTarget.value)}
                  placeholder="5280"
                  step="50"
                  type="number"
                  value={elevationFeet}
                />
                <small>feet</small>
              </label>
              <label className="notes-field">
                <span>Notes</span>
                <textarea
                  maxLength={600}
                  onChange={(event) => setNotes(event.currentTarget.value)}
                  placeholder="Channeling, thin body, new beans, grinder setting..."
                  rows={4}
                  value={notes}
                />
              </label>
            </div>
          </details>

          <button className="button primary tool-submit" disabled={status === "loading"} type="submit">
            {status === "loading" ? "Analyzing shot" : "Stream shot analysis"}
          </button>
          {error ? <p className="tool-error">{error}</p> : null}
        </form>

        <div className={`tool-card advisor-result ${status === "loading" ? "streaming" : ""}`} aria-live="polite">
          {analysis ? (
            <>
              <div>
                <span className="result-kicker">AI analysis</span>
                <h3>Next shot plan</h3>
              </div>
              {lastShot ? (
                <div className="result-metrics">
                  <span>
                    Ratio <strong>{lastShot.ratio}</strong>
                  </span>
                  <span>
                    Time <strong>{lastShot.timeSeconds}s</strong>
                  </span>
                  <span>
                    Model <strong>{lastShot.modelLabel}</strong>
                  </span>
                </div>
              ) : null}
              <pre className="analysis-stream">{analysis}</pre>
              {status === "loading" ? <span className="stream-cursor">Streaming</span> : null}
            </>
          ) : (
            <div className="empty-result">
              <span className="result-kicker">
                {status === "loading" ? "Thinking" : "Ready"}
              </span>
              <h3>
                {status === "loading" ? "Opening the stream." : "Your analysis appears here."}
              </h3>
              <p>
                Dose, yield, and time are enough to begin. Taste and context
                make the recommendation sharper when you have them.
              </p>
              {status === "loading" ? <span className="spinner" aria-hidden="true" /> : null}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

async function streamAnalysis(
  body: ReadableStream<Uint8Array>,
  onChunk: (analysis: string) => void,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let text = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      const finalText = decoder.decode();
      if (finalText) {
        text += finalText;
        onChunk(text);
      }
      return;
    }

    text += decoder.decode(value, { stream: true });
    onChunk(text);
  }
}

async function responseErrorMessage(response: Response) {
  try {
    const data = await response.json();
    const message = (data as { error?: { message?: unknown } }).error?.message;
    return typeof message === "string" ? message : "The request could not be completed.";
  } catch {
    return "The request could not be completed.";
  }
}

function compactPayload(payload: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== ""),
  );
}

function ratioLabel(doseGrams: number, yieldGrams: number) {
  if (!Number.isFinite(doseGrams) || doseGrams <= 0 || !Number.isFinite(yieldGrams)) {
    return "1:--";
  }

  return `1:${(yieldGrams / doseGrams).toFixed(2)}`;
}
