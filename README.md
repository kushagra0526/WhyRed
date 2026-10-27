# WhyRed

**CI failed? Find out in 10 seconds if it's your change, a flaky test, or main was already broken.**

🔗 **Live:** https://why-red.vercel.app
🎬 **Demo:** <link to your X post>

When a GitHub Actions run goes red, the first question is always *"is it me?"* You open thousands of log lines to find out. WhyRed answers that question first, then tells you what broke and how to fix it.

## How it works

Paste a failed GitHub Actions run URL (public repo).

1. **Verdict, computed in plain code (no AI guessing):**
   | Verdict | Rule |
   |---|---|
   | 🟡 **Flaky test** | The same commit passed in another run, or main both passed and failed with the same error |
   | 🟣 **Main was already broken** | The latest run on main failed with the same error signature |
   | 🔴 **It's your change** | Otherwise, plus which of your changed files appear in the error |
2. **Log trimming:** finds the failed step and strips timestamps, color codes and download noise, so the log fits a small open model.
3. **AI explanation with verified evidence:** a small open model (Qwen3.8 27B) gives the root cause and fix, citing log line numbers. WhyRed checks that every cited line really exists in the log. If it doesn't, it retries once, then says "not enough info" instead of guessing.

## Results

Tested against real failed runs in [whyred-demo](https://github.com/kushagra0526/whyred-demo), a repo of deliberately broken CI:

| Scenario | Expected | WhyRed | Verdict time |
|---|---|---|---|
| PR breaks a passing test | Your change | ✅ Your change (`src/math.js`) | 4s |
| PR on top of broken lint | Main was already broken | ✅ Main was already broken | 7s |
| Random test, same commit passed and failed | Flaky | ✅ Flaky | 4s |
| Failing unit test introduced on main | Your change | ✅ Your change (`failing.test.js`) | 5s |
| Lint error introduced on main | Your change | ✅ Your change (`lint-error.js`) | 4s |

## Built with Alan AI

Every line of code was written by [Alan AI](https://tryalan.ai) agents running open models (DeepSeek V4 Pro / V4.1 Flash), one agent per job:

| Alan agent | What it did |
|---|---|
| **PM Agent** | Wrote the PRD and broke it into 8 tasks with acceptance criteria |
| **Orchestrator** | Scaffolded the app ([#1](https://github.com/kushagra0526/WhyRed/pull/1)) |
| **Review Agent** + `ponytail-review` | Reviewed PRs and flagged issues before merge |
| **General Agent** | Built the log fetcher and trimmer ([#2](https://github.com/kushagra0526/WhyRed/pull/2)), the verdict engine ([#3](https://github.com/kushagra0526/WhyRed/pull/3)), the explainer and UI ([#4](https://github.com/kushagra0526/WhyRed/pull/4)), and the demo repo |

Coding rules for every agent live in [`AGENTS.md`](AGENTS.md) (ponytail: smallest complete change, tests for every piece of logic).

## Run locally

Requires Node 20.9 or newer. Create `.env.local`:

```
GITHUB_TOKEN=...        # fine-grained token, public repos read-only
LLM_BASE_URL=...        # any OpenAI-compatible endpoint
LLM_API_KEY=...
LLM_MODEL=...
```

```
npm ci
npm run dev
npm test
```

## License

MIT
