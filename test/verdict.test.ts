import assert from "node:assert/strict";
import { test } from "node:test";
import { decideVerdict, errorSignature } from "../lib/verdict.ts";

const sig = "error: cannot find module 'left-pad'";
const log = `1| npm error cannot find module 'left-pad'`;

test("FLAKY when main passed and failed with the same error", () => {
  const verdict = decideVerdict({
    currentSignature: sig,
    history: [
      { conclusion: "failure", signature: sig },
      { conclusion: "success" },
    ],
    changedFiles: [],
    trimmedLog: log,
  });
  assert.equal(verdict.kind, "FLAKY");
  assert.ok(verdict.reason.length > 0);
});

test("BROKEN_ON_MAIN when the newest main run failed with the same error", () => {
  const verdict = decideVerdict({
    currentSignature: sig,
    history: [
      { conclusion: "failure", signature: sig },
      { conclusion: "failure", signature: "something else" },
    ],
    changedFiles: [],
    trimmedLog: log,
  });
  assert.equal(verdict.kind, "BROKEN_ON_MAIN");
});

test("YOUR_CHANGE lists the changed file that appears in the log", () => {
  const verdict = decideVerdict({
    currentSignature: sig,
    history: [{ conclusion: "failure", signature: "other" }],
    changedFiles: ["app/page.tsx", "lib/other.ts"],
    trimmedLog: `1| Error in app/page.tsx: boom`,
  });
  assert.equal(verdict.kind, "YOUR_CHANGE");
  assert.deepEqual(verdict.files, ["app/page.tsx"]);
});

test("FLAKY wins over BROKEN_ON_MAIN when a success exists", () => {
  const verdict = decideVerdict({
    currentSignature: sig,
    history: [
      { conclusion: "failure", signature: sig },
      { conclusion: "success" },
    ],
    changedFiles: [],
    trimmedLog: log,
  });
  assert.equal(verdict.kind, "FLAKY");
});

test("errorSignature ignores line numbers and digits", () => {
  const a = "3| Error: test failed at src/a.ts:12";
  const b = "99| Error: test failed at src/a.ts:987";
  assert.equal(errorSignature(a), errorSignature(b));
});
