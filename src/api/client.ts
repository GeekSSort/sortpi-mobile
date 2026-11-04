/**
 * The one place that talks to the SortPi API. Pure TypeScript (storage and fetch are injected) so it
 * is unit-tested in Node; `session.ts` wires it to the phone's secure storage.
 *
 * Mirrors saas/client/src/services/apiClient.ts: paths are sent exactly as written (never add a
 * trailing slash: `/auth/login` has none, `/products/` does), the `{success, data}` envelope is
 * unwrapped, a TOKEN_EXPIRED 401 refreshes once (single-flight) and retries, and a dead session is
 * wiped. Money stays a string; nothing here converts to number.
 */

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly errors: Record<string, unknown>;
  readonly requestId?: string;

  constructor(status: number, code: string, message: string, errors: Record<string, unknown> = {}, requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.errors = errors;
    this.requestId = requestId;
  }
}

/** Refusals about the shop's plan, in words a shopkeeper can act on. English keys: screens translate what they show. The server's own text is for developers. */
const FRIENDLY: Record<string, string> = {
  PLAN_LIMIT_REACHED: 'Your plan has reached its limit. Open “Your plan” to move up.',
  SUBSCRIPTION_INACTIVE: "Your shop's SortPi plan is not active. Please contact SortPi support.",
};

export type Tokens = { access: string | null; refresh: string | null };
export type TokenStore = {
  get(): Promise<Tokens>;
  set(access: string, refresh?: string): Promise<void>;
  clear(): Promise<void>;
};

export type Meta = { page?: number; limit?: number; total?: number; total_pages?: number };
export type Envelope<T> = { success?: boolean; data?: T; message?: string; meta?: Meta; code?: string; errors?: Record<string, unknown>; request_id?: string };

export type RequestOptions = {
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  /** A file upload. Sent as multipart; the boundary header is left for fetch to write. */
  form?: FormData;
  /** Sent as `Idempotency-Key`. Required by POST /sales/sell/ and the partner payment endpoints. */
  idempotencyKey?: string;
  /** Act in one branch for this request only (`X-Branch`). */
  branchId?: string;
  /** Skip the Authorization header (login, refresh, accept-invitation). */
  anonymous?: boolean;
  signal?: AbortSignal;
};

export type ClientOptions = {
  /** `https://<workspace>.<domain>/api/v1`, or null before a workspace is chosen. */
  baseUrl: () => string | null;
  tokens: TokenStore;
  fetchImpl?: typeof fetch;
  /** Called once when the session is over (refresh rejected). Navigate to sign-in here. */
  onSessionEnd?: () => void;
  timeoutMs?: number;
  /** Told after every request: false when no answer came back (offline, timeout), true when the server answered at all. */
  onReach?: (reachable: boolean) => void;
};

export function createApiClient(opts: ClientOptions) {
  const doFetch = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 20_000;
  let refreshInFlight: Promise<boolean> | null = null;

  function buildUrl(path: string, query?: RequestOptions['query']): string {
    const base = opts.baseUrl();
    if (!base) throw new ApiError(0, 'NO_WORKSPACE', 'Choose your workspace first.');
    const qs = Object.entries(query ?? {})
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    return `${base.replace(/\/+$/, '')}${path}${qs ? `?${qs}` : ''}`;
  }

  async function send<T>(method: string, path: string, o: RequestOptions, allowRefresh: boolean): Promise<Envelope<T>> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (o.body !== undefined && !o.form) headers['Content-Type'] = 'application/json';
    if (o.idempotencyKey) headers['Idempotency-Key'] = o.idempotencyKey;
    if (o.branchId) headers['X-Branch'] = o.branchId;
    if (!o.anonymous) {
      const { access } = await opts.tokens.get();
      if (access) headers.Authorization = `Bearer ${access}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    o.signal?.addEventListener('abort', () => controller.abort());

    let response: Response;
    try {
      response = await doFetch(buildUrl(path, o.query), {
        method,
        headers,
        body: o.form ?? (o.body === undefined ? undefined : JSON.stringify(o.body)),
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      const timedOut = controller.signal.aborted;
      opts.onReach?.(false);
      throw new ApiError(0, timedOut ? 'TIMEOUT' : 'NETWORK_ERROR', timedOut ? 'The server took too long to answer.' : 'No connection to the server.');
    } finally {
      clearTimeout(timer);
    }

    opts.onReach?.(true);
    let body: Envelope<T> | null = null;
    const text = await response.text();
    if (text) {
      try {
        body = JSON.parse(text) as Envelope<T>;
      } catch {
        body = null;
      }
    }

    if (response.status === 401 && allowRefresh && !o.anonymous && body?.code === 'TOKEN_EXPIRED') {
      if (await refreshOnce()) return send<T>(method, path, o, false);
    }
    if (!response.ok || body?.success === false) {
      const code = body?.code ?? `HTTP_${response.status}`;
      throw new ApiError(response.status, code, FRIENDLY[code] ?? body?.message ?? response.statusText, body?.errors ?? {}, body?.request_id);
    }
    return body ?? {};
  }

  /** Ten parallel 401s cause one refresh. A rejected refresh (including REFRESH_TOKEN_REUSED) ends the session. */
  function refreshOnce(): Promise<boolean> {
    if (refreshInFlight) return refreshInFlight;
    refreshInFlight = (async () => {
      try {
        const { refresh } = await opts.tokens.get();
        if (!refresh) throw new ApiError(401, 'NO_REFRESH_TOKEN', 'Signed out.');
        const res = await send<{ access: string; refresh?: string }>('POST', '/auth/refresh', { body: { refresh }, anonymous: true }, false);
        if (!res.data?.access) throw new ApiError(401, 'BAD_REFRESH', 'Signed out.');
        await opts.tokens.set(res.data.access, res.data.refresh);
        return true;
      } catch {
        await opts.tokens.clear();
        opts.onSessionEnd?.();
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
    return refreshInFlight;
  }

  return {
    /** Unwrapped `data`. */
    async request<T>(method: string, path: string, o: RequestOptions = {}): Promise<T> {
      return (await send<T>(method, path, o, true)).data as T;
    },
    /** Whole envelope, for paginated lists (`meta`). */
    envelope<T>(method: string, path: string, o: RequestOptions = {}): Promise<Envelope<T>> {
      return send<T>(method, path, o, true);
    },
    get: <T>(path: string, o?: RequestOptions) => send<T>('GET', path, o ?? {}, true).then((e) => e.data as T),
    post: <T>(path: string, body?: unknown, o: RequestOptions = {}) => send<T>('POST', path, { ...o, body }, true).then((e) => e.data as T),
    postForm: <T>(path: string, form: FormData, o: RequestOptions = {}) => send<T>('POST', path, { ...o, form }, true).then((e) => e.data as T),
    patch: <T>(path: string, body?: unknown, o: RequestOptions = {}) => send<T>('PATCH', path, { ...o, body }, true).then((e) => e.data as T),
    delete: <T>(path: string, o?: RequestOptions) => send<T>('DELETE', path, o ?? {}, true).then((e) => e.data as T),
  };
}
export type ApiClient = ReturnType<typeof createApiClient>;
