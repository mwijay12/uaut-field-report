// The admin has no server of its own. It reads and writes one file,
// content/site.json, through GitHub's API, with a token the owner makes for
// this repository. A commit to that file is what publishes: Vercel sees it
// and rebuilds the site.
//
// The token is sent to api.github.com and nowhere else.

const GITHUB = 'https://api.github.com';

export class GitHubError extends Error {
  constructor(status, message, hint) {
    super(message);
    this.status = status;
    this.hint = hint;
  }
}

// What a status code means here, in words the owner can act on.
function hintFor(status, message) {
  if (status === 401) return 'GitHub did not accept the token. It may have expired or been deleted. Make a new one and sign in again.';
  if (status === 403 && /rate limit/i.test(message)) return 'GitHub is asking this token to slow down. Wait a few minutes.';
  if (status === 403) return 'The token is not allowed to do this. Give it "Contents: Read and write" for this repository.';
  if (status === 404) return 'GitHub cannot find that with this token. Check the repository name and that the token covers it.';
  if (status === 409) return 'The file changed on GitHub since it was loaded here.';
  if (status === 422) return 'GitHub refused the change. The branch or the file path may be wrong.';
  if (status === 0) return 'No answer from GitHub. Check the connection.';
  return `GitHub answered ${status}.`;
}

const encodePath = (path) => path.split('/').map(encodeURIComponent).join('/');

// The file holds text beyond ASCII (an em dash, Kiswahili), and atob/btoa only
// know bytes, so the text goes through UTF-8 on the way in and out.
function fromBase64(base64) {
  const binary = atob(base64.replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}

function toBase64(text) {
  let binary = '';
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/**
 * @param {{ token: string, repo: string, branch: string, file: string }} where
 */
export function createGitHub({ token, repo, branch, file }) {
  const base = GITHUB;
  let name = repo; // replaced by the name GitHub reports, which follows a rename

  async function call(path, { method = 'GET', body } = {}) {
    let response;
    try {
      response = await fetch(`${base}${path}`, {
        method,
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        // GitHub lets a browser reuse an answer for a minute. Right after a
        // publish that would show the old file.
        cache: 'no-store',
      });
    } catch (error) {
      throw new GitHubError(0, error.message, hintFor(0, ''));
    }
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = data?.message ?? response.statusText;
      throw new GitHubError(response.status, message, hintFor(response.status, message));
    }
    return data;
  }

  return {
    get repo() {
      return name;
    },
    branch,
    file,

    /** Checks the token against the repository. Returns who is signed in and whether they may write. */
    async connect() {
      const repository = await call(`/repos/${name}`);
      name = repository.full_name ?? name;
      const user = await call('/user').catch(() => null); // some tokens cannot read the profile; the name is only for show
      return {
        repo: name,
        isPrivate: Boolean(repository.private),
        canWrite: repository.permissions?.push !== false,
        login: user?.login ?? '',
        url: repository.html_url ?? `https://github.com/${name}`,
      };
    },

    /** The content file at a branch or a commit. */
    async read(ref = branch) {
      const data = await call(`/repos/${name}/contents/${encodePath(file)}?ref=${encodeURIComponent(ref)}`);
      if (Array.isArray(data) || data.type !== 'file') throw new GitHubError(422, 'Not a file', `${file} is not a file in ${name}.`);
      return { text: fromBase64(data.content), sha: data.sha };
    },

    /**
     * Commits new text for the content file. `sha` is the file as it was
     * loaded: if someone else changed it since, GitHub refuses with 409.
     */
    async write(text, { sha, message }) {
      const data = await call(`/repos/${name}/contents/${encodePath(file)}`, {
        method: 'PUT',
        body: { message, content: toBase64(text), sha, branch },
      });
      return { sha: data.content.sha, commit: data.commit.sha, url: data.commit.html_url };
    },

    /** The last commits that touched the content file, newest first. */
    async history(count = 15) {
      const commits = await call(
        `/repos/${name}/commits?path=${encodeURIComponent(file)}&sha=${encodeURIComponent(branch)}&per_page=${count}`,
      );
      return commits.map((item) => ({
        sha: item.sha,
        message: item.commit.message.split('\n')[0],
        author: item.commit.author?.name ?? item.author?.login ?? '',
        date: item.commit.author?.date ?? item.commit.committer?.date,
        url: item.html_url,
      }));
    },

    /**
     * What Vercel says about a commit: 'pending' while it builds, 'success'
     * once it is live, 'failure' or 'error' when the build broke, 'none' when
     * nothing has reported yet.
     */
    async deployment(commit) {
      const data = await call(`/repos/${name}/commits/${commit}/status`);
      const status = data.statuses?.find((item) => /vercel/i.test(item.context)) ?? data.statuses?.[0];
      if (!status) return { state: 'none', description: '', url: '' };
      return { state: status.state, description: status.description ?? '', url: status.target_url ?? '' };
    },
  };
}
