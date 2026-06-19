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

const roastOptions: Array<{ value: RoastLevel | ""; label: string }> = [
  { value: "", label: "Not sure" },
  ...roastLevels.map((level) => ({ value: level, label: roastLabels[level] })),
];

type DialInAdvisorProps = {
  elevationFeet: string;
  onElevationFeetChange: (value: string) => void;
  targetRecipe: TargetRecipe;
};

export function DialInAdvisor({
  elevationFeet,
  onElevationFeetChange,
  targetRecipe,
}: DialInAdvisorProps) {
  const [dose, setDose] = useState(targetRecipe.dose.toFixed(1));
  const [yieldGrams, setYieldGrams] = useState(targetRecipe.yieldGrams.toFixed(1));
  const [timeSeconds, setTimeSeconds] = useState("28");
  const [taste, setTaste] = useState<Taste | "">("");
  const [roastLevel, setRoastLevel] = useState<RoastLevel | "">("");
  const [brewTemperatureF, setBrewTemperatureF] = useState("");
  const [notes, setNotes] = useState("");
  const [modelId, setModelId] = useState<ShotAnalysisModelId>(shotAnalysisModels[0].id);
  const [analysis, setAnalysis] = useState("");
  const [thinkingTrace, setThinkingTrace] = useState("");
  const [thinkingExpanded, setThinkingExpanded] = useState(true);
  const [lastShot, setLastShot] = useState<{
    modelLabel: string;
    ratio: string;
    timeSeconds: string;
  } | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  const submitShot = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    setError("");
    setAnalysis("");
    setThinkingTrace("");
    setThinkingExpanded(true);

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
        throw new Error("The analysis response could not be opened.");
      }

      await streamDialInResponse(response.body, ({ analysis, thinking, thinkingComplete }) => {
        setThinkingTrace(thinking);
        setAnalysis(analysis);

        if (thinkingComplete && thinking) {
          setThinkingExpanded(false);
        }
      });
      setStatus("idle");
    } catch (fetchError) {
      setAnalysis("");
      setThinkingTrace("");
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
            <em>Choose the next move.</em>
          </h2>
        </div>
        <p>
          Enter the shot data you know. The selected model uses the recipe,
          taste, and context once, then returns a concise next-shot plan.
        </p>
      </div>

      <div className="advisor-grid">
        <form autoComplete="off" className="tool-card advisor-form" onSubmit={submitShot}>
          <div className="tool-card-top">
            <span>Shot log</span>
            <label className="top-model-field">
              <span>Model</span>
              <CustomSelect
                label="Model"
                onChange={(value) => setModelId(value as ShotAnalysisModelId)}
                options={shotAnalysisModels.map((model) => ({
                  value: model.id,
                  label: model.label,
                }))}
                value={modelId}
              />
            </label>
          </div>

          <div className="field-grid">
            <NumericField
              decimals={1}
              fallback={targetRecipe.dose}
              inputMode="decimal"
              label="Dose in"
              max={40}
              min={5}
              onChange={setDose}
              required
              step={0.1}
              unit="grams"
              value={dose}
            />
            <NumericField
              decimals={1}
              fallback={targetRecipe.yieldGrams}
              inputMode="decimal"
              label="Yield out"
              max={150}
              min={5}
              onChange={setYieldGrams}
              required
              step={0.1}
              unit="grams"
              value={yieldGrams}
            />
            <NumericField
              fallback={28}
              inputMode="numeric"
              label="Time"
              max={120}
              min={1}
              onChange={setTimeSeconds}
              required
              step={1}
              unit="seconds"
              value={timeSeconds}
            />
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

          <div className="optional-context">
            <div className="optional-heading">
              <span>Optional context</span>
              <small>Use what you know</small>
            </div>
            <div className="optional-grid">
              <label>
                <span>Roast level</span>
                <CustomSelect
                  label="Roast level"
                  onChange={(value) => setRoastLevel(value as RoastLevel | "")}
                  options={roastOptions}
                  value={roastLevel}
                />
              </label>
              <label>
                <span>Brew temp</span>
                <NumericFieldControl
                  decimals={1}
                  fallback={200}
                  inputMode="decimal"
                  label="Brew temp"
                  max={212}
                  min={185}
                  onChange={setBrewTemperatureF}
                  placeholder="200"
                  step={0.5}
                  value={brewTemperatureF}
                />
                <small>Fahrenheit</small>
              </label>
              <label>
                <span>Elevation</span>
                <NumericFieldControl
                  fallback={0}
                  inputMode="numeric"
                  label="Elevation"
                  max={20000}
                  min={-1500}
                  onChange={onElevationFeetChange}
                  placeholder="0"
                  step={1}
                  value={elevationFeet}
                />
                <small>feet</small>
              </label>
              <label className="notes-field">
                <span>Notes</span>
                <textarea
                  autoComplete="off"
                  maxLength={600}
                  onChange={(event) => setNotes(event.currentTarget.value)}
                  placeholder="Channeling, thin body, new beans, grinder setting..."
                  rows={3}
                  value={notes}
                />
              </label>
            </div>
          </div>

          <button className="button primary tool-submit" disabled={status === "loading"} type="submit">
            {status === "loading" ? "Analyzing shot" : "Analyze shot"}
          </button>
          {error ? <p className="tool-error">{error}</p> : null}
        </form>

        <div className={`tool-card advisor-result ${status === "loading" ? "streaming" : ""}`} aria-live="polite">
          {analysis || thinkingTrace || status === "loading" ? (
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
              {thinkingTrace ? (
                <details
                  className={`thinking-panel ${thinkingExpanded ? "expanded" : "collapsed"}`}
                  onToggle={(event) => setThinkingExpanded(event.currentTarget.open)}
                  open={thinkingExpanded}
                >
                  <summary>Model thinking</summary>
                  <pre className="thinking-stream">{thinkingTrace}</pre>
                </details>
              ) : null}
              {analysis ? (
                <pre className="analysis-stream">{analysis}</pre>
              ) : status === "loading" ? (
                <p className="analysis-pending">Drafting the answer after model thinking.</p>
              ) : null}
              {status === "loading" ? <span className="stream-cursor">Analyzing</span> : null}
            </>
          ) : (
            <div className="empty-result">
              <span className="result-kicker">
                {status === "loading" ? "Thinking" : "Ready"}
              </span>
              <h3>
                {status === "loading" ? "Analyzing the shot." : "Your shot analysis appears here."}
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

type SelectOption = {
  value: string;
  label: string;
};

type CustomSelectProps = {
  label: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  value: string;
};

function CustomSelect({ label, onChange, options, value }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find((option) => option.value === value) ?? options[0];

  return (
    <div
      className={`custom-select ${isOpen ? "open" : ""}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
        }
      }}
    >
      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="select-trigger"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span>{selected.label}</span>
        <span aria-hidden="true">⌄</span>
      </button>
      {isOpen ? (
        <div aria-label={label} className="select-menu" role="listbox">
          {options.map((option) => (
            <button
              aria-selected={option.value === value}
              className={option.value === value ? "selected" : ""}
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              role="option"
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type NumericFieldProps = {
  label: string;
  max: number;
  min: number;
  onChange: (value: string) => void;
  step: number;
  unit: string;
  value: string;
  decimals?: number;
  fallback?: number;
  inputMode?: "decimal" | "numeric";
  placeholder?: string;
  required?: boolean;
};

function NumericField({ label, unit, ...controlProps }: NumericFieldProps) {
  return (
    <label>
      <span>{label}</span>
      <NumericFieldControl label={label} {...controlProps} />
      <small>{unit}</small>
    </label>
  );
}

type NumericFieldControlProps = Omit<NumericFieldProps, "unit">;

function NumericFieldControl({
  decimals = 0,
  fallback,
  inputMode,
  label,
  max,
  min,
  onChange,
  placeholder,
  required,
  step,
  value,
}: NumericFieldControlProps) {
  const adjust = (direction: -1 | 1) => {
    const parsed = Number(value);
    const base = Number.isFinite(parsed) ? parsed : (fallback ?? min);
    const next = Math.min(max, Math.max(min, base + step * direction));

    onChange(formatNumber(next, decimals));
  };

  return (
    <div className="number-control">
      <input
        autoComplete="off"
        inputMode={inputMode}
        max={max}
        min={min}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder={placeholder}
        required={required}
        step="any"
        type="number"
        value={value}
      />
      <div className="number-stepper">
        <button aria-label={`Decrease ${label}`} onClick={() => adjust(-1)} type="button">
          −
        </button>
        <button aria-label={`Increase ${label}`} onClick={() => adjust(1)} type="button">
          +
        </button>
      </div>
    </div>
  );
}

async function streamDialInResponse(
  body: ReadableStream<Uint8Array>,
  onUpdate: (state: {
    analysis: string;
    thinking: string;
    thinkingComplete: boolean;
  }) => void,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let analysis = "";
  let thinking = "";
  let thinkingComplete = false;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      const finalText = decoder.decode();
      if (finalText) {
        buffer += finalText;
      }
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }

      const event = JSON.parse(line) as {
        type: string;
        delta?: string;
      };

      if (event.type === "thinking" && event.delta) {
        thinking += event.delta;
      }

      if (event.type === "thinking_complete") {
        thinkingComplete = true;
      }

      if (event.type === "answer" && event.delta) {
        thinkingComplete = true;
        analysis += event.delta;
      }
    }

    onUpdate({ analysis, thinking, thinkingComplete });
  }

  if (buffer.trim()) {
    const event = JSON.parse(buffer) as { type: string; delta?: string };

    if (event.type === "thinking" && event.delta) {
      thinking += event.delta;
    }

    if (event.type === "thinking_complete") {
      thinkingComplete = true;
    }

    if (event.type === "answer" && event.delta) {
      thinkingComplete = true;
      analysis += event.delta;
    }

    onUpdate({ analysis, thinking, thinkingComplete });
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

function formatNumber(value: number, decimals: number) {
  return decimals > 0 ? value.toFixed(decimals) : String(Math.round(value));
}
