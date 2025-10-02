// Simple in-memory rate limiter for edge functions
// Note: This is per-instance. For production, use Redis or similar

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

export function rateLimit(identifier: string, options: RateLimitOptions): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  // Clean up old entries
  if (record && now > record.resetAt) {
    rateLimitStore.delete(identifier);
  }

  const current = rateLimitStore.get(identifier);

  if (!current) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + options.windowMs
    });
    return true;
  }

  if (current.count >= options.maxRequests) {
    return false; // Rate limit exceeded
  }

  current.count++;
  return true;
}

export function getRateLimitInfo(identifier: string): { remaining: number; resetAt: number } | null {
  const record = rateLimitStore.get(identifier);
  if (!record) return null;
  
  return {
    remaining: Math.max(0, record.resetAt - Date.now()),
    resetAt: record.resetAt
  };
}