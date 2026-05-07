/**
 * Shared HTTP helper with timeout, retries, and clear error semantics for
 * the public scientific APIs we hit (UniProt, KEGG, NCBI). These services
 * occasionally return 5xx during peak hours; we retry once with backoff.
 */

export class ExternalApiError extends Error {
  constructor(
    message: string,
    readonly source: string,
    readonly status?: number,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ExternalApiError";
  }
}

interface FetchOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  source: string;
}

export async function fetchJSON<T = unknown>(
  url: string,
  opts: FetchOptions,
): Promise<T> {
  const { timeoutMs = 15_000, retries = 1, source, ...init } = opts;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        ...init,
        signal: ctrl.signal,
        headers: {
          Accept: "application/json",
          ...(init.headers ?? {}),
        },
      });
      clearTimeout(timer);
      if (!res.ok) {
        // 5xx → retry; 4xx → fail fast
        if (res.status >= 500 && attempt < retries) {
          await sleep(400 * (attempt + 1));
          continue;
        }
        const body = await res.text().catch(() => "");
        throw new ExternalApiError(
          `${source} ${res.status}: ${body.slice(0, 200)}`,
          source,
          res.status,
        );
      }
      return (await res.json()) as T;
    } catch (e) {
      clearTimeout(timer);
      lastError = e;
      if (attempt < retries && (e instanceof Error && e.name !== "ExternalApiError")) {
        await sleep(400 * (attempt + 1));
        continue;
      }
      throw e instanceof ExternalApiError
        ? e
        : new ExternalApiError(
            `${source} request failed: ${(e as Error).message ?? String(e)}`,
            source,
            undefined,
            e,
          );
    }
  }
  throw new ExternalApiError(`${source} retries exhausted`, source, undefined, lastError);
}

export async function fetchText(url: string, opts: FetchOptions): Promise<string> {
  const { timeoutMs = 15_000, retries = 1, source, ...init } = opts;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) {
        if (res.status >= 500 && attempt < retries) {
          await sleep(400 * (attempt + 1));
          continue;
        }
        const body = await res.text().catch(() => "");
        throw new ExternalApiError(
          `${source} ${res.status}: ${body.slice(0, 200)}`,
          source,
          res.status,
        );
      }
      return await res.text();
    } catch (e) {
      clearTimeout(timer);
      lastError = e;
      if (attempt < retries && (e instanceof Error && e.name !== "ExternalApiError")) {
        await sleep(400 * (attempt + 1));
        continue;
      }
      throw e instanceof ExternalApiError
        ? e
        : new ExternalApiError(
            `${source} request failed: ${(e as Error).message ?? String(e)}`,
            source,
            undefined,
            e,
          );
    }
  }
  throw new ExternalApiError(`${source} retries exhausted`, source, undefined, lastError);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
