export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string>;

  constructor(
    status: number,
    code: string,
    message: string,
    fields?: Record<string, string>,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function readJsonObject(request: Request) {
  let value: unknown;

  try {
    value = await request.json();
  } catch {
    throw new ApiError(400, "invalid_json", "Request body must be valid JSON.");
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, "invalid_request", "Request body must be a JSON object.");
  }

  return value as Record<string, unknown>;
}

export function apiErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.fields ? { fields: error.fields } : {}),
        },
      },
      error.status,
    );
  }

  console.error(error);
  return json(
    {
      error: {
        code: "internal_error",
        message: "The request could not be completed.",
      },
    },
    500,
  );
}

export function finiteNumber(
  body: Record<string, unknown>,
  field: string,
  options: { min: number; max: number; optional?: boolean },
) {
  const value = body[field];

  if (value === undefined && options.optional) {
    return undefined;
  }

  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < options.min ||
    value > options.max
  ) {
    throw new ApiError(400, "validation_error", "Check the request fields.", {
      [field]: `Must be a number from ${options.min} to ${options.max}.`,
    });
  }

  return value;
}
