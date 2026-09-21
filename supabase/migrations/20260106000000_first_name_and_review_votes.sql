-- A display name, and upvotes on reviews.
--
-- first_name is optional and separate from username: a username is an
-- identifier that has to be unique and URL-safe, and greeting somebody by it
-- reads as addressing an account rather than a person.
--
-- review_votes is one row per person per review, so the unique constraint is
-- the whole anti-abuse story: a second vote from the same account collides
-- rather than counting twice. The count is derived rather than stored, so it
-- cannot drift from the rows behind it.

set search_path = pg_catalog, public;

alter table public.profiles
    add column if not exists first_name text;

alter table public.profiles
    add constraint profiles_first_name_length
    check (first_name is null or char_length(first_name) between 1 and 40);

comment on column public.profiles.first_name is
    'Optional display name. Falls back to username where absent.';

create table if not exists public.review_votes (
    review_id bigint not null
        references public.reviews (id) on delete cascade,
    user_id uuid not null
        references public.profiles (id) on delete cascade,
    created_at timestamptz not null default now(),

    primary key (review_id, user_id)
);

alter table public.review_votes enable row level security;
revoke all on public.review_votes from anon, authenticated;

-- Counting a review's votes, and answering "did I vote" for the viewer.
create index if not exists review_votes_review_idx
    on public.review_votes (review_id);
create index if not exists review_votes_user_idx
    on public.review_votes (user_id);

-- review_cards gains the tally so reviews can be ordered by it in SQL rather
-- than after paging, which is the same trap the rating sort fell into.
drop view if exists public.review_cards;

create view public.review_cards
with (security_invoker = true) as
select
    r.id,
    r.user_id,
    r.game_id,
    r.body,
    r.is_public,
    r.created_at,
    r.updated_at,
    l.rating,
    l.hours_played,
    l.status,
    l.played_status,
    l.platform_slug,
    p.username        as author_username,
    p.first_name      as author_first_name,
    p.avatar_url      as author_avatar_url,
    p.last_seen_at    as author_last_seen_at,
    g.title           as game_title,
    g.slug            as game_slug,
    g.cover_url       as game_cover_url,
    coalesce(v.vote_count, 0)::int as vote_count
from public.reviews r
left join public.game_logs l
    on l.user_id = r.user_id and l.game_id = r.game_id
left join public.profiles p
    on p.id = r.user_id
join public.games g
    on g.id = r.game_id
left join (
    select review_id, count(*) as vote_count
    from public.review_votes
    group by review_id
) v on v.review_id = r.id;

revoke all on public.review_cards from anon, authenticated;
