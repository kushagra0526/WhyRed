import { trimLog } from "./trim.ts";
import { errorSignature } from "./verdict.ts";

const RUN_URL =
  /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/actions\/runs\/(\d+)(?:\/job\/(\d+))?\/?$/;

export function parseRunUrl(url: string): {
  owner: string;
  repo: string;
  runId: number;
  jobId?: number;
} {
  const match = url.split(/[?#]/)[0].match(RUN_URL);
  if (!match) throw new Error("Not a GitHub Actions run URL");
  const [, owner, repo, runId, jobId] = match;
  return { owner, repo, runId: Number(runId), ...(jobId ? { jobId: Number(jobId) } : {}) };
}

const API = "https://api.github.com";

function headers() {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
  };
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: headers() });
  if (res.status === 404) throw new Error("Repo is private or run not found");
  if (!res.ok) throw new Error(`GitHub API error ${res.status}`);
  return res.json() as Promise<T>;
}

type Step = { name: string; conclusion: string | null };

type Job = { id: number; name: string; conclusion: string | null; steps: Step[] };

export async function fetchFailure(url: string) {
  const { owner, repo, runId, jobId } = parseRunUrl(url);
  const base = `${API}/repos/${owner}/${repo}/actions`;

  const run = await getJson<any>(`${base}/runs/${runId}`);
  if (run.status !== "completed") throw new Error("Run is still in progress");
  if (run.conclusion !== "failure") throw new Error("This run didn't fail");

  const { jobs } = await getJson<{ jobs: Job[] }>(`${base}/runs/${runId}/jobs`);
  const job = jobId
    ? jobs.find((j) => j.id === jobId)
    : jobs.find((j) => j.conclusion === "failure");
  if (!job) throw new Error("No failed job found");

  const logRes = await fetch(`${base}/jobs/${job.id}/logs`, { headers: headers() });
  if (!logRes.ok) throw new Error(`Could not fetch logs (${logRes.status})`);
  const log = await logRes.text();

  return {
    owner,
    repo,
    runId,
    runAttempt: run.run_attempt,
    headBranch: run.head_branch,
    headSha: run.head_sha,
    event: run.event,
    workflowId: run.workflow_id,
    pullRequests: run.pull_requests,
    createdAt: run.created_at as string,
    job: { id: job.id, name: job.name, steps: job.steps },
    log,
  };
}

type Run = {
  owner: string;
  repo: string;
  runId: number;
  workflowId: number;
  headSha: string;
  pullRequests: { number: number }[];
  createdAt: string;
  job: { name: string };
};

export async function fetchVerdictInput(run: Run, currentSignature: string) {
  const base = `${API}/repos/${run.owner}/${run.repo}`;
  const { default_branch } = await getJson<{ default_branch: string }>(base);

  const { workflow_runs } = await getJson<{ workflow_runs: any[] }>(
    `${base}/actions/workflows/${run.workflowId}/runs?branch=${default_branch}&status=completed&per_page=10`
  );
  const runs = workflow_runs
    .filter((r) => r.id !== run.runId && r.created_at < run.createdAt)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  const history: { conclusion: "success" | "failure"; signature?: string }[] = [];
  let failures = 0;
  for (const r of runs) {
    if (r.conclusion === "success") {
      history.push({ conclusion: "success" });
      continue;
    }
    if (r.conclusion !== "failure") continue;
    const entry: { conclusion: "failure"; signature?: string } = { conclusion: "failure" };
    history.push(entry);
    if (failures++ >= 3) continue;

    const { jobs } = await getJson<{ jobs: Job[] }>(`${base}/actions/runs/${r.id}/jobs`);
    const job = jobs.find((j) => j.name === run.job.name);
    if (!job) continue;
    const logRes = await fetch(`${base}/actions/jobs/${job.id}/logs`, { headers: headers() });
    if (!logRes.ok) continue;
    entry.signature = errorSignature(trimLog(await logRes.text()));
  }

  const changedFiles = run.pullRequests[0]
    ? (
        await getJson<{ filename: string }[]>(
          `${base}/pulls/${run.pullRequests[0].number}/files?per_page=100`
        )
      ).map((f) => f.filename)
    : (
        await getJson<{ files: { filename: string }[] }>(
          `${base}/commits/${run.headSha}`
        )
      ).files.map((f) => f.filename);

  return { history, changedFiles };
}
