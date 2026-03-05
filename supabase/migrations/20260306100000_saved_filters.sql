-- =============================================================================
-- Saved Filter Views (Bookmarks)
-- Users can save named filter state (date preset + scope) and set a default
-- =============================================================================

CREATE TABLE saved_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filter_state JSONB NOT NULL, -- { dateRangePreset, scope: { preset, selectedNodeIds } }
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_saved_filters_user ON saved_filters(user_id);

ALTER TABLE saved_filters ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own bookmarks
CREATE POLICY "users_manage_own_filters" ON saved_filters
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_saved_filters_updated_at BEFORE UPDATE ON saved_filters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE saved_filters IS 'User-scoped saved filter bookmarks (date range preset + hierarchy scope)';
