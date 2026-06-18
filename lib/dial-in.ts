import { ApiError } from "./api.ts";

export const tastes = ["sour", "bitter", "both", "balanced"] as const;

export type Taste = (typeof tastes)[number];

export type DialInInput = {
  doseGrams: number;
  yieldGrams: number;
  timeSeconds: number;
  taste?: Taste;
};

type Suggestion = {
  adjustment: string;
  reason: string;
};

export function assessShot(input: DialInInput) {
  if (
    !Number.isFinite(input.doseGrams) ||
    !Number.isFinite(input.yieldGrams) ||
    !Number.isFinite(input.timeSeconds) ||
    input.doseGrams <= 0 ||
    input.yieldGrams <= 0 ||
    input.timeSeconds <= 0
  ) {
    throw new ApiError(
      400,
      "validation_error",
      "Dose, yield, and time must be positive numbers.",
    );
  }

  const ratio = input.yieldGrams / input.doseGrams;
  const pace =
    input.timeSeconds < 25 ? "fast" : input.timeSeconds > 35 ? "slow" : "in-range";
  const suggestions: Suggestion[] = [];
  let extraction: "likely-under" | "likely-over" | "likely-uneven" | "balanced" | "unclear";

  switch (input.taste) {
    case "sour":
      extraction = "likely-under";
      suggestions.push(
        {
          adjustment: "Grind finer.",
          reason: "A finer grind should slow the shot and increase extraction.",
        },
        {
          adjustment: "If it remains sour, increase the yield slightly.",
          reason: "A longer ratio gives the water more opportunity to extract sweetness.",
        },
      );
      break;
    case "bitter":
      extraction = "likely-over";
      suggestions.push(
        {
          adjustment: "Grind coarser.",
          reason: "A coarser grind should speed the shot and reduce extraction.",
        },
        {
          adjustment: "If it remains bitter or dry, decrease the yield slightly.",
          reason: "A shorter ratio can reduce harsh late-extraction flavors.",
        },
      );
      break;
    case "both":
      extraction = "likely-uneven";
      suggestions.push(
        {
          adjustment: "Keep the recipe fixed and improve puck preparation.",
          reason: "Sour and bitter flavors together often point to uneven extraction.",
        },
        {
          adjustment: "Distribute evenly, tamp level, and check for channeling.",
          reason: "More even resistance helps the puck extract consistently.",
        },
      );
      break;
    case "balanced":
      extraction = "balanced";
      suggestions.push({
        adjustment: "Keep the recipe and repeat it.",
        reason: "Taste is the deciding signal, even when time or ratio is unconventional.",
      });
      break;
    default:
      extraction =
        pace === "fast" ? "likely-under" : pace === "slow" ? "likely-over" : "unclear";
      suggestions.push({
        adjustment:
          pace === "fast"
            ? "Grind finer, then taste the next shot."
            : pace === "slow"
              ? "Grind coarser, then taste the next shot."
              : "Taste the shot before changing the recipe.",
        reason:
          pace === "in-range"
            ? "Time is only a diagnostic; taste determines the useful adjustment."
            : `The ${pace} flow is a useful starting clue when no taste note is provided.`,
      });
  }

  if (ratio < 1.5) {
    suggestions.push({
      adjustment: "Consider a higher yield unless you intended a ristretto.",
      reason: `The measured ratio is short at 1:${round(ratio, 2)}.`,
    });
  } else if (ratio > 3) {
    suggestions.push({
      adjustment: "Consider a lower yield unless you intended a lungo.",
      reason: `The measured ratio is long at 1:${round(ratio, 2)}.`,
    });
  }

  return {
    recipe: {
      ...input,
      ratio: round(ratio, 2),
    },
    assessment: {
      extraction,
      pace,
      summary: summaryFor(extraction, pace),
    },
    suggestions,
    principle: "Keep the dose fixed and change one variable at a time.",
  };
}

function summaryFor(extraction: string, pace: string) {
  if (extraction === "balanced") {
    return "The shot tastes balanced. Repeat this recipe before making changes.";
  }
  if (extraction === "likely-uneven") {
    return "The taste suggests uneven extraction. Focus on puck preparation first.";
  }
  if (extraction === "unclear") {
    return "The shot time is in the usual diagnostic window, so taste it before adjusting.";
  }
  return `The shot is ${extractionLabel(extraction)} and ran ${paceLabel(pace)}.`;
}

function extractionLabel(extraction: string) {
  return extraction.replace("likely-under", "likely under-extracted").replace(
    "likely-over",
    "likely over-extracted",
  );
}

function paceLabel(pace: string) {
  return pace === "in-range" ? "in range" : pace;
}

function round(value: number, places: number) {
  return Number(value.toFixed(places));
}
