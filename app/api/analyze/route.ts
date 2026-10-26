import { fetchFailure } from "@/lib/github";
import { trimLog } from "@/lib/trim";

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    if (typeof url !== "string" || !url) throw new Error("url is required");

    const { log, ...run } = await fetchFailure(url);
    return Response.json({ run, trimmedLog: trimLog(log) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 }
    );
  }
}
