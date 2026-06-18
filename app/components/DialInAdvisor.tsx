"use client";

import { FormEvent, useState } from "react";
import { fetchJson, getErrorMessage } from "../../lib/client-api.ts";
import type { TargetRecipe } from "./ShotCalculator.tsx";

type Taste = "sour" | "bitter" | "both" | "balanced";

type DialInResult = {
  recipe: {
    doseGrams: number;
    yieldGrams: number;
    timeSeconds: number;
    taste?: Taste;
    ratio: number;
  };
  assessment: {
    extraction: "likely-under" | "likely-over" | "likely-uneven" | "balanced" | "unclear";
    pace: "fast" | "slow" | "in-range";
    summary: string;
  };
  suggestions: Array<{
    adjustment: string;
    reason: string;
  }>;
  principle: string;
};

const tasteOptions: Array<{ value: Taste; label: string }> = [
  { value: "sour", label: "Sour" },
  { value: "bitter", label: "Bitter" },
  { value: "both", label: "Both" },
  { value: "balanced", label: "Balanced" },
];

type DialInAdvisorProps = {
  targetRecipe: TargetRecipe;
};

export function DialInAdvisor({ targetRecipe }: DialInAdvisorProps) {
  const [dose, setDose] = useState(targetRecipe.dose.toFixed(1));
  const [yieldGrams, setYieldGrams] = useState(targetRecipe.yieldGrams.toFixed(1));
  const [timeSeconds, setTimeSeconds] = useState("28");
  const [taste, setTaste] = useState<Taste>("sour");
  const [result, setResult] = useState<DialInResult | null>(null);
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
    setResult(null);

    try {
      const data = await fetchJson<DialInResult>("/api/dial-in", {
        method: "POST",
        body: JSON.stringify({
          doseGrams: Number(dose),
          yieldGrams: Number(yieldGrams),
          timeSeconds: Number(timeSeconds),
          taste,
        }),
      });

      setResult(data);
      setStatus("idle");
    } catch (fetchError) {
      setResult(null);
      setError(getErrorMessage(fetchError));
      setStatus("error");
    }
  };

  return (
    <section className="section shell tool-section" id="advisor">
      <div className="tool-heading">
        <div>
          <p className="eyebrow">Pull, taste, adjust</p>
          <h2>
            Diagnose the shot.
            <br />
            <em>Then change one thing.</em>
          </h2>
        </div>
        <p>
          Enter what actually happened in the cup. Taste takes priority over
          time, and the advisor turns the API response into the next practical
          move.
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

          <button className="button primary tool-submit" disabled={status === "loading"} type="submit">
            {status === "loading" ? "Checking shot" : "Get next adjustment"}
          </button>
          {error ? <p className="tool-error">{error}</p> : null}
        </form>

        <div className="tool-card advisor-result" aria-live="polite">
          {result ? (
            <>
              <div>
                <span className="result-kicker">Assessment</span>
                <h3>{labelAssessment(result.assessment.extraction)}</h3>
                <p>{result.assessment.summary}</p>
              </div>
              <div className="result-metrics">
                <span>
                  Ratio <strong>1:{result.recipe.ratio}</strong>
                </span>
                <span>
                  Pace <strong>{result.assessment.pace}</strong>
                </span>
              </div>
              <ul className="suggestion-list">
                {result.suggestions.map((suggestion) => (
                  <li key={suggestion.adjustment}>
                    <strong>{suggestion.adjustment}</strong>
                    <span>{suggestion.reason}</span>
                  </li>
                ))}
              </ul>
              <p className="principle">{result.principle}</p>
            </>
          ) : (
            <div className="empty-result">
              <span className="result-kicker">Ready</span>
              <h3>Your next shot plan appears here.</h3>
              <p>
                Start with the target recipe, pull the shot, then log the
                result once you know how it tastes.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function labelAssessment(extraction: DialInResult["assessment"]["extraction"]) {
  const labels: Record<DialInResult["assessment"]["extraction"], string> = {
    "likely-under": "Likely under-extracted",
    "likely-over": "Likely over-extracted",
    "likely-uneven": "Likely uneven",
    balanced: "Balanced",
    unclear: "Taste decides",
  };

  return labels[extraction];
}
