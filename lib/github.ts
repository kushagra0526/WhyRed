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
    job: { id: job.id, name: job.name, steps: job.steps },
    log,
  };
}
