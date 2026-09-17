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
    blurb: "Four steps from sign up to your first sale.",
    steps: [
      {
        tick: "Username",
        title: "Pick your username",
        detail: "Your link: orangelink.in/yourname",
        level: 0.6,
      },
      {
        tick: "Page",
        title: "Build your page",
        detail: "Add products, links, bookings and an email signup.",
        level: 0.36,
      },
      {
        tick: "Payments",
        title: "Connect payments",
        detail: "Link your Razorpay account. People pay you directly.",
        level: 0.44,
      },
      {
        tick: "Live",
        title: "Share your link",
        detail: "Put it in your bio. You're live.",
        level: 0.1,
      },
    ],
  },
  {
    name: "A sale, start to finish",
    blurb:
      "Someone taps your link and leaves with their download. You don't even need to be awake.",
    steps: [
      {
        tick: "Tap",
        title: "They open your page",
        detail: "From your bio. We note where they came from.",
        level: 0.55,
      },
      {
        tick: "Browse",
        title: "They tap Shop",
        detail: "Your products have their own tab, apart from your links.",
        level: 0.3,
      },
      {
        tick: "Checkout",
        title: "Checkout opens",
        detail: "Right on your page. No jumping to a site they don't know.",
        level: 0.42,
      },
      {
        tick: "Paid",
        title: "They pay",
        detail: "Razorpay handles the payment. We never see card details.",
        level: 0.12,
      },
      {
        tick: "Delivered",
        title: "They get the file",
        detail: "A private download link appears the moment payment clears.",
        level: 0.35,
      },
      {
        tick: "Tracked",
        title: "You see what worked",
        detail: "The sale is matched to the post that sent them, so you know what to post next.",
        level: 0.08,
      },
    ],
  },
  {
    name: "Moving in from Linktree",
    blurb:
      "No rebuilding by hand. Paste your old page and fix anything that's off.",
    steps: [
      {
        tick: "Paste",
        title: "Paste your old link",
        detail: "From Linktree, Stan or any other public page.",
        level: 0.5,
      },
      {
        tick: "Read",
        title: "We read the page",
        detail: "Titles, links and images come across on their own.",
        level: 0.25,
      },
      {
        tick: "Review",
        title: "You check it",
        detail: "Nothing goes live until you say so.",
        level: 0.4,
      },
      {
        tick: "Live",
        title: "Your page is live",
        detail: "At your username, with checkout ready to go.",
        level: 0.1,
      },
    ],
  },
  {
    name: "Turning visitors into subscribers",
    blurb:
      "Not everyone buys today. Stay in touch with the ones who don't.",
    steps: [
      {
        tick: "Signup",
        title: "They join your list",
        detail: "The signup sits right on your page. No popups.",
        level: 0.5,
      },
      {
        tick: "Stored",
        title: "It's saved for you",
        detail: "Your list is yours. Export it any time.",
        level: 0.28,
      },
      {
        tick: "Synced",
        title: "It syncs to your email tool",
        detail: "Kit, Beehiiv or MailerLite, automatically.",
        level: 0.38,
      },
      {
        tick: "Traced",
        title: "You see where they came from",
        detail: "Which block and which link brought them in.",
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
