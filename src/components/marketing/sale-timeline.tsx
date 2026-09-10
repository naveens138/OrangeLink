"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";

interface Step {
  /** Mono axis label. */
  tick: string;
  /** Caption headline shown while the playhead sits on this step. */
  title: string;
  /** Caption body. */
  detail: string;
  /** 0 (top of the plot) → 1 (bottom), shapes the path. */
  level: number;
}

interface Scenario {
  name: string;
  blurb: string;
  steps: Step[];
}

const scenarios: Scenario[] = [
  {
    name: "How to set up",
    blurb: "Four steps, from signing up to taking your first payment.",
    steps: [
      {
        tick: "Username",
        title: "Claim your username",
        detail: "Pick your address: orangelink.co/yourname",
        level: 0.6,
      },
      {
        tick: "Page",
        title: "Create your page",
        detail: "Add digital products, affiliate links, bookings and an email signup.",
        level: 0.36,
      },
      {
        tick: "Payments",
        title: "Set up payments",
        detail: "Connect your Razorpay account. Buyers pay you directly.",
        level: 0.44,
      },
      {
        tick: "Live",
        title: "You're live",
        detail: "Share the one link. That's it.",
        level: 0.1,
      },
    ],
  },
  {
    name: "A sale, start to finish",
    blurb:
      "Someone taps your link from a story and ends up with the file in their inbox. Nothing in this chain needs you awake for it.",
    steps: [
      {
        tick: "Tap",
        title: "They open your page",
        detail: "One link in your bio, and the visit is recorded with where it came from.",
        level: 0.55,
      },
      {
        tick: "Browse",
        title: "They switch to Shop",
        detail: "Products sit in their own tab, so nobody scrolls past your links to find them.",
        level: 0.3,
      },
      {
        tick: "Checkout",
        title: "Payment opens in place",
        detail: "A modal on your own page, with no redirect to a domain they don't recognise.",
        level: 0.42,
      },
      {
        tick: "Paid",
        title: "The card clears",
        detail: "Razorpay handles it, including international cards. We never see the number.",
        level: 0.12,
      },
      {
        tick: "Delivered",
        title: "The file lands",
        detail: "A private, signed, expiring download link, issued the second payment confirms.",
        level: 0.35,
      },
      {
        tick: "Tracked",
        title: "The sale is attributed",
        detail: "Back to the exact story that sent them, so you know what to post next.",
        level: 0.08,
      },
    ],
  },
  {
    name: "Moving in from Linktree",
    blurb:
      "You don't rebuild the page by hand. You paste the old one and correct whatever came across wrong.",
    steps: [
      {
        tick: "Paste",
        title: "You paste the old URL",
        detail: "Linktree, Stan, or anything else with a public page.",
        level: 0.5,
      },
      {
        tick: "Read",
        title: "It reads the page",
        detail: "Titles, links and images are pulled across automatically.",
        level: 0.25,
      },
      {
        tick: "Review",
        title: "You check the result",
        detail: "Nothing publishes until you've looked at it and fixed what's off.",
        level: 0.4,
      },
      {
        tick: "Live",
        title: "Your page goes live",
        detail: "At your own username, with checkout already wired up.",
        level: 0.1,
      },
    ],
  },
  {
    name: "Turning a visit into a subscriber",
    blurb:
      "The people who aren't ready to buy today are the ones worth keeping. They go straight to your list.",
    steps: [
      {
        tick: "Signup",
        title: "They leave an email",
        detail: "An email block sits inline on the page, with no popup, no second site.",
        level: 0.5,
      },
      {
        tick: "Stored",
        title: "It's saved to your list",
        detail: "Yours, exported whenever you want it.",
        level: 0.28,
      },
      {
        tick: "Synced",
        title: "Pushed to your ESP",
        detail: "Kit, Beehiiv or MailerLite, in the background.",
        level: 0.38,
      },
      {
        tick: "Traced",
        title: "You see what earned it",
        detail: "Which block, and which traffic source, produced the signup.",
        level: 0.1,
      },
    ],
  },
];

const W = 520;
const H = 132;
const PAD_X = 26;
const PLOT_TOP = 30;
const PLOT_H = 74;
const STEP_MS = 2400;

function pointsFor(steps: Step[]) {
  const span = W - PAD_X * 2;
  return steps.map((step, i) => ({
    x: PAD_X + (span * i) / Math.max(steps.length - 1, 1),
    y: PLOT_TOP + step.level * PLOT_H,
  }));
}

/**
 * The one genuinely animated thing on the page: a scenario plays itself
 * out along a timeline, the line draws in behind the playhead, and the
 * caption underneath changes with it.
 *
 * It only runs while it's actually on screen, and every step is reachable
 * by hand (arrows) — the autoplay is a convenience, never the only way to
 * read the content. Under reduced motion it stops moving and becomes a
 * plain stepper.
 */
export function SaleTimeline() {
  const reduceMotion = useReducedMotion();
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(!reduceMotion);
  // Starts true on purpose: if the observer never fires — a throttled tab,
  // a browser that stalls it — the card should still be playing rather than
  // sitting frozen forever. The observer's job is only to pause it once it
  // positively reports the card is off screen.
  const [inView, setInView] = useState(true);
  const [pathLength, setPathLength] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  const scenario = scenarios[scenarioIndex];
  const steps = scenario.steps;
  const points = pointsFor(steps);
  const d = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(" ");

  // Measure once per scenario so the draw-in can be expressed as a dash
  // offset. If this never runs the dark path simply renders whole, which
  // is a fine resting state rather than a broken one.
  useEffect(() => {
    if (pathRef.current) setPathLength(pathRef.current.getTotalLength());
  }, [d]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.35 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Kept in a ref so the interval can branch on the current step without
  // doing it inside a state updater — updaters run twice under StrictMode,
  // which would skip a scenario every cycle.
  const activeRef = useRef(0);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    if (!playing || !inView || reduceMotion) return;
    const id = window.setInterval(() => {
      const next = activeRef.current + 1;
      if (next >= steps.length) {
        // Rolled past the last step — move on to the next scenario so the
        // card keeps telling new stories instead of looping one forever.
        setScenarioIndex((s) => (s + 1) % scenarios.length);
        setActive(0);
      } else {
        setActive(next);
      }
    }, STEP_MS);
    return () => window.clearInterval(id);
  }, [playing, inView, reduceMotion, steps.length]);

  const changeScenario = useCallback((delta: number) => {
    setScenarioIndex((prev) => (prev + delta + scenarios.length) % scenarios.length);
    setActive(0);
  }, []);

  const progress = steps.length > 1 ? active / (steps.length - 1) : 1;
  const head = points[active];
  const step = steps[active];
  const spring = reduceMotion
    ? { duration: 0 }
    : ({ type: "spring", bounce: 0, duration: 0.55 } as const);

  return (
    <div
      ref={rootRef}
      className="overflow-hidden rounded-md border border-border bg-surface-1"
    >
      <div className="flex items-start justify-between gap-6 p-5">
        <div>
          <p className="t-heading">{scenario.name}</p>
          <p className="t-body mt-1.5 max-w-[46ch] text-text-secondary">
            {scenario.blurb}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* which of the three stories is playing */}
          <div className="hidden items-center gap-1.5 sm:flex">
            {scenarios.map((s, i) => (
              <span
                key={s.name}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === scenarioIndex
                    ? "w-4 bg-accent"
                    : "w-1 bg-[var(--border-strong)]"
                }`}
              />
            ))}
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => changeScenario(-1)}
              aria-label="Previous scenario"
              className="flex h-7 w-7 items-center justify-center rounded border border-border text-text-secondary transition-[background-color,border-color,color,transform] duration-150 ease-out hover:border-[var(--border-strong)] hover:bg-surface-2 hover:text-text-primary active:scale-[0.94]"
            >
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={() => changeScenario(1)}
              aria-label="Next scenario"
              className="flex h-7 w-7 items-center justify-center rounded border border-border text-text-secondary transition-[background-color,border-color,color,transform] duration-150 ease-out hover:border-[var(--border-strong)] hover:bg-surface-2 hover:text-text-primary active:scale-[0.94]"
            >
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      <div className="px-5">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label={`${scenario.name}: step ${active + 1} of ${steps.length}, ${step.title}`}
        >
          {/* Axis ticks. The first and last sit on the plot edges, so
              centring their text pushes half the word outside the viewBox
              and it gets clipped ("USERNAME" rendering as "JSERNAME").
              Anchor those two inward instead. */}
          {points.map((p, i) => (
            <text
              key={steps[i].tick}
              x={p.x}
              y={16}
              textAnchor={
                i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"
              }
              className="t-mono"
              fill={i === active ? "var(--text-primary)" : "var(--text-muted)"}
            >
              {steps[i].tick}
            </text>
          ))}

          {/* full path, resting state */}
          <path
            ref={pathRef}
            d={d}
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth={1}
          />

          {/* the same path drawing in behind the playhead */}
          {pathLength > 0 && (
            <motion.path
              d={d}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={1.5}
              strokeLinecap="round"
              style={{ strokeDasharray: pathLength }}
              // Motion can't read a starting value off the DOM for
              // strokeDashoffset, so it has to be declared or the first
              // transition animates from "undefined" and is dropped.
              initial={{ strokeDashoffset: pathLength }}
              animate={{ strokeDashoffset: pathLength * (1 - progress) }}
              transition={spring}
            />
          )}

          {/* nodes */}
          {points.map((p, i) => (
            <circle
              key={`${steps[i].tick}-node`}
              cx={p.x}
              cy={p.y}
              r={i === active ? 4 : 2.5}
              fill={i <= active ? "var(--accent)" : "var(--background)"}
              stroke={i <= active ? "var(--accent)" : "var(--border-strong)"}
              strokeWidth={1}
              className="transition-[r] duration-200"
            />
          ))}

          {/* playhead */}
          <motion.line
            x1={0}
            x2={0}
            y1={PLOT_TOP - 14}
            y2={PLOT_TOP + PLOT_H + 14}
            stroke="var(--text-primary)"
            strokeWidth={1}
            animate={{ x: head.x }}
            transition={spring}
          />
        </svg>
      </div>

      {/* caption — always rendered, so the card still reads with nothing moving */}
      <div className="mt-2 flex items-end justify-between gap-6 border-t border-border p-5">
        <div>
          <p className="t-heading">{step.title}</p>
          <p className="t-body mt-1 max-w-[52ch] text-text-secondary">{step.detail}</p>
        </div>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? "Pause" : "Play"}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-border text-text-secondary transition-[background-color,border-color,color,transform] duration-150 ease-out hover:border-[var(--border-strong)] hover:bg-surface-2 hover:text-text-primary active:scale-[0.94]"
        >
          {playing ? (
            <Pause className="h-3.5 w-3.5" strokeWidth={1.5} />
          ) : (
            <Play className="h-3.5 w-3.5" strokeWidth={1.5} />
          )}
        </button>
      </div>
    </div>
  );
}
