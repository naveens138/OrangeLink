-- ============================================================================
-- 0022 — Free trials reuse the billing override table
-- ============================================================================
--
-- Every new creator gets 14 days free from the moment they claim a username.
-- That's the same shape as the Creator Program's free year: a period during
-- which someone has full access and owes nothing. Rather than inventing a
-- second mechanism, `reason` gains a value.
--
-- The reason is what keeps them tellable apart, which matters: a trial that
-- lapses should ask for a card, a program year that lapses is a different
-- conversation, and neither is revenue. approve_program_submission
-- (migrations/0018) already upserts on creator_id with
-- `greatest(free_until, now()) + 1 year`, so a trialling creator approved for
-- the program keeps what's left of the trial and gains a year on top.

alter table public.billing_overrides
  drop constraint if exists billing_overrides_reason_check;

alter table public.billing_overrides
  add constraint billing_overrides_reason_check
  check (reason in ('creator_program', 'trial'));

comment on column public.billing_overrides.reason is
  'trial = the 14 days every new creator gets; creator_program = the granted free year. Neither is a paid subscription — those live in platform_subscriptions.';
