export type ApiErrorPayload = {
  code: string;
  message: string;
  fields?: Record<string, string>;
};

export class ClientApiError extends Error {
  readonly status: number;
  readonly payload: ApiErrorPayload;

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.message);
    this.status = status;
    this.payload = payload;
  }
}

export async function fetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const fallback = {
      code: "request_failed",
      message: "The request could not be completed.",
    };
    const errorData = await readOptionalJson(response);

    throw new ClientApiError(
      response.status,
      isApiErrorResponse(errorData) ? errorData.error : fallback,
    );
  }

  const data = await response.json();
  return data as T;
}

export function getErrorMessage(error: unknown) {
  if (error instanceof ClientApiError) {
    return error.payload.message;
  }
  return "The request could not be completed.";
}

function isApiErrorResponse(
  value: unknown,
): value is { error: ApiErrorPayload } {
  if (!value || typeof value !== "object" || !("error" in value)) {
    return false;
  }

  const error = (value as { error: unknown }).error;
  return (
    !!error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string" &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  );
}

async function readOptionalJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}
