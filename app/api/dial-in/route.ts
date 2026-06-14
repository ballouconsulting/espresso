import {
  apiErrorResponse,
  finiteNumber,
  json,
  readJsonObject,
  ApiError,
} from "../../../lib/api.ts";
import { assessShot, tastes, type Taste } from "../../../lib/dial-in.ts";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const taste = body.taste;

    if (taste !== undefined && !tastes.includes(taste as Taste)) {
      throw new ApiError(400, "validation_error", "Check the request fields.", {
        taste: `Must be one of: ${tastes.join(", ")}.`,
      });
    }

    return json(
      assessShot({
        doseGrams: finiteNumber(body, "doseGrams", { min: 5, max: 40 })!,
        yieldGrams: finiteNumber(body, "yieldGrams", { min: 5, max: 150 })!,
        timeSeconds: finiteNumber(body, "timeSeconds", { min: 1, max: 120 })!,
        ...(taste ? { taste: taste as Taste } : {}),
      }),
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
