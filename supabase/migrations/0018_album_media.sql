-- Album media gallery: images and videos associated with an album project.
create table if not exists album_media (
  id          uuid primary key default gen_random_uuid(),
  album_id    uuid not null references albums(id) on delete cascade,
  url         text not null,
  public_id   text not null default '',
  media_type  text not null check (media_type in ('image', 'video')),
  position    integer,
  caption     text,
  created_at  timestamptz not null default now()
);

create index if not exists album_media_album_id_idx on album_media(album_id);
create index if not exists album_media_position_idx  on album_media(album_id, position);

-- Public read; writes restricted to service role (admin API).
alter table album_media enable row level security;

create policy "Public read album_media"
  on album_media for select
  using (true);
