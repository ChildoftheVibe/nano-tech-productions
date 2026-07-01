-- Hero media: admin-uploaded images and videos for the home page hero section.
-- Only one entry can be active at a time (enforced in application logic).

create table if not exists hero_media (
  id          uuid        primary key default gen_random_uuid(),
  url         text        not null,
  public_id   text        not null,
  media_type  text        not null check (media_type in ('image', 'video')),
  is_active   boolean     not null default false,
  created_at  timestamptz not null default now()
);

alter table hero_media enable row level security;

-- Public users can read the active hero (needed by the home page server query).
create policy "public read active hero"
  on hero_media for select
  using (is_active = true);

-- Service role (admin) has unrestricted access.
create policy "service role full access hero"
  on hero_media
  using (auth.role() = 'service_role');
