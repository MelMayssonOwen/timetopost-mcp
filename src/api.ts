/**
 * Thin REST client for the TimeToPost backend. The MCP server is a pure adapter:
 * every tool calls the existing API with the caller's bearer token, so all auth,
 * org-scoping, validation and publishing logic is reused (never duplicated).
 */
export interface ApiResult {
  ok: boolean;
  status: number;
  data: unknown;
}

export class TimeToPostApi {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
    private readonly orgId?: string
  ) {}

  private async request(
    method: string,
    path: string,
    body?: unknown,
    extraHeaders: Record<string, string> = {}
  ): Promise<ApiResult> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        ...(this.orgId ? { 'x-ttp-org': this.orgId } : {}),
        ...extraHeaders,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    let data: unknown = null;
    const text = await res.text();
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return { ok: res.ok, status: res.status, data };
  }

  get(path: string) {
    return this.request('GET', path);
  }
  post(path: string, body?: unknown) {
    return this.request('POST', path, body);
  }
  delete(path: string) {
    return this.request('DELETE', path);
  }

  requestWithMcpHeader(method: 'GET' | 'POST' | 'DELETE', path: string, body?: unknown) {
    return this.request(method, path, body, { 'x-ttp-client': 'mcp' });
  }
}
