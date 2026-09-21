-- A user's log of a game: status, rating, hours, achievements. One per user per
-- game. It also carries its own key so other tables can reference a log with a
-- single column.

create table public.game_logs (
    id bigint generated always as identity primary key,
    user_id uuid not null references public.profiles (id) on delete cascade,
    game_id bigint not null references public.games (id) on delete cascade,
    status text not null,
    played_status text,
    rating numeric(4, 2),
    hours_played numeric(6, 1),
    hours_to_beat numeric(6, 1),
    start_date date,
    finish_date date,
    platform_slug text references public.platforms (slug) on delete set null,
    achievements_total int,
    achievements_completed int,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint game_logs_user_game_unique unique (user_id, game_id),

    constraint game_logs_status check (
        status in ('played', 'playing', 'backlog', 'wishlist')
    ),

    -- played_status only means anything for a played game. The current
    -- frontend sends it regardless, so the service layer nulls it out rather
    -- than this constraint rejecting the write.
    constraint game_logs_played_status check (
        played_status is null
        or (
            status = 'played'
            and played_status in ('finished', 'mastered', 'shelved', 'retired')
        )
    ),

    -- 0-10 in steps of 0.25, enforced in the database and not just the slider
    constraint game_logs_rating check (
        rating is null
        or (rating >= 0 and rating <= 10 and mod(rating * 100, 25) = 0)
    ),

    constraint game_logs_hours_played check (
        hours_played is null or hours_played >= 0
    ),
    constraint game_logs_hours_to_beat check (
        hours_to_beat is null or hours_to_beat >= 0
    ),

    constraint game_logs_achievements check (
        (achievements_total is null or achievements_total >= 0)
        and (achievements_completed is null or achievements_completed >= 0)
        and (
            achievements_total is null
            or achievements_completed is null
            or achievements_completed <= achievements_total
        )
    ),

    constraint game_logs_dates check (
        start_date is null or finish_date is null or finish_date >= start_date
    )
);

create index game_logs_user_status_idx on public.game_logs (user_id, status);
create index game_logs_game_idx on public.game_logs (game_id);
-- supports the average-rating aggregate on the game page
create index game_logs_game_rating_idx
    on public.game_logs (game_id) where rating is not null;

create trigger game_logs_set_updated_at
    before update on public.game_logs
    for each row execute function public.set_updated_at();
