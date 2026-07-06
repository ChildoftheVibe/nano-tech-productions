-- Portal intro video: the admin can pick one vertical video from an album's
-- media gallery to play as a pop-up when a visitor clicks "Enter Portal" on
-- the home page, before being taken to the album page.
--
-- portal_video_url is denormalized from album_media so public album queries
-- never need a second relationship join (album_media already has an FK to
-- albums, and a reverse FK would make PostgREST embeds ambiguous). The admin
-- API keeps url + media id in sync, and clears the url when the media row is
-- deleted.

alter table albums
  add column if not exists portal_video_url text,
  add column if not exists portal_video_media_id uuid references album_media(id) on delete set null;
