-- Lists are loved, as a Gaming 25 is: reactions are for reviews and the
-- community. Every reaction already left on a list counted as one vote, so
-- each becomes a love and nothing anyone earned from it changes.

set search_path = pg_catalog, public;

update public.game_list_votes set reaction = 'upvote' where reaction <> 'upvote';

alter table public.game_list_votes
    add constraint game_list_votes_love check (reaction = 'upvote');
