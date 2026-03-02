-- Add bullhorn_native_id column to user_profiles
-- Stores CorporateUsers.IdInDataSrc (Bullhorn-native ID)
-- This is distinct from bullhorn_corporate_user_id which stores CorporateUsers.Id (SQL Server mirror internal ID)
-- JobOrders.OwnerId and Placements.OwnerId reference the native Bullhorn ID, not the mirror ID

ALTER TABLE user_profiles ADD COLUMN bullhorn_native_id INTEGER;

CREATE INDEX idx_user_profiles_bullhorn_native_id ON user_profiles(bullhorn_native_id);
