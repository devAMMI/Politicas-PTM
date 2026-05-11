/*
  # Helper function: get_auth_user_id_by_email

  Returns the auth.users.id for a given email, or NULL if not found.
  Used by the manage-users edge function to check if an auth user already
  exists before attempting to create one, avoiding duplicate-email errors.

  Security: SECURITY DEFINER so it can read auth.users without requiring
  the caller to have direct access to the auth schema.
*/

CREATE OR REPLACE FUNCTION get_auth_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM auth.users WHERE email = p_email LIMIT 1;
$$;
