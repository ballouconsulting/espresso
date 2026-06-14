import { ApiError } from "./api.ts";

export const massUnits = ["g", "oz"] as const;

export type MassUnit = (typeof massUnits)[number];

type BrewCalculationInput = {
  dose?: number;
  yield?: number;
  ratio?: number;
  unit: MassUnit;
  outputUnit: MassUnit;
};

const GRAMS_PER_OUNCE = 28.349523125;

export function calculateBrew(input: BrewCalculationInput) {
  for (const [field, value] of [
    ["dose", input.dose],
    ["yield", input.yield],
    ["ratio", input.ratio],
  ] as const) {
    if (value !== undefined && (!Number.isFinite(value) || value <= 0)) {
      throw new ApiError(
        400,
        "validation_error",
        "Dose, yield, and ratio must be positive numbers.",
        { [field]: "Must be a positive number." },
      );
    }
  }

  const provided = [input.dose, input.yield, input.ratio].filter(
    (value) => value !== undefined,
  );

  if (provided.length !== 2) {
    throw new ApiError(
      400,
      "validation_error",
      "Provide exactly two of dose, yield, and ratio.",
    );
  }

  let doseGrams = input.dose === undefined ? undefined : toGrams(input.dose, input.unit);
  let yieldGrams =
    input.yield === undefined ? undefined : toGrams(input.yield, input.unit);
  let ratio = input.ratio;

  if (doseGrams === undefined) {
    doseGrams = yieldGrams! / ratio!;
  } else if (yieldGrams === undefined) {
    yieldGrams = doseGrams * ratio!;
  } else {
    ratio = yieldGrams / doseGrams;
  }

  return {
    dose: round(fromGrams(doseGrams, input.outputUnit)),
    yield: round(fromGrams(yieldGrams!, input.outputUnit)),
    ratio: round(ratio!, 2),
    unit: input.outputUnit,
    ratioLabel: `1:${round(ratio!, 2)}`,
  };
}

function toGrams(value: number, unit: MassUnit) {
  return unit === "oz" ? value * GRAMS_PER_OUNCE : value;
}

function fromGrams(value: number, unit: MassUnit) {
  return unit === "oz" ? value / GRAMS_PER_OUNCE : value;
}

function round(value: number, places = 3) {
  return Number(value.toFixed(places));
}
