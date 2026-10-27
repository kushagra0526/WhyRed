import { explain } from "@/lib/explain";
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
    const [{ history, changedFiles, sameCommitPassed }, explanation] =
      await Promise.all([
        fetchVerdictInput(run, currentSignature),
        explain(trimmedLog),
      ]);
    const verdict = decideVerdict({
      currentSignature,
      history,
      changedFiles,
      trimmedLog,
      sameCommitPassed,
    });

    return Response.json({ run, trimmedLog, verdict, explanation });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 }
    );
  }
}
