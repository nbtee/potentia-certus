/**
 * AI Rate Limiting
 *
 * Checks per-user rate limits via SECURITY DEFINER function.
 * 10 requests per minute per user.
 */

import { createClient } from '@/lib/supabase/server';
import type { RateLimitResult } from './types';

const MAX_REQUESTS_PER_MINUTE = 10;

export async function checkRateLimit(userId: string): Promise<RateLimitResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('check_rate_limit');

  if (error) {
    console.error('Rate limit check failed:', error.message);
    // Fail open in development, but log the error
    return { allowed: true, remaining: MAX_REQUESTS_PER_MINUTE };
  }

  const allowed = data === true;

  return {
    allowed,
    // Approximate remaining — exact count would require another query
    remaining: allowed ? MAX_REQUESTS_PER_MINUTE - 1 : 0,
  };
}
