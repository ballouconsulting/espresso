export type ShotAnalysisStreamEvent =
  | { type: "thinking"; delta: string }
  | { type: "thinking_complete" }
  | { type: "answer"; delta: string };

export type ShotAnalysisStreamParts = {
  answer?: string;
  thinking?: string;
};

export function encodeShotAnalysisStreamEvent(event: ShotAnalysisStreamEvent) {
  return `${JSON.stringify(event)}\n`;
}

export function streamPartsFromChunk(chunk: unknown): ShotAnalysisStreamParts {
  if (typeof chunk === "string") {
    return { answer: chunk };
  }

  if (!chunk || typeof chunk !== "object") {
    return {};
  }

  const record = chunk as Record<string, unknown>;
  let thinking = "";
  let answer = "";

  if (Array.isArray(record.content)) {
    for (const part of record.content) {
      thinking += reasoningPartToText(part);
      answer += visibleAnswerPartToText(part);
    }
  } else if ("content" in record) {
    answer = visibleAnswerFromContent(record.content);
  }

  const additionalKwargs = record.additional_kwargs;
  if (additionalKwargs && typeof additionalKwargs === "object") {
    const reasoning = (additionalKwargs as Record<string, unknown>).reasoning_content;
    if (typeof reasoning === "string") {
      thinking += reasoning;
    }
  }

  const hasReasoningTrace = reasoningTraceInChunk(record);

  if (typeof record.text === "string" && record.text) {
    if (!answer) {
      if (thinking || hasReasoningTrace) {
        if (!thinking) {
          thinking = record.text;
        }
      } else {
        answer = record.text;
      }
    }
  }

  return {
    ...(thinking ? { thinking } : {}),
    ...(answer ? { answer } : {}),
  };
}

function reasoningTraceInChunk(record: Record<string, unknown>) {
  const additionalKwargs = record.additional_kwargs;
  if (additionalKwargs && typeof additionalKwargs === "object") {
    const reasoning = (additionalKwargs as Record<string, unknown>).reasoning_content;
    if (typeof reasoning === "string" && reasoning) {
      return true;
    }
  }

  const content = record.content;
  if (!Array.isArray(content)) {
    return false;
  }

  return content.some((part) => {
    if (!part || typeof part !== "object") {
      return false;
    }

    const block = part as Record<string, unknown>;
    return block.type === "reasoning" || block.type === "reasoning-delta";
  });
}

function visibleAnswerFromContent(content: unknown) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content.map((part) => visibleAnswerPartToText(part)).join("");
  }

  return "";
}

function visibleAnswerPartToText(part: unknown) {
  if (typeof part === "string") {
    return part;
  }

  if (!part || typeof part !== "object") {
    return "";
  }

  const block = part as Record<string, unknown>;

  if (block.type === "reasoning" || block.type === "reasoning-delta") {
    return "";
  }

  if (typeof block.text === "string") {
    return block.text;
  }

  if (block.type === "text-delta" && typeof block.text === "string") {
    return block.text;
  }

  if (block.type === "text" && typeof block.text === "string") {
    return block.text;
  }

  return "";
}

function reasoningPartToText(part: unknown) {
  if (!part || typeof part !== "object") {
    return "";
  }

  const block = part as Record<string, unknown>;

  if (typeof block.reasoning === "string") {
    return block.reasoning;
  }

  if (block.type === "reasoning-delta" && typeof block.reasoning === "string") {
    return block.reasoning;
  }

  if (block.type === "reasoning" && typeof block.reasoning === "string") {
    return block.reasoning;
  }

  return "";
}
