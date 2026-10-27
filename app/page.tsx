"use client";

import { useState } from "react";

type Analysis = {
  run: { name?: string; htmlUrl?: string };
  trimmedLog: string;
  verdict: {
    kind: "YOUR_CHANGE" | "BROKEN_ON_MAIN" | "FLAKY";
    reason: string;
    files: string[];
  };
  explanation: {
    rootCause: string;
    fix: string;
    cited: { line: number; text: string }[];
  } | null;
};

const SAMPLES = [
  {
    label: "Your change",
    url: "https://github.com/kushagra0526/whyred-demo/actions/runs/40403660749",
  },
  {
    label: "Broken on main",
    url: "https://github.com/kushagra0526/whyred-demo/actions/runs/40403670122",
  },
  {
    label: "Flaky",
    url: "https://github.com/kushagra0526/whyred-demo/actions/runs/40403119720",
  },
  {
    label: "Type error",
    url: "https://github.com/kushagra0526/whyred-demo/actions/runs/40401189375",
  },
];

const BADGES = {
  YOUR_CHANGE: { label: "It's your change", className: "badge your-change" },
  BROKEN_ON_MAIN: { label: "Main was already broken", className: "badge broken-on-main" },
  FLAKY: { label: "Flaky test", className: "badge flaky" },
};

const LOADING = "Reading the logs and checking main's history…";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Analysis | null>(null);
  const [copied, setCopied] = useState(false);

  async function analyze(target = url) {
    if (!target || loading) return;
    setLoading(true);
    setError("");
    setResult(null);
    setCopied(false);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Request failed");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function pick(sample: (typeof SAMPLES)[number]) {
    setUrl(sample.url);
    analyze(sample.url);
  }

  async function copyFix(fix: string) {
    await navigator.clipboard.writeText(fix);
    setCopied(true);
  }

  const badge = result ? BADGES[result.verdict.kind] : null;

  return (
    <main>
      <header>
        <h1>WhyRed</h1>
        <p className="tagline">
          CI failed? Find out in 10 seconds if it&apos;s your fault, a flaky
          test, or already broken on main.
        </p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          analyze();
        }}
      >
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/owner/repo/actions/runs/123"
          aria-label="GitHub Actions run URL"
        />
        <button type="submit" disabled={loading}>
          Diagnose
        </button>
      </form>

      <div className="samples">
        {SAMPLES.map((sample) => (
          <button
            key={sample.label}
            type="button"
            className="sample"
            onClick={() => pick(sample)}
            disabled={loading}
          >
            {sample.label}
          </button>
        ))}
      </div>

      {loading && <p className="muted">{LOADING}</p>}
      {error && <p className="error">{error}</p>}

      {result && badge && (
        <section className="result">
          <div className={badge.className}>{badge.label}</div>
          <p>{result.verdict.reason}</p>
          {result.verdict.files.length > 0 && (
            <ul className="files">
              {result.verdict.files.map((file) => (
                <li key={file}>
                  <code>{file}</code>
                </li>
              ))}
            </ul>
          )}

          {result.explanation ? (
            <>
              <h2>Root cause</h2>
              <p>{result.explanation.rootCause}</p>
              <h2>Fix</h2>
              <div className="fix">
                <p>{result.explanation.fix}</p>
                {result.explanation.fix && (
                  <button type="button" onClick={() => copyFix(result.explanation!.fix)}>
                    {copied ? "Copied" : "Copy"}
                  </button>
                )}
              </div>
              <h2>Evidence</h2>
              <ul className="evidence">
                {result.explanation.cited.map((line) => (
                  <li key={line.line}>
                    <code>
                      <span className="line-number">{line.line}</span> {line.text}
                    </code>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="muted">AI explanation unavailable</p>
          )}

          <details>
            <summary>Trimmed log</summary>
            <pre>{result.trimmedLog}</pre>
          </details>
        </section>
      )}
    </main>
  );
}
