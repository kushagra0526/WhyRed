import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { explain } from "../lib/explain.ts";

const LOG = "1| npm error boom\n2| Error: expected 2 to equal 3\n3|     at test.js:10:5";

const realFetch = globalThis.fetch;
let calls = 0;

function mockFetch(...contents: string[]) {
  calls = 0;
  globalThis.fetch = (async () => {
    const content = contents[Math.min(calls, contents.length - 1)];
    calls++;
    return Response.json({ choices: [{ message: { content } }] });
  }) as typeof fetch;
}

beforeEach(() => {
  process.env.LLM_API_KEY = "test-key";
  process.env.LLM_BASE_URL = "http://llm.test";
  process.env.LLM_MODEL = "test-model";
});

afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.LLM_API_KEY;
});

test("cites text from the log", async () => {
  mockFetch(
    JSON.stringify({
      rootCause: "Assertion failed.",
      fix: "Fix the assertion.",
      lines: [2, 3],
    })
  );

  const result = await explain(LOG);
  assert.deepEqual(result, {
    rootCause: "Assertion failed.",
    fix: "Fix the assertion.",
    cited: [
      { line: 2, text: "Error: expected 2 to equal 3" },
      { line: 3, text: "    at test.js:10:5" },
    ],
  });
});

test("parses JSON inside code fences", async () => {
  mockFetch(
    "```json\n" +
      JSON.stringify({ rootCause: "Missing module.", fix: "npm i left-pad", lines: [1] }) +
      "\n```"
  );

  const result = await explain(LOG);
  assert.equal(result?.rootCause, "Missing module.");
  assert.deepEqual(result?.cited, [{ line: 1, text: "npm error boom" }]);
});

test("retries once, then gives up on hallucinated lines", async () => {
  mockFetch(JSON.stringify({ rootCause: "x", fix: "y", lines: [99] }));

  const result = await explain(LOG);
  assert.deepEqual(result, { rootCause: "not enough info", fix: "", cited: [] });
  assert.equal(calls, 2);
});

test("returns null without an API key", async () => {
  delete process.env.LLM_API_KEY;
  mockFetch(JSON.stringify({ rootCause: "x", fix: "y", lines: [1] }));

  assert.equal(await explain(LOG), null);
  assert.equal(calls, 0);
});
