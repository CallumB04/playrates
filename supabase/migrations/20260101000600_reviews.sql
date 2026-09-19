-- Written reviews.
--
-- Keyed by (user_id, game_id) rather than hanging off game_logs. Linking to
-- the log would be tidier, but it would impose a rule the app does not have
-- today: the profile page already renders "?" for a review whose game has no
-- log, so a review without a log is a state the UI expects.
--
-- The rating shown next to a review still comes from the log — that is a left
-- join on (user_id, game_id), which the unique constraint on game_logs already
-- indexes.

create table public.reviews (
    id bigint generated always as identity primary key,
    user_id uuid not null references public.profiles (id) on delete cascade,
    game_id bigint not null references public.games (id) on delete cascade,
    body text not null,
    -- The old code had this field and never once checked it, so every private
    -- review was served to everyone. The API now filters on it.
    is_public boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint reviews_user_game_unique unique (user_id, game_id),
    constraint reviews_body_len check (
        char_length(btrim(body)) between 1 and 5000
    )
);

create index reviews_game_idx on public.reviews (game_id);
create index reviews_user_idx on public.reviews (user_id);
-- the public review feed, newest first
create index reviews_public_created_idx
    on public.reviews (created_at desc) where is_public;

create trigger reviews_set_updated_at
    before update on public.reviews
    for each row execute function public.set_updated_at();
