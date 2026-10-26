export type Verdict = {
  kind: "FLAKY" | "BROKEN_ON_MAIN" | "YOUR_CHANGE";
  reason: string;
  files: string[];
};

const SIGNAL = /error|fail|not ok|✖|assert/i;
const PREFIX = /^\d+\| /;
const PATH = /(?:[A-Za-z]:)?(?:[\w.@-]+[\\/])+([\w.@-]+)/g;

export function errorSignature(trimmedLog: string): string {
  return trimmedLog
    .split(/\r?\n/)
    .filter((line) => SIGNAL.test(line) && !line.includes("Process completed with exit code"))
    .map((line) =>
      line
        .replace(PREFIX, "")
        .replace(PATH, "$1")
        .replace(/\d+/g, "#")
        .toLowerCase()
        .trim()
    )
    .slice(0, 5)
    .join("\n");
}

function basename(file: string): string {
  return file.split(/[\\/]/).pop() ?? file;
}

export function decideVerdict(i: {
  currentSignature: string;
  history: { conclusion: "success" | "failure"; signature?: string }[];
  changedFiles: string[];
  trimmedLog: string;
}): Verdict {
  const passed = i.history.some((h) => h.conclusion === "success");
  const sameFailure = i.history.filter(
    (h) => h.conclusion === "failure" && h.signature === i.currentSignature
  ).length;

  if (passed && sameFailure > 0) {
    return {
      kind: "FLAKY",
      reason: `Main passed recently but failed with the same error ${sameFailure} time(s), so this looks flaky.`,
      files: [],
    };
  }

  if (i.history[0]?.conclusion === "failure" && i.history[0].signature === i.currentSignature) {
    return {
      kind: "BROKEN_ON_MAIN",
      reason: "The latest completed run on main failed with the same error, so main is broken.",
      files: [],
    };
  }

  const files = i.changedFiles.filter((file) => i.trimmedLog.includes(basename(file)));
  return {
    kind: "YOUR_CHANGE",
    reason: files.length
      ? `The failure mentions ${files.map(basename).join(", ")}, which your change touched.`
      : "The failure is not a known main failure and none of your changed files appear in the log, so check your change.",
    files,
  };
}
