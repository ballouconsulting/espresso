import {
  apiErrorResponse,
  ApiError,
  finiteNumber,
  json,
  readJsonObject,
} from "../../../lib/api.ts";
import {
  calculateBrew,
  massUnits,
  type MassUnit,
} from "../../../lib/brew-calculator.ts";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const unit = readUnit(body.unit, "unit", "g");
    const outputUnit = readUnit(body.outputUnit, "outputUnit", unit);

    return json({
      calculation: calculateBrew({
        dose: finiteNumber(body, "dose", { min: 0.1, max: 1000, optional: true }),
        yield: finiteNumber(body, "yield", { min: 0.1, max: 5000, optional: true }),
        ratio: finiteNumber(body, "ratio", { min: 0.1, max: 100, optional: true }),
        unit,
        outputUnit,
      }),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

function readUnit(value: unknown, field: string, fallback: MassUnit) {
  if (value === undefined) {
    return fallback;
  }
  if (!massUnits.includes(value as MassUnit)) {
    throw new ApiError(400, "validation_error", "Check the request fields.", {
      [field]: `Must be one of: ${massUnits.join(", ")}.`,
    });
  }
  return value as MassUnit;
}
