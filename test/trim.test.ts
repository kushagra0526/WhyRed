import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { trimLog } from "../lib/trim.ts";

const fixtures = [
  { name: "unit-test", key: "2 !== 3" },
  { name: "missing-dependency", key: "left-pad" },
  { name: "typecheck", key: "npm error" },
  { name: "lint", key: "unusedValue" },
];

for (const { name, key } of fixtures) {
  test(`trims ${name} log`, () => {
    const raw = readFileSync(new URL(`./fixtures/${name}.log`, import.meta.url), "utf8");
    const out = trimLog(raw);
    assert.ok(out.includes("##[error]"), "keeps the error line");
    assert.ok(out.length < 8000, `output is ${out.length} chars`);
    assert.ok(out.includes(key), `keeps key text ${key}`);
  });
}
