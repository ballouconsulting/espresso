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
  onCalculated: (recipe: TargetRecipe) => void;
};

export function ShotCalculator({
  recipe,
  onCalculated,
}: ShotCalculatorProps) {
  const [draftDose, setDraftDose] = useState(recipe.dose);
  const [draftRatio, setDraftRatio] = useState(recipe.ratio);
  const [syncedRecipe, setSyncedRecipe] = useState({
    dose: recipe.dose,
    ratio: recipe.ratio,
  });
  const [status, setStatus] = useState<"confirmed" | "loading" | "error">(
    "confirmed",
  );
  const [error, setError] = useState("");
  const latestDraft = useRef({ dose: recipe.dose, ratio: recipe.ratio });
  const lastSubmitted = useRef("");
  const latestRequestId = useRef(0);

  useEffect(() => {
    latestDraft.current = { dose: draftDose, ratio: draftRatio };
  }, [draftDose, draftRatio]);

  if (recipe.dose !== syncedRecipe.dose || recipe.ratio !== syncedRecipe.ratio) {
    const nextDraft = { dose: recipe.dose, ratio: recipe.ratio };
    setSyncedRecipe(nextDraft);
    setDraftDose(recipe.dose);
    setDraftRatio(recipe.ratio);
  }

  const updateDraft = useCallback(
    (dose: number, ratio: number) => {
      latestDraft.current = { dose, ratio };
      setDraftDose(dose);
      setDraftRatio(ratio);
    },
    [],
  );

  const calculateRecipe = useCallback(async () => {
    const draftToCalculate = latestDraft.current;
    const key = `${draftToCalculate.dose}:${draftToCalculate.ratio}`;
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
          dose: draftToCalculate.dose,
          ratio: draftToCalculate.ratio,
          unit: "g",
          outputUnit: "g",
        }),
      });

      if (requestId !== latestRequestId.current) {
        return;
      }

      const confirmedRecipe = {
        dose: data.calculation.dose,
        ratio: data.calculation.ratio,
        yieldGrams: data.calculation.yield,
        ratioLabel: data.calculation.ratioLabel,
      };

      latestDraft.current = {
        dose: confirmedRecipe.dose,
        ratio: confirmedRecipe.ratio,
      };
      setDraftDose(confirmedRecipe.dose);
      setDraftRatio(confirmedRecipe.ratio);
      onCalculated(confirmedRecipe);
      setStatus("confirmed");
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
          {status === "loading"
            ? "checking"
            : status === "error"
              ? "error"
              : "confirmed"}
        </span>
      </div>
      <label>
        <span>
          Dose <strong>{draftDose.toFixed(1)}g</strong>
        </span>
        <input
          type="range"
          min="14"
          max="22"
          step="0.5"
          value={draftDose}
          onBlur={calculateRecipe}
          onChange={(event) =>
            updateDraft(
              Number(event.currentTarget.value),
              latestDraft.current.ratio,
            )
          }
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
          Brew ratio <strong>1:{formatRatio(draftRatio)}</strong>
        </span>
        <input
          type="range"
          min="1.5"
          max="3"
          step="0.1"
          value={draftRatio}
          onBlur={calculateRecipe}
          onChange={(event) =>
            updateDraft(
              latestDraft.current.dose,
              Number(event.currentTarget.value),
            )
          }
          onKeyUp={calculateRecipe}
          onPointerUp={calculateRecipe}
        />
        <small>
          <span>short</span>
          <span>long</span>
        </small>
      </label>
      <div className="yield-result">
        <span>Confirmed target yield</span>
        <strong>
          {recipe.yieldGrams.toFixed(1)}
          <small>g</small>
        </strong>
        <p>Release a slider to calculate the target with the brew API.</p>
      </div>
      {error ? <p className="tool-error">{error}</p> : null}
    </div>
  );
}

function formatRatio(ratio: number) {
  return Number(ratio.toFixed(1)).toString();
}
