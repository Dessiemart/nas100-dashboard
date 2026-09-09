/**
 * Talks to the bot's GitHub repo directly - reads state/alerts for the
 * dashboard, reads/writes settings.json for the settings page, and
 * triggers a manual run via the same workflow_dispatch mechanism the
 * Apps Script trigger uses.
 *
 * GITHUB_PAT here needs "Contents: read and write" + "Actions: read
 * and write" permissions (fine-grained, scoped to just this one repo).
 * This is a SEPARATE token from the one used in Apps Script - keep
 * them as two different tokens so you can revoke one without breaking
 * the other.
 */

const OWNER = process.env.GITHUB_OWNER;
const REPO = process.env.GITHUB_REPO;
const TOKEN = process.env.GITHUB_PAT;
const BRANCH = "main";

const API_BASE = `https://api.github.com/repos/${OWNER}/${REPO}`;

async function githubFetch(path, options = {}) {
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/vnd.github+json",
      ...(options.headers || {}),
    },
  });
}

export async function getFile(filePath) {
  const res = await githubFetch(`/contents/${filePath}?ref=${BRANCH}`);
  if (res.status === 404) return { content: null, sha: null };
  if (!res.ok) throw new Error(`GitHub getFile failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const content = Buffer.from(data.content, "base64").toString("utf-8");
  return { content, sha: data.sha };
}

export async function getJsonFile(filePath, fallback = {}) {
  const { content } = await getFile(filePath);
  if (!content) return fallback;
  try {
    return JSON.parse(content);
  } catch {
    return fallback;
  }
}

export async function updateJsonFile(filePath, obj, message) {
  const { sha } = await getFile(filePath);
  const content = Buffer.from(JSON.stringify(obj, null, 2)).toString("base64");
  const res = await githubFetch(`/contents/${filePath}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: message || `Update ${filePath} via dashboard`,
      content,
      sha: sha || undefined,
      branch: BRANCH,
    }),
  });
  if (!res.ok) throw new Error(`GitHub updateFile failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function dispatchWorkflow(workflowFile) {
  const res = await githubFetch(`/actions/workflows/${workflowFile}/dispatches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ref: BRANCH }),
  });
  if (res.status !== 204) {
    const body = await res.text();
    console.error(`GitHub dispatch failed: status=${res.status} body=${body}`);
    throw new Error(`GitHub dispatch failed: ${res.status} ${body}`);
  }
}
