import assert from "node:assert/strict";
import { test } from "node:test";
import { parseRunUrl } from "../lib/github.ts";

test("parses a run URL", () => {
  assert.deepEqual(
    parseRunUrl("https://github.com/kushagra0526/whyred-demo/actions/runs/40389181099"),
    { owner: "kushagra0526", repo: "whyred-demo", runId: 40389181099 }
  );
});

test("parses a job URL with query string", () => {
  assert.deepEqual(
    parseRunUrl(
      "https://github.com/kushagra0526/whyred-demo/actions/runs/40389181099/job/121805365175?pr=1"
    ),
    { owner: "kushagra0526", repo: "whyred-demo", runId: 40389181099, jobId: 121805365175 }
  );
});

test("rejects a non-run URL", () => {
  assert.throws(() => parseRunUrl("hello"), { message: "Not a GitHub Actions run URL" });
});
