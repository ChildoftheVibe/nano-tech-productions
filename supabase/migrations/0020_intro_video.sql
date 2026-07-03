-- Intro / landing pop-up video: a full-screen video that plays when a visitor
-- lands on the site. Admin uploads a 9:16 (portrait, mobile) and/or 16:9
-- (landscape, desktop) version and picks the album the visitor is taken to
-- once the video finishes or is dismissed. Only one row can be active at a
-- time (enforced in application logic, mirroring hero_media).

create table if not exists intro_videos (
  id                  uuid        primary key default gen_random_uuid(),
  portrait_url        text,                 -- 9:16 source (mobile)
  portrait_public_id  text,
  landscape_url       text,                 -- 16:9 source (desktop)
  landscape_public_id text,
  album_id            uuid        references albums(id) on delete set null,
  replay_mode         text        not null default 'session'
                        check (replay_mode in ('session', 'always')),
  is_active           boolean     not null default false,
  created_at          timestamptz not null default now()
);

alter table intro_videos enable row level security;

-- Public users can read the active intro (needed by the root layout server query).
create policy "public read active intro"
  on intro_videos for select
  using (is_active = true);

-- Service role (admin) has unrestricted access.
create policy "service role full access intro"
  on intro_videos
  using (auth.role() = 'service_role');
