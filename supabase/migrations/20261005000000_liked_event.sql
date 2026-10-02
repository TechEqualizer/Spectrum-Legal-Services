-- Reels have a like button (and double-tap to like), logged as "liked".

alter table public.reel_events drop constraint reel_events_event_check;
alter table public.reel_events add constraint reel_events_event_check check (
  event in (
    'viewed', 'completed', 'skipped', 'exited',
    'cta_clicked', 'call_clicked', 'text_later_clicked', 'shared', 'liked'
  )
);
