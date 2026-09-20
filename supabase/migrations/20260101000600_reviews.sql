-- Written reviews, keyed by (user_id, game_id) rather than hanging off
-- game_logs. Hanging off the log would be tidier but would forbid a state the
-- UI already handles — the profile page renders "?" for a review whose game has
-- no log. The rating beside a review comes from a left join on the log.

create table public.reviews (
    id bigint generated always as identity primary key,
    user_id uuid not null references public.profiles (id) on delete cascade,
    game_id bigint not null references public.games (id) on delete cascade,
    body text not null,
    -- the API filters on this; a private review is visible only to its author
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
