import { apiErrorResponse, ApiError, json } from "../../../lib/api.ts";
import { temperatureForZip } from "../../../lib/brew-temperature.ts";

export async function GET(request: Request) {
  try {
    const zip = new URL(request.url).searchParams.get("zip")?.trim();

    if (!zip || !/^\d{5}$/.test(zip)) {
      throw new ApiError(400, "validation_error", "Check the request fields.", {
        zip: "Must be a five-digit US ZIP code.",
      });
    }

    return json(await temperatureForZip(zip));
  } catch (error) {
    return apiErrorResponse(error);
  }
}
