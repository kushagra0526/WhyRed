type Explanation = {
  rootCause: string;
  fix: string;
  cited: { line: number; text: string }[];
};

const SYSTEM = `You analyze failed CI logs. Each log line starts with its line number like '12| '. Reply with ONLY JSON: {"rootCause": one sentence, "fix": the concrete code change or command, "lines": 1-3 line numbers that prove the cause}. If the log does not show the cause, reply {"rootCause":"not enough info","fix":"","lines":[]}.`;

const NOT_ENOUGH: Explanation = { rootCause: "not enough info", fix: "", cited: [] };

function logLines(trimmedLog: string): Map<number, string> {
  const lines = new Map<number, string>();
  for (const match of trimmedLog.matchAll(/^(\d+)\| ?(.*)$/gm)) {
    lines.set(Number(match[1]), match[2]);
  }
  return lines;
}

async function ask(trimmedLog: string): Promise<string> {
  const response = await fetch(`${process.env.LLM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL,
      temperature: 0,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: trimmedLog },
      ],
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`LLM responded ${response.status}`);
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("LLM returned no content");
  return content;
}

function parse(content: string, lines: Map<number, string>): Explanation | null {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start === -1 || end <= start) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(content.slice(start, end + 1));
  } catch {
    return null;
  }

  const { rootCause, fix, lines: cited } = (parsed ?? {}) as {
    rootCause?: unknown;
    fix?: unknown;
    lines?: unknown;
  };
  if (typeof rootCause !== "string" || typeof fix !== "string") return null;
  if (!Array.isArray(cited) || cited.length > 3) return null;

  const evidence: Explanation["cited"] = [];
  for (const line of cited) {
    if (typeof line !== "number" || !lines.has(line)) return null;
    evidence.push({ line, text: lines.get(line)! });
  }
  return { rootCause, fix, cited: evidence };
}

export async function explain(trimmedLog: string): Promise<null | Explanation> {
  if (!process.env.LLM_API_KEY) return null;

  const lines = logLines(trimmedLog);
  for (let attempt = 0; attempt < 2; attempt++) {
    const content = await ask(trimmedLog).catch(() => null);
    if (content === null) continue;
    const result = parse(content, lines);
    if (result) return result;
  }
  return NOT_ENOUGH;
}
