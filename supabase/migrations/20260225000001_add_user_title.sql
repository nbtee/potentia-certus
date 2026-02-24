-- Add business title column to user_profiles
-- Separate from the 4 access-control roles (consultant, team_lead, manager, admin)

ALTER TABLE user_profiles
  ADD COLUMN title TEXT;

ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_title_check
  CHECK (title IN (
    'associate_consultant',
    'consultant',
    'senior_consultant',
    'principal_consultant',
    'talent_manager',
    'senior_talent_manager',
    'general_manager',
    'director'
  ));
