-- User profiles.
--
-- Keyed by auth.users.id rather than carrying an id of its own. Supabase Auth
-- owns identity and credentials; this table owns everything PlayRates-specific.
--
-- Deliberately absent:
--   password  -- Supabase Auth owns it. It was previously stored in plaintext
--               and served to anyone who asked.
--   email     -- lives in auth.users. Duplicating it creates a sync problem and
--               an account-enumeration surface.

create table public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    username extensions.citext not null,
    bio text not null default '',
    picture_url text,
    -- replaces the old `online boolean`, which was hardcoded test data. The API
    -- derives `online` from this, so the frontend field is unchanged.
    last_seen_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint profiles_username_unique unique (username),
    constraint profiles_username_len check (char_length(username) between 3 and 24),
    constraint profiles_username_format check (username ~ '^[A-Za-z0-9_]+$'),
    -- matches the maxLength already enforced by the edit-profile form
    constraint profiles_bio_len check (char_length(bio) <= 160),
    constraint profiles_picture_url check (
        picture_url is null or picture_url ~ '^https?://'
    )
);

-- supports the user search on the profile page
create index profiles_username_trgm_idx
    on public.profiles using gin (username extensions.gin_trgm_ops);

create trigger profiles_set_updated_at
    before update on public.profiles
    for each row execute function public.set_updated_at();
