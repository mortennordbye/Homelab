"use client";

import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { site } from "@/content/site";
import { InlineGlobe } from "@/components/InlineGlobe";
import { Tag } from "@/components/primitives/Tag";

/** How long the monitor takes to swallow the viewport before the route changes.
 *  Long enough to read as a move, short enough that it is not a wait. */
const ENTER_MS = 620;

export function Hero() {
  const reduce = useReducedMotion();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLSpanElement>(null);

  /* Walking into the room. The monitor is promoted to a fixed clone at exactly
     the rect it already occupies, then scaled until it covers the viewport,
     and only then does the route change — so the loading screen on /fun opens
     on the same frame at the same scale and the two pages read as one shot.
     `rect` is captured on click rather than measured later: by the time the
     transition ends, the page underneath may have scrolled. */
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [entering, setEntering] = useState(false);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const yWord = useTransform(scrollYProgress, [0, 1], ["0%", "-12%"]);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0.4]);

  const enterRoom = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Never swallow a middle-click, a modified click or an already-running
    // transition — those are the visitor asking for a new tab, not a walk in.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (reduce || entering) return;
    const el = screenRef.current;
    if (!el) return;
    e.preventDefault();
    setRect(el.getBoundingClientRect());
    // Two frames: one to mount the clone at its start rect, one to let the
    // browser record that rect before the transform is applied to it.
    requestAnimationFrame(() => requestAnimationFrame(() => setEntering(true)));
    window.setTimeout(() => router.push("/fun"), ENTER_MS);
  };

  /* Scale about the monitor's own centre and move that centre to the centre of
     the viewport. Anchoring at the top-left instead looks fine on a wide screen
     and lands you in the corner of the room on a phone, where the frame has to
     grow ~5x and almost all of it ends up off to the right. */
  const cover = rect
    ? Math.max(window.innerWidth / rect.width, window.innerHeight / rect.height)
    : 1;
  const dx = rect ? window.innerWidth / 2 - (rect.left + rect.width / 2) : 0;
  const dy = rect ? window.innerHeight / 2 - (rect.top + rect.height / 2) : 0;

  return (
    <section
      ref={ref}
      className="relative isolate overflow-hidden pt-32 md:pt-40"
    >
      <InlineGlobe />
      {/* Both sit above the room render rather than behind it — the scene is
          opaque, so anything under it is simply not there. */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grain opacity-[0.18] mix-blend-overlay" />
      <div
        aria-hidden
        className="absolute -z-10 left-0 right-0 top-0 h-px aurora-line opacity-60"
      />

      <div className="mx-auto grid max-w-[var(--container-wide)] grid-cols-12 gap-8 px-6 pb-20 md:px-8 md:pb-28">
        <div className="col-span-12 md:col-span-8">
          <p className="eyebrow flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
            Available · Oslo &amp; remote
          </p>

          <p className="mt-8 text-sm tracking-[0.01em] text-fg-3">
            {site.firstName} {site.lastName}
          </p>

          <motion.h1
            style={reduce ? undefined : { y: yWord, opacity }}
            className="mt-2 text-display-lg text-fg"
          >
            I am a <RotatingRole words={site.hero.rotating} reduce={!!reduce} />
          </motion.h1>

          <p className="mt-8 max-w-2xl text-lg text-fg-2 md:text-xl">
            {site.hero.sub}
          </p>

          {/* The certifications are card stock set down on the desk. The
              other two lines are claims rather than objects, so they are set as
              plain type beside them — four sheets of paper in a row is louder
              than one lamp allows. */}
          <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3">
            <Tag variant="paper">CKA</Tag>
            <Tag variant="paper">AZ-305</Tag>
            <Tag variant="paper">AZ-400</Tag>
            <span className="font-mono text-xs tracking-wide text-fg-3">
              4+ yrs production cloud
            </span>
            <span className="font-mono text-xs tracking-wide text-fg-3">
              Public &amp; private · enterprise scale
            </span>
          </div>

          {/* The way into /fun is a monitor showing the room, not a button
              describing it. Deliberately a still frame of the real scene rather
              than a second live canvas: the hero already carries the globe, and
              a static image costs no JS, no main-thread time and nothing in
              crawl budget. The scene itself is only paid for once someone
              walks in. The badge says 3D, not LIVE — the picture is a poster
              and should not claim to be a feed. */}
          <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-4">
            <Link
              href="/fun"
              onClick={enterRoom}
              className="room-feed focus-ring group inline-flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4"
            >
              <span ref={screenRef} className="relative block aspect-video w-full max-w-[300px] shrink-0 overflow-hidden rounded-[2px] border-t border-l border-r border-b border-t-[color:var(--lit-edge)] border-l-[color:var(--lit-edge-soft)] border-r-[color:var(--dark-edge)] border-b-[color:var(--dark-edge)] bg-black shadow-[var(--cast)] transition-[border-color,box-shadow] duration-500 group-hover:border-accent/65 group-hover:shadow-[0_22px_60px_-26px_rgba(var(--accent-rgb),0.55)] sm:w-[268px]">
                <Image
                  src="/images/room-poster.jpg"
                  alt=""
                  aria-hidden
                  fill
                  sizes="268px"
                  className="room-feed__img object-cover brightness-[0.68] saturate-[0.85]"
                  style={{ objectPosition: "50% 58%" }}
                />
                <span
                  aria-hidden
                  className="room-feed__sweep pointer-events-none absolute inset-x-0 top-0 h-[38%] bg-gradient-to-b from-transparent via-snow/[0.045] to-transparent"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(180deg,rgba(0,0,0,0.26)_0_1px,transparent_1px_3px)]"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 shadow-[inset_0_0_46px_14px_rgba(0,0,0,0.75)]"
                />
                <span
                  aria-hidden
                  className="absolute top-2 left-2 flex items-center gap-1.5 rounded border border-accent/30 bg-bg-2/60 px-1.5 py-1 font-mono text-[9px] tracking-[0.18em] text-fg-2"
                >
                  <span className="size-[5px] rounded-full bg-accent" />
                  3D
                </span>
                <span
                  aria-hidden
                  className="absolute inset-0 grid place-items-center bg-gradient-to-b from-bg-2/10 to-bg-2/70 opacity-0 transition-opacity duration-[400ms] group-hover:opacity-100 group-focus-visible:opacity-100"
                >
                  <span className="translate-y-1.5 rounded-full border border-accent/70 bg-bg-2/50 px-4 py-1.5 font-mono text-xs tracking-[0.26em] text-fg uppercase transition-transform duration-[450ms] ease-[var(--ease-out)] group-hover:translate-y-0">
                    enter
                  </span>
                </span>
              </span>
              <span className="block">
                <span className="block text-sm font-semibold text-fg">Walk through the room</span>
                <span className="mt-1 block text-[13px] text-fg-3">
                  Genesis, in Oslo. Walk around it.
                </span>
              </span>
            </Link>
            <p className="max-w-[24ch] text-sm text-fg-3">
              The same work, as a place you can move around in.
            </p>
          </div>
        </div>

      </div>

      {/* Portalled to <body>: this section is `isolate`, so a z-index set inside
          it cannot reach over the fixed header or the section that follows. */}
      {rect &&
        createPortal(
          // pointer-events-none as well, so a slow route change can never leave
          // a transparent pane sitting over the page.
          <div aria-hidden className="pointer-events-none fixed inset-0 z-[200]">
          <div
            className="absolute inset-0 bg-bg transition-opacity ease-out"
            style={{ opacity: entering ? 1 : 0, transitionDuration: `${ENTER_MS * 0.7}ms` }}
          />
          <div
            className="absolute overflow-hidden rounded-lg"
            style={{
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
              transformOrigin: "50% 50%",
              transform: entering ? `translate(${dx}px, ${dy}px) scale(${cover})` : "none",
              borderRadius: entering ? 0 : undefined,
              transition: `transform ${ENTER_MS}ms cubic-bezier(0.65, 0, 0.35, 1), border-radius ${ENTER_MS}ms ease-out`,
            }}
          >
            {/* Exposure walks down to what the loading screen opens on, so the
                route change is not also a brightness step. */}
            <Image
              src="/images/room-poster.jpg"
              alt=""
              aria-hidden
              fill
              sizes="100vw"
              className="object-cover saturate-[0.85] transition-[filter]"
              style={{
                objectPosition: "50% 58%",
                filter: entering ? "brightness(0.45)" : "brightness(0.68)",
                transitionDuration: `${ENTER_MS}ms`,
              }}
            />
            {/* The tube furniture goes with it, fading as the frame grows —
                holding scanlines at full strength across a whole viewport
                would look like a broken screen rather than a move. */}
            <span
              className="absolute inset-0 bg-[repeating-linear-gradient(180deg,rgba(0,0,0,0.26)_0_1px,transparent_1px_3px)] transition-opacity"
              style={{ opacity: entering ? 0.25 : 1, transitionDuration: `${ENTER_MS}ms` }}
            />
            <span
              className="absolute inset-0 shadow-[inset_0_0_46px_14px_rgba(0,0,0,0.75)] transition-opacity"
              style={{ opacity: entering ? 0.4 : 1, transitionDuration: `${ENTER_MS}ms` }}
            />
          </div>
          </div>,
          document.body,
        )}
    </section>
  );
}

/**
 * The role line cross-fades rather than types — a typewriter is a terminal
 * impression, and the hero is a room. The invisible ghost must stay: sized to
 * the widest entry, it holds the line width constant and keeps the h1 from
 * reflowing (CLS) on every change.
 */
function RotatingRole({
  words,
  reduce,
}: {
  words: readonly string[];
  reduce: boolean;
}) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (reduce || words.length < 2) return;
    const t = window.setInterval(() => {
      setIdx((i) => (i + 1) % words.length);
    }, 3800);
    return () => window.clearInterval(t);
  }, [reduce, words.length]);

  const longest = words.reduce(
    (a, b) => (b.length > a.length ? b : a),
    words[0] ?? "",
  );

  return (
    <span style={{ display: "inline-grid", verticalAlign: "top" }}>
      <span
        aria-hidden
        style={{ gridArea: "1 / 1", visibility: "hidden", whiteSpace: "nowrap" }}
      >
        {longest}
      </span>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={words[idx]}
          style={{ gridArea: "1 / 1", whiteSpace: "nowrap" }}
          className="text-accent"
          initial={reduce ? false : { opacity: 0, y: "0.14em" }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: "-0.1em" }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {words[idx]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
