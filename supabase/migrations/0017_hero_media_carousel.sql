-- Add position column so the admin can control carousel slide order.
alter table hero_media add column if not exists position integer;
