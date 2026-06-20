import { handleShotAnalysisRequest } from "../../../lib/shot-analysis.ts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleShotAnalysisRequest(request);
}
