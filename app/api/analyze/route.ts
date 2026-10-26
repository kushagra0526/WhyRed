import { fetchFailure, fetchVerdictInput } from "@/lib/github";
import { trimLog } from "@/lib/trim";
import { decideVerdict, errorSignature } from "@/lib/verdict";

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    if (typeof url !== "string" || !url) throw new Error("url is required");

    const { log, ...run } = await fetchFailure(url);
    const trimmedLog = trimLog(log);
    const currentSignature = errorSignature(trimmedLog);
    const { history, changedFiles } = await fetchVerdictInput(run, currentSignature);
    const verdict = decideVerdict({ currentSignature, history, changedFiles, trimmedLog });

    return Response.json({ run, trimmedLog, verdict });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 }
    );
  }
}
