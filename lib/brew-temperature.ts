import { ApiError } from "./api.ts";

type ZipPlace = {
  "place name": string;
  state: string;
  latitude: string;
  longitude: string;
};

type ZipResponse = {
  places?: ZipPlace[];
};

type ElevationResponse = {
  elevation?: number[];
};

const BASE_TARGET_C = 93.5;
const STANDARD_MIN_C = 90.5;
const STANDARD_MAX_C = 96.1;
const BOILING_MARGIN_C = 1.1;

export async function temperatureForZip(
  zip: string,
  fetcher: typeof fetch = fetch,
) {
  const place = await lookupZip(zip, fetcher);
  const elevationMeters = await lookupElevation(place, fetcher);

  return temperatureGuidance(zip, place, elevationMeters);
}

export function temperatureGuidance(
  zip: string,
  place: Pick<ZipPlace, "place name" | "state" | "latitude" | "longitude">,
  elevationMeters: number,
) {
  const boilingCelsius = boilingPointCelsius(elevationMeters);
  const practicalMaximumCelsius = boilingCelsius - BOILING_MARGIN_C;
  const targetCelsius = Math.min(BASE_TARGET_C, practicalMaximumCelsius);
  const rangeMaximumCelsius = Math.min(STANDARD_MAX_C, practicalMaximumCelsius);
  const isConstrained = rangeMaximumCelsius < STANDARD_MIN_C;

  return {
    location: {
      zip,
      name: place["place name"],
      state: place.state,
      latitude: Number(place.latitude),
      longitude: Number(place.longitude),
      elevation: {
        meters: Math.round(elevationMeters),
        feet: Math.round(elevationMeters * 3.28084),
      },
    },
    temperature: {
      estimatedBoilingPoint: formatTemperature(boilingCelsius),
      recommendedTarget: formatTemperature(targetCelsius),
      recommendedRange: {
        minimum: formatTemperature(Math.min(STANDARD_MIN_C, rangeMaximumCelsius)),
        maximum: formatTemperature(rangeMaximumCelsius),
      },
    },
    guidance: isConstrained
      ? "The local boiling point limits the usual espresso temperature range. Brew as hot as the equipment safely allows, then compensate with a finer grind or longer ratio if the shot tastes sour."
      : "Start near the recommended target, then move hotter for sour shots or cooler for bitter, dry shots.",
    caveat:
      "ZIP codes use a centroid and local elevation can vary. Machine temperature accuracy and roast level also affect the best setting.",
    sources: [
      {
        name: "Zippopotam.us",
        url: "https://docs.zippopotam.us/",
        role: "ZIP-code centroid",
      },
      {
        name: "Open-Meteo Elevation API",
        url: "https://open-meteo.com/en/docs/elevation-api",
        role: "Terrain elevation",
      },
    ],
  };
}

async function lookupZip(zip: string, fetcher: typeof fetch) {
  const response = await fetchUpstream(
    fetcher,
    `https://api.zippopotam.us/us/${zip}`,
  );

  if (response.status === 404) {
    throw new ApiError(404, "zip_not_found", "No location was found for that ZIP code.");
  }
  if (!response.ok) {
    throw upstreamError();
  }

  const data = (await response.json()) as ZipResponse;
  const place = data.places?.[0];

  if (
    !place ||
    !Number.isFinite(Number(place.latitude)) ||
    !Number.isFinite(Number(place.longitude))
  ) {
    throw upstreamError();
  }

  return place;
}

async function lookupElevation(place: ZipPlace, fetcher: typeof fetch) {
  const url = new URL("https://api.open-meteo.com/v1/elevation");
  url.searchParams.set("latitude", place.latitude);
  url.searchParams.set("longitude", place.longitude);

  const response = await fetchUpstream(fetcher, url);
  if (!response.ok) {
    throw upstreamError();
  }

  const data = (await response.json()) as ElevationResponse;
  const elevation = data.elevation?.[0];

  if (typeof elevation !== "number" || !Number.isFinite(elevation)) {
    throw upstreamError();
  }

  return elevation;
}

function upstreamError() {
  return new ApiError(
    502,
    "location_service_unavailable",
    "Location or elevation data is temporarily unavailable.",
  );
}

async function fetchUpstream(fetcher: typeof fetch, url: string | URL) {
  try {
    return await fetcher(url, {
      cache: "force-cache",
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    throw upstreamError();
  }
}

function boilingPointCelsius(elevationMeters: number) {
  const pressureRatio = Math.pow(1 - 2.25577e-5 * elevationMeters, 5.25588);
  const kelvin =
    1 /
    (1 / 373.15 - (8.314462618 * Math.log(pressureRatio)) / 40_657);
  return kelvin - 273.15;
}

function formatTemperature(celsius: number) {
  return {
    celsius: round(celsius),
    fahrenheit: round((celsius * 9) / 5 + 32),
  };
}

function round(value: number) {
  return Number(value.toFixed(1));
}
