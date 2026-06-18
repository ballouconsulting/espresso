"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchJson, getErrorMessage } from "../../lib/client-api.ts";

export type TargetRecipe = {
  dose: number;
  ratio: number;
  yieldGrams: number;
  ratioLabel: string;
};

type BrewCalculationResponse = {
  calculation: {
    dose: number;
    yield: number;
    ratio: number;
    unit: "g" | "oz";
    ratioLabel: string;
  };
};

type ShotCalculatorProps = {
  recipe: TargetRecipe;
  onPreview: (recipe: TargetRecipe) => void;
  onCalculated: (recipe: TargetRecipe) => void;
};

export function ShotCalculator({
  recipe,
  onPreview,
  onCalculated,
}: ShotCalculatorProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const latestRecipe = useRef(recipe);
  const lastSubmitted = useRef("");
  const latestRequestId = useRef(0);

  useEffect(() => {
    latestRecipe.current = recipe;
  }, [recipe]);

  const previewRecipe = useCallback(
    (dose: number, ratio: number) => {
      const nextRecipe = {
        dose,
        ratio,
        yieldGrams: dose * ratio,
        ratioLabel: `1:${formatRatio(ratio)}`,
      };

      latestRecipe.current = nextRecipe;
      onPreview(nextRecipe);
    },
    [onPreview],
  );

  const calculateRecipe = useCallback(async () => {
    const recipeToCalculate = latestRecipe.current;
    const key = `${recipeToCalculate.dose}:${recipeToCalculate.ratio}`;
    if (lastSubmitted.current === key && status !== "error") {
      return;
    }

    const requestId = latestRequestId.current + 1;
    latestRequestId.current = requestId;
    lastSubmitted.current = key;
    setStatus("loading");
    setError("");

    try {
      const data = await fetchJson<BrewCalculationResponse>("/api/brew-calculator", {
        method: "POST",
        body: JSON.stringify({
          dose: recipeToCalculate.dose,
          ratio: recipeToCalculate.ratio,
          unit: "g",
          outputUnit: "g",
        }),
      });

      if (requestId !== latestRequestId.current) {
        return;
      }

      onCalculated({
        dose: data.calculation.dose,
        ratio: data.calculation.ratio,
        yieldGrams: data.calculation.yield,
        ratioLabel: data.calculation.ratioLabel,
      });
      setStatus("idle");
    } catch (fetchError) {
      if (requestId !== latestRequestId.current) {
        return;
      }

      setError(getErrorMessage(fetchError));
      setStatus("error");
    }
  }, [onCalculated, status]);

  return (
    <div className="calculator">
      <div className="calculator-top">
        <span>Shot calculator</span>
        <span className={status === "loading" ? "live-dot loading" : "live-dot"}>
          {status === "loading" ? "checking" : "ready"}
        </span>
      </div>
      <label>
        <span>
          Dose <strong>{recipe.dose.toFixed(1)}g</strong>
        </span>
        <input
          type="range"
          min="14"
          max="22"
          step="0.5"
          value={recipe.dose}
          onBlur={calculateRecipe}
          onChange={(event) => previewRecipe(Number(event.currentTarget.value), recipe.ratio)}
          onKeyUp={calculateRecipe}
          onPointerUp={calculateRecipe}
        />
        <small>
          <span>14g</span>
          <span>22g</span>
        </small>
      </label>
      <label>
        <span>
          Brew ratio <strong>{recipe.ratioLabel}</strong>
        </span>
        <input
          type="range"
          min="1.5"
          max="3"
          step="0.1"
          value={recipe.ratio}
          onBlur={calculateRecipe}
          onChange={(event) => previewRecipe(recipe.dose, Number(event.currentTarget.value))}
          onKeyUp={calculateRecipe}
          onPointerUp={calculateRecipe}
        />
        <small>
          <span>short</span>
          <span>long</span>
        </small>
      </label>
      <div className="yield-result">
        <span>Stop your shot at</span>
        <strong>
          {recipe.yieldGrams.toFixed(1)}
          <small>g</small>
        </strong>
        <p>Release a slider to confirm the target with the brew API.</p>
      </div>
      {error ? <p className="tool-error">{error}</p> : null}
    </div>
  );
}

function formatRatio(ratio: number) {
  return Number(ratio.toFixed(1)).toString();
}
