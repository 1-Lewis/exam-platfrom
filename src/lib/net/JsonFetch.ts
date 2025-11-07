// src/lib/net/jsonFetch.ts
export type JsonOk<T> = { ok: true; data: T };
export type JsonErr = { ok: false; error: string; status: number };

export async function jsonFetch<T>(
  url: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<JsonOk<T> | JsonErr> {
  const { timeoutMs = 15000, ...rest } = init ?? {};
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(rest?.headers ?? {}),
      },
      signal: ctrl.signal,
    });
    const status = res.status;
    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }

    if (!res.ok) {
    let msg = res.statusText || "Request failed";

    if (
        parsed &&
        typeof parsed === "object" &&
        "error" in parsed &&
        typeof (parsed as { error?: unknown }).error === "string"
    ) {
        msg = (parsed as { error: string }).error;
    }

    return { ok: false, error: msg, status };
    }

    return { ok: true, data: parsed as T };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network error";
    return { ok: false, error: msg, status: 0 };
  } finally {
    clearTimeout(t);
  }
}
