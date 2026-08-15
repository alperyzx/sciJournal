export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

interface RateLimitEntry {
  timestamps: number[];
}

const requestBuckets = new Map<string, RateLimitEntry>();
const MAX_BUCKETS = 10_000;

export function getClientIp(headers: Headers): string {
  // The first value is the original client IP when a trusted reverse proxy appends
  // to X-Forwarded-For. Configure the proxy to overwrite this header from clients.
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();

  return headers.get('x-real-ip')?.trim() || 'unknown';
}

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;
  const current = requestBuckets.get(key)?.timestamps.filter((timestamp) => timestamp > cutoff) ?? [];

  if (current.length >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current[0] + windowMs - now) / 1000));
    requestBuckets.set(key, { timestamps: current });
    return { allowed: false, limit, remaining: 0, retryAfterSeconds };
  }

  current.push(now);
  requestBuckets.set(key, { timestamps: current });

  // Avoid unbounded memory use if an attacker supplies many unique client identifiers.
  if (requestBuckets.size > MAX_BUCKETS) {
    const oldestKey = requestBuckets.keys().next().value;
    if (oldestKey) requestBuckets.delete(oldestKey);
  }

  return {
    allowed: true,
    limit,
    remaining: limit - current.length,
    retryAfterSeconds: 0,
  };
}

export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    'RateLimit-Limit': String(result.limit),
    'RateLimit-Remaining': String(result.remaining),
    ...(result.allowed ? {} : { 'Retry-After': String(result.retryAfterSeconds) }),
  };
}
