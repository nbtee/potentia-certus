-- Add 'delivery_lead' to the user_profiles title CHECK constraint

ALTER TABLE user_profiles
  DROP CONSTRAINT user_profiles_title_check;

ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_title_check
  CHECK (title IN (
    'associate_consultant',
    'consultant',
    'senior_consultant',
    'principal_consultant',
    'delivery_lead',
    'talent_manager',
    'senior_talent_manager',
    'general_manager',
    'director'
  ));
