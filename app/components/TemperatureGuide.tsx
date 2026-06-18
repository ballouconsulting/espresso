"use client";

import { FormEvent, useMemo, useState } from "react";
import { fetchJson, getErrorMessage } from "../../lib/client-api.ts";

type TemperatureValue = {
  celsius: number;
  fahrenheit: number;
};

type TemperatureGuidance = {
  location: {
    zip: string;
    name: string;
    state: string;
    latitude: number;
    longitude: number;
    elevation: {
      meters: number;
      feet: number;
    };
  };
  temperature: {
    estimatedBoilingPoint: TemperatureValue;
    recommendedTarget: TemperatureValue;
    recommendedRange: {
      minimum: TemperatureValue;
      maximum: TemperatureValue;
    };
  };
  guidance: string;
  caveat: string;
  sources: Array<{
    name: string;
    url: string;
    role: string;
  }>;
};

const SEA_LEVEL_BOILING_F = 212;
const SEA_LEVEL_TARGET_F = 200.3;
const SEA_LEVEL_RANGE_F = "194.9-205.0°F";

export function TemperatureGuide() {
  const [zip, setZip] = useState("");
  const [result, setResult] = useState<TemperatureGuidance | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  const boilingDelta = useMemo(() => {
    if (!result) {
      return null;
    }

    return Number(
      (result.temperature.estimatedBoilingPoint.fahrenheit - SEA_LEVEL_BOILING_F).toFixed(1),
    );
  }, [result]);

  const submitZip = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    setError("");
    setResult(null);

    try {
      const data = await fetchJson<TemperatureGuidance>(
        `/api/brew-temperature?zip=${encodeURIComponent(zip.trim())}`,
      );
      setResult(data);
      setStatus("idle");
    } catch (fetchError) {
      setResult(null);
      setError(getErrorMessage(fetchError));
      setStatus("error");
    }
  };

  return (
    <section className="temperature-section" id="temperature">
      <div className="shell temperature-grid">
        <div className="temperature-copy">
          <p className="eyebrow">Altitude-aware temperature</p>
          <h2>
            Start at sea level.
            <br />
            <em>Then adjust for your ZIP.</em>
          </h2>
          <p>
            At sea level, water boils around {SEA_LEVEL_BOILING_F}°F and a
            practical espresso target is about {SEA_LEVEL_TARGET_F}°F inside a{" "}
            {SEA_LEVEL_RANGE_F} range. Higher elevation lowers the boiling
            point, which can cap the useful brew temperature and make finer
            grind or longer yield more important for sour shots.
          </p>
        </div>

        <form className="temperature-card" onSubmit={submitZip}>
          <div className="tool-card-top">
            <span>Location check</span>
            <span>ZIP centroid</span>
          </div>
          <label>
            <span>Your ZIP code</span>
            <input
              inputMode="numeric"
              maxLength={5}
              onChange={(event) => setZip(event.currentTarget.value)}
              pattern="[0-9]{5}"
              placeholder="80302"
              value={zip}
            />
          </label>
          <button className="button primary tool-submit" disabled={status === "loading"} type="submit">
            {status === "loading" ? "Checking elevation" : "Find brew temperature"}
          </button>
          {error ? <p className="tool-error">{error}</p> : null}

          <div className="temperature-result" aria-live="polite">
            {result && boilingDelta !== null ? (
              <>
                <div className="temperature-main">
                  <span>Recommended target</span>
                  <strong>{formatTemp(result.temperature.recommendedTarget)}</strong>
                </div>
                <div className="temperature-details">
                  <span>
                    Range{" "}
                    <strong>
                      {formatTemp(result.temperature.recommendedRange.minimum)} to{" "}
                      {formatTemp(result.temperature.recommendedRange.maximum)}
                    </strong>
                  </span>
                  <span>
                    Boiling point{" "}
                    <strong>
                      {formatTemp(result.temperature.estimatedBoilingPoint)}
                    </strong>
                  </span>
                  <span>
                    Location{" "}
                    <strong>
                      {result.location.name}, {result.location.state}
                    </strong>
                  </span>
                  <span>
                    Elevation <strong>{result.location.elevation.feet.toLocaleString()} ft</strong>
                  </span>
                </div>
                <p className="altitude-note">
                  This ZIP lands {formatDelta(boilingDelta)} sea level boiling.
                  {boilingDelta < 0
                    ? " That lower ceiling can limit high temperature settings."
                    : " That leaves normal espresso temperatures unconstrained."}
                </p>
                <p>{result.guidance}</p>
                <p className="caveat">{result.caveat}</p>
              </>
            ) : (
              <div className="empty-result">
                <span className="result-kicker">Sea-level anchor</span>
                <h3>Normal range first, altitude second.</h3>
                <p>
                  Enter a ZIP to see whether your location meaningfully changes
                  the target temperature window.
                </p>
              </div>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}

function formatTemp(value: TemperatureValue) {
  return `${value.fahrenheit.toFixed(1)}°F`;
}

function formatDelta(delta: number) {
  if (delta === 0) {
    return "right at";
  }

  return `${Math.abs(delta).toFixed(1)}°F ${delta > 0 ? "above" : "below"}`;
}
