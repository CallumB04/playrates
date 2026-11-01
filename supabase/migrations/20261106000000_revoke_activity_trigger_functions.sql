-- The activity triggers added with v1.1 kept the default EXECUTE grant, so
-- PostgREST listed them as callable RPCs. A trigger function can't run
-- outside a trigger, but nothing should be in the API by accident.

set search_path = pg_catalog, public;

revoke execute on function
  public.activity_from_game_lists(),
  public.activity_from_game_list_items(),
  public.activity_from_game_list_items_gone(),
  public.activity_from_game_list_votes(),
  public.activity_from_gaming_25_picks(),
  public.activity_from_gaming_25_loves(),
  public.activity_from_xp_events(),
  public.activity_from_user_badges(),
  public.activity_from_task_swaps(),
  public.activity_from_token_events(),
  public.activity_from_user_backgrounds(),
  public.activity_from_content_reports(),
  public.activity_from_announcements()
from anon, authenticated, public;
