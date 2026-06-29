type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function clientKeyFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  return (
    forwarded?.split(",")[0]?.trim() ||
    realIp?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    "anonymous"
  );
}

export function rateLimit(
  key: string,
  options: { limit: number; windowMs: number },
): { ok: true } | { ok: false; retryAfterMs: number } {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return { ok: true };
  }

  if (existing.count >= options.limit) {
    return { ok: false, retryAfterMs: Math.max(0, existing.resetAt - now) };
  }

  existing.count += 1;
  return { ok: true };
}

export function enforceRateLimit(
  request: Request,
  routeId: string,
  options: { limit: number; windowMs: number },
): Response | null {
  const key = `${routeId}:${clientKeyFromRequest(request)}`;
  const result = rateLimit(key, options);
  if (result.ok) return null;

  return new Response(
    JSON.stringify({
      error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
      retryAfterMs: result.retryAfterMs,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)),
      },
    },
  );
}
