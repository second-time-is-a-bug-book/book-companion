// What the npm registry says about a package: when it was first
// published, and whether its latest version runs scripts on
// install. Used by guards/package-check.ts --online.
// 404 means the package does not exist: the answer is
// undefined. Any other failure (a 5xx, a rate limit, no
// network, a malformed answer) throws an Error that says why.
export interface PackageInfo {
  created: string;
  installScripts: boolean;
}

const REGISTRY = 'https://registry.npmjs.org/';
const HOOKS = ['preinstall', 'install', 'postinstall'];

export async function fetchInfo(
  name: string,
  get = fetch,
): Promise<PackageInfo | undefined> {
  const url = REGISTRY + name.replace('/', '%2f');
  const response = await get(url).catch((error: Error) => {
    // fetch reports a network failure as "fetch failed", with
    // the useful part in its cause.
    const { cause } = error;
    if (!(cause instanceof Error)) throw error;
    throw new Error(`${error.message} (${cause.message})`);
  });
  if (response.status === 404) return undefined;
  if (!response.ok) {
    const { status, statusText } = response;
    const answer = `${status} ${statusText}`.trimEnd();
    throw new Error(`the registry answered ${answer}`);
  }
  const meta = await response.json();
  const created = meta.time?.created;
  if (typeof created !== 'string') {
    throw new Error('the registry answer has no creation date');
  }
  const latest = meta.versions?.[meta['dist-tags']?.latest];
  const scripts = latest?.scripts ?? {};
  const installScripts = HOOKS.some((hook) => !!scripts[hook]);
  return { created, installScripts };
}
