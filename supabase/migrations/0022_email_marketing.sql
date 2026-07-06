-- Email marketing backend: subscriber list + campaigns sent through Resend.
-- No public read access — subscribers are only ever touched through the
-- service role (public subscribe/unsubscribe API routes + admin routes).

create table if not exists email_subscribers (
  id                uuid        primary key default gen_random_uuid(),
  email             text        not null unique,
  status            text        not null default 'subscribed'
                      check (status in ('subscribed', 'unsubscribed')),
  source            text        not null default 'site',
  unsubscribe_token uuid        not null default gen_random_uuid() unique,
  created_at        timestamptz not null default now(),
  unsubscribed_at   timestamptz
);

alter table email_subscribers enable row level security;

create policy "service role full access email_subscribers"
  on email_subscribers
  using (auth.role() = 'service_role');

create index if not exists idx_email_subscribers_status
  on email_subscribers (status);

create table if not exists email_campaigns (
  id              uuid        primary key default gen_random_uuid(),
  subject         text        not null,
  preheader       text,
  body_html       text        not null,
  status          text        not null default 'draft'
                    check (status in ('draft', 'sending', 'sent', 'failed')),
  recipient_count int         not null default 0,
  sent_count      int         not null default 0,
  failed_count    int         not null default 0,
  created_at      timestamptz not null default now(),
  sent_at         timestamptz
);

alter table email_campaigns enable row level security;

create policy "service role full access email_campaigns"
  on email_campaigns
  using (auth.role() = 'service_role');
