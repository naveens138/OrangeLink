"use client";

import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { CalendarClock, Check, ChevronLeft, ChevronRight, Copy, ExternalLink, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { PLATFORM_ICONS } from "@/components/brand/platform-icons";
import { PLATFORM_META, PLATFORMS, postText, type Platform } from "@/lib/schedule/platforms";
import {
  deletePost,
  savePost,
  setPostStatus,
  type ScheduledPost,
} from "@/app/(dashboard)/dashboard/schedule/actions";
import { cn } from "@/lib/utils";
import { SocialAccounts, type Accounts } from "./social-accounts";

export interface LinkOption {
  label: string;
  url: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // Monday
  return x;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** ISO -> the "YYYY-MM-DDTHH:mm" a datetime-local input wants, in local time. */
function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// The current minute, from the browser only. The server has no idea of the
// viewer's timezone, so on the server this is null and nothing
// date-dependent renders until hydration.
let minute = 0;
const clock = {
  subscribe(onChange: () => void) {
    const t = window.setInterval(onChange, 30_000);
    return () => window.clearInterval(t);
  },
  snapshot() {
    const m = Math.floor(Date.now() / 60_000);
    if (m !== minute) minute = m;
    return minute;
  },
  serverSnapshot: () => null,
};

function useNow(): Date | null {
  const m = useSyncExternalStore(clock.subscribe, clock.snapshot, clock.serverSnapshot);
  return m === null ? null : new Date(m * 60_000);
}

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

function PlatformIcons({ platforms, className = "h-3.5 w-3.5" }: { platforms: Platform[]; className?: string }) {
  return (
    <span className="flex items-center gap-1">
      {platforms.map((p) => {
        const Icon = PLATFORM_ICONS[p];
        return <Icon key={p} className={className} />;
      })}
    </span>
  );
}

export function ScheduleManager({
  initialPosts,
  initialAccounts,
  linkOptions,
}: {
  initialPosts: ScheduledPost[];
  initialAccounts: Accounts;
  linkOptions: LinkOption[];
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [accounts, setAccounts] = useState<Accounts>(initialAccounts);
  const now = useNow();
  // Weeks away from this one; 0 is the current week.
  const [weekOffset, setWeekOffset] = useState(0);
  const [editing, setEditing] = useState<ScheduledPost | "new" | null>(null);
  const [draftDate, setDraftDate] = useState<Date | null>(null);

  const upsert = (post: ScheduledPost) =>
    setPosts((prev) =>
      [...prev.filter((p) => p.id !== post.id), post].sort((a, b) => a.scheduled_for.localeCompare(b.scheduled_for)),
    );
  const remove = (id: string) => setPosts((prev) => prev.filter((p) => p.id !== id));

  const due = useMemo(
    () =>
      now
        ? posts.filter((p) => p.status === "planned" && new Date(p.scheduled_for).getTime() <= now.getTime() + 10 * 60_000)
        : [],
    [posts, now],
  );

  function openNew(day?: Date) {
    const d = day ? new Date(day) : new Date(Date.now() + 60 * 60_000);
    if (day) d.setHours(10, 0, 0, 0);
    else d.setMinutes(0, 0, 0);
    setDraftDate(d);
    setEditing("new");
  }

  if (!now) {
    return <div className="h-96 animate-pulse rounded-md border border-border bg-surface-1" />;
  }

  const weekStart = new Date(startOfWeek(now).getTime() + weekOffset * 7 * DAY_MS);

  const days = Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * DAY_MS));
  const weekLabel = `${days[0].toLocaleDateString([], { month: "short", day: "numeric" })} to ${days[6].toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}`;
  const inDay = (day: Date) => posts.filter((p) => sameDay(new Date(p.scheduled_for), day));
  const upcoming = posts.filter((p) => p.status === "planned" && new Date(p.scheduled_for) > now).length;

  return (
    <div className="flex flex-col gap-6">
      <SocialAccounts
        accounts={accounts}
        onChange={(platform, handle) =>
          setAccounts((prev) => {
            const next = { ...prev };
            if (handle) next[platform] = handle;
            else delete next[platform];
            return next;
          })
        }
      />

      {due.length > 0 && (
        <div className="rounded-md border border-[var(--accent-strong)]/30 bg-accent-soft p-4">
          <p className="text-h3">Ready to post</p>
          <p className="mt-0.5 text-small text-text-secondary">
            These are due. Post them, then mark them done.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {due.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setEditing(p)}
                className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2.5 text-left transition-colors hover:border-border-strong"
              >
                <PlatformIcons platforms={p.platforms} />
                <span className="min-w-0 flex-1 truncate text-small text-text-primary">
                  {p.caption || "No caption yet"}
                </span>
                <span className="shrink-0 text-[12px] text-text-muted">{time(p.scheduled_for)}</span>
                <span className="shrink-0 rounded-full bg-text-primary px-2.5 py-1 text-[12px] font-medium text-white">
                  Post now
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-border bg-surface-1">
            <button
              type="button"
              aria-label="Previous week"
              onClick={() => setWeekOffset((w) => w - 1)}
              className="flex h-8 w-8 items-center justify-center text-text-secondary hover:text-text-primary"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset(0)}
              className="h-8 border-x border-border px-3 text-small text-text-primary"
            >
              Today
            </button>
            <button
              type="button"
              aria-label="Next week"
              onClick={() => setWeekOffset((w) => w + 1)}
              className="flex h-8 w-8 items-center justify-center text-text-secondary hover:text-text-primary"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <p className="text-small text-text-secondary">{weekLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-text-muted">{upcoming} upcoming</span>
          <Button size="sm" onClick={() => openNew()}>
            <Plus className="h-4 w-4" />
            New post
          </Button>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-7">
        {days.map((day) => {
          const isToday = sameDay(day, now);
          const list = inDay(day);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "flex min-h-[132px] flex-col rounded-md border bg-surface-1 p-2",
                isToday ? "border-text-primary" : "border-border",
              )}
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="font-mono text-label uppercase tracking-[0.1em] text-text-muted">
                  {day.toLocaleDateString([], { weekday: "short" })}{" "}
                  <span className={isToday ? "text-text-primary" : undefined}>{day.getDate()}</span>
                </p>
                <button
                  type="button"
                  aria-label={`Add a post on ${day.toDateString()}`}
                  onClick={() => openNew(day)}
                  className="flex h-6 w-6 items-center justify-center rounded-sm text-text-muted hover:bg-surface-2 hover:text-text-primary"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex flex-col gap-1.5">
                {list.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setEditing(p)}
                    className={cn(
                      "flex flex-col gap-1 rounded-sm border bg-background px-2 py-1.5 text-left transition-colors hover:border-border-strong",
                      p.status === "planned" ? "border-border" : "border-transparent opacity-60",
                    )}
                  >
                    <span className="flex items-center justify-between gap-1 text-[11px] text-text-muted">
                      {time(p.scheduled_for)}
                      {p.status === "posted" && <Check className="h-3 w-3 text-success" />}
                      {p.status === "skipped" && <span>skipped</span>}
                    </span>
                    <PlatformIcons platforms={p.platforms} className="h-3 w-3 text-text-secondary" />
                    <span className="line-clamp-2 text-[12px] leading-snug text-text-primary">
                      {p.caption || "No caption yet"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="flex items-center gap-1.5 text-[12px] text-text-muted">
        <CalendarClock className="h-3.5 w-3.5" />
        Automatic posting straight to each platform is coming. For now, &quot;Post now&quot; copies
        your caption and opens the app.
      </p>

      {editing && (
        <PostEditor
          key={editing === "new" ? "new" : editing.id}
          post={editing === "new" ? null : editing}
          defaultDate={draftDate}
          accounts={accounts}
          linkOptions={linkOptions}
          onClose={() => setEditing(null)}
          onSaved={(post) => {
            upsert(post);
            setEditing(post);
          }}
          onDeleted={(id) => {
            remove(id);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function PostEditor({
  post,
  defaultDate,
  accounts,
  linkOptions,
  onClose,
  onSaved,
  onDeleted,
}: {
  post: ScheduledPost | null;
  defaultDate: Date | null;
  accounts: Accounts;
  linkOptions: LinkOption[];
  onClose: () => void;
  onSaved: (post: ScheduledPost) => void;
  onDeleted: (id: string) => void;
}) {
  // A new post starts on every platform the creator has added.
  const [platforms, setPlatforms] = useState<Platform[]>(() => {
    if (post) return post.platforms;
    const added = PLATFORMS.filter((p) => accounts[p]);
    return added.length ? added : ["instagram"];
  });
  const [caption, setCaption] = useState(post?.caption ?? "");
  const [link, setLink] = useState<string>(post?.link_url ?? "");
  const [when, setWhen] = useState(() =>
    toLocalInput(post ? new Date(post.scheduled_for) : (defaultDate ?? new Date())),
  );
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<Platform | null>(null);
  const [pending, startTransition] = useTransition();

  const isPreset = linkOptions.some((o) => o.url === link);
  const [customLink, setCustomLink] = useState(!!link && !isPreset);
  const text = postText(caption, link || null);
  const saved = post !== null;

  function toggle(p: Platform) {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await savePost({
        id: post?.id,
        platforms,
        caption,
        linkUrl: link || null,
        scheduledFor: new Date(when).toISOString(),
      });
      if (result.ok) onSaved(result.post);
      else setError(result.error);
    });
  }

  function mark(status: ScheduledPost["status"]) {
    if (!post) return;
    startTransition(async () => {
      const result = await setPostStatus(post.id, status);
      if (result.ok) onSaved(result.post);
      else setError(result.error);
    });
  }

  async function postTo(p: Platform) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(p);
    } catch {
      // Clipboard blocked: the platforms that prefill still get the text.
    }
    window.open(PLATFORM_META[p].compose(text, link || null), "_blank", "noopener,noreferrer");
  }

  return (
    <Modal open onClose={onClose} title={saved ? "Scheduled post" : "New post"} maxWidthClassName="max-w-[560px]">
      <div className="flex flex-col gap-5">
        <div>
          <p className="mb-2 font-mono text-label uppercase tracking-[0.1em] text-text-muted">Post to</p>
          <div className="flex flex-wrap gap-1.5">
            {PLATFORMS.map((p) => {
              const Icon = PLATFORM_ICONS[p];
              const on = platforms.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => toggle(p)}
                  aria-pressed={on}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-small transition-colors",
                    on
                      ? "border-text-primary bg-text-primary text-white"
                      : "border-border text-text-secondary hover:border-border-strong hover:text-text-primary",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {PLATFORM_META[p].label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 font-mono text-label uppercase tracking-[0.1em] text-text-muted">Caption</p>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={5}
            maxLength={5000}
            placeholder="What are you posting? Hashtags welcome."
            className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-small text-text-primary placeholder:text-text-muted focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-black/5"
          />
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
            {platforms.map((p) => {
              const left = PLATFORM_META[p].limit - text.length;
              return (
                <span key={p} className={cn("text-[12px]", left < 0 ? "font-medium text-danger" : "text-text-muted")}>
                  {PLATFORM_META[p].label} {left < 0 ? `${-left} over` : `${left} left`}
                </span>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 font-mono text-label uppercase tracking-[0.1em] text-text-muted">Link</p>
            <select
              value={customLink ? "__custom" : link}
              onChange={(e) => {
                if (e.target.value === "__custom") {
                  setCustomLink(true);
                  setLink("");
                } else {
                  setCustomLink(false);
                  setLink(e.target.value);
                }
              }}
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-small text-text-primary focus:border-border-strong focus:outline-none"
            >
              <option value="">No link</option>
              {linkOptions.map((o) => (
                <option key={o.url} value={o.url}>
                  {o.label}
                </option>
              ))}
              <option value="__custom">Another link…</option>
            </select>
            {customLink && (
              <input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://"
                className="mt-2 h-9 w-full rounded-md border border-border bg-background px-3 text-small text-text-primary focus:border-border-strong focus:outline-none"
              />
            )}
          </div>
          <div>
            <p className="mb-2 font-mono text-label uppercase tracking-[0.1em] text-text-muted">When</p>
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-small text-text-primary focus:border-border-strong focus:outline-none"
            />
          </div>
        </div>

        {saved && (
          <div className="rounded-md border border-border bg-surface-1 p-3">
            <p className="text-h3">Post now</p>
            <p className="mt-0.5 text-[12px] text-text-muted">
              Each button copies your caption{link ? " and link" : ""} and opens the app. X, Threads
              and LinkedIn arrive filled in; for the others, paste.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {platforms.map((p) => {
                const Icon = PLATFORM_ICONS[p];
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => postTo(p)}
                    className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-small text-text-primary transition-colors hover:border-border-strong"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {accounts[p] ? `@${accounts[p]}` : PLATFORM_META[p].label}
                    {copied === p ? <Copy className="h-3 w-3 text-success" /> : <ExternalLink className="h-3 w-3 text-text-muted" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {error && <p className="text-small text-danger">{error}</p>}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
          <div className="flex items-center gap-2">
            {saved && post.status === "planned" && (
              <>
                <Button size="sm" variant="secondary" disabled={pending} onClick={() => mark("posted")}>
                  <Check className="h-3.5 w-3.5" />
                  Mark posted
                </Button>
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => mark("skipped")}>
                  Skip
                </Button>
              </>
            )}
            {saved && post.status !== "planned" && (
              <Button size="sm" variant="secondary" disabled={pending} onClick={() => mark("planned")}>
                Move back to planned
              </Button>
            )}
            {saved && (
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => {
                  if (!window.confirm("Delete this post?")) return;
                  startTransition(async () => {
                    const result = await deletePost(post.id);
                    if (result.ok) onDeleted(post.id);
                    else setError(result.error ?? "Couldn't delete.");
                  });
                }}
                className="text-danger hover:bg-danger/10 hover:text-danger"
              >
                Delete
              </Button>
            )}
          </div>
          <Button size="sm" disabled={pending || platforms.length === 0} onClick={save}>
            {pending ? "Saving…" : saved ? "Save changes" : "Schedule post"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
