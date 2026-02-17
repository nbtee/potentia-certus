-- =============================================================================
-- Migration: AI Rate Limit + Unmatched Term Functions
-- Stage H: SECURITY DEFINER functions for AI orchestration
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. check_rate_limit: Check and increment rate limit for AI requests
-- Returns TRUE if request is allowed, FALSE if rate limited.
-- Window: 10 requests per 1-minute sliding window.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_rate_limit()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_now TIMESTAMPTZ := NOW();
  v_window_start TIMESTAMPTZ := v_now - INTERVAL '1 minute';
  v_count INTEGER;
  v_max_requests INTEGER := 10;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Clean up expired windows
  DELETE FROM private.ai_rate_limits
  WHERE user_id = v_user_id AND window_end < v_now;

  -- Count requests in the current window
  SELECT COALESCE(SUM(request_count), 0) INTO v_count
  FROM private.ai_rate_limits
  WHERE user_id = v_user_id
    AND window_start >= v_window_start;

  -- Check if limit exceeded
  IF v_count >= v_max_requests THEN
    RETURN FALSE;
  END IF;

  -- Insert new request record
  INSERT INTO private.ai_rate_limits (user_id, request_count, window_start, window_end)
  VALUES (v_user_id, 1, v_now, v_now + INTERVAL '1 minute');

  RETURN TRUE;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. log_unmatched_term: Insert unmatched terms from AI responses
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_unmatched_term(
  p_user_query TEXT,
  p_unmatched_term TEXT,
  p_suggested_asset_key TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO unmatched_terms (user_query, unmatched_term, suggested_asset_key, resolution_status)
  VALUES (p_user_query, p_unmatched_term, p_suggested_asset_key, 'pending')
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION check_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION log_unmatched_term TO authenticated;
