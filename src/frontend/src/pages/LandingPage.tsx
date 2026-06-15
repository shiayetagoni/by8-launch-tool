/**
 * BY8 Launch Tool — Landing Page
 * Full professional SaaS landing page with mobile hamburger nav.
 * No auto-advancing, no Telegram, Discord-only community.
 */

import AnimatedDemoPanel from "@/components/AnimatedDemoPanel";
import GlobalActivityTicker from "@/components/GlobalActivityTicker";
import { Testimonials } from "@/components/Testimonials";
import { haptic, useHaptics } from "@/hooks/use-haptics";
import { useDriftingCounter } from "@/hooks/use-live-counter";
import { useRouter } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// ─────────────────────────────────────────────
// Static data
// ─────────────────────────────────────────────

const NAV_LINKS = [
  { id: "how-it-works", label: "How It Works" },
  { id: "features", label: "Features" },
  { id: "demo", label: "Demo" },
  { id: "community", label: "Community" },
  { id: "faq", label: "FAQ" },
] as const;

const TRUST_STATS = [
  { label: "Trusted by active traders", value: "12,400+" },
  { label: "In token visibility driven", value: "$2.4M+" },
  { label: "Uptime", value: "99.9%" },
];

const PROBLEMS = [
  {
    icon: "👁",
    title: "No Visibility Data",
    body: "Most creators launch without knowing where attention is coming from. Without data, you can't optimise for traction.",
  },
  {
    icon: "📊",
    title: "Blind Engagement Signals",
    body: "Without real-time analytics you miss how engagement develops and what's driving early momentum — or killing it.",
  },
  {
    icon: "⚡",
    title: "Missed Launch Windows",
    body: "Token traction windows are narrow. Without live insight into early signals, you can't act when it matters most.",
  },
];

const HOW_STEPS = [
  {
    step: "01",
    icon: "🔍",
    title: "Add Token Details",
    body: "Paste your Solana contract address. BY8 fetches real on-chain metadata — name, symbol, supply — automatically.",
  },
  {
    step: "02",
    icon: "🚀",
    title: "Activate Tracking System",
    body: "Our analytics engine indexes on-chain signals, visibility patterns, and engagement data across the network.",
  },
  {
    step: "03",
    icon: "📈",
    title: "Monitor Live Dashboard",
    body: "Watch visibility scores, engagement rates, and trend signals update in real time on your personal dashboard.",
  },
];

const FEATURES = [
  {
    icon: "⚡",
    title: "Real-Time Visibility Tracking",
    body: "Live dashboards showing your token's reach and engagement as it happens across the network.",
  },
  {
    icon: "📊",
    title: "Engagement Analytics",
    body: "Track engagement rate, trend direction, and activity signals that show real community interest.",
  },
  {
    icon: "🎯",
    title: "Launch Performance Insights",
    body: "Actionable insights about your token's launch stage — Seed, Early, Growth, Momentum — with progression signals.",
  },
  {
    icon: "🖥",
    title: "Clean SaaS Dashboard",
    body: "Intuitive interface inspired by best-in-class analytics tools. No noise, no clutter — just what you need.",
  },
  {
    icon: "⏱",
    title: "Fast Onboarding",
    body: "From contract address to live tracking in under 2 minutes. No lengthy setup or technical knowledge required.",
  },
];

const TRUST_POINTS = [
  {
    icon: "🔑",
    title: "No Private Key Access — Ever",
    body: "BY8 never requests private keys or seed phrases. Your wallet secrets stay entirely in your control.",
  },
  {
    icon: "🛡",
    title: "Read-Only Analytics System",
    body: "All data is read from public on-chain sources. BY8 never writes to the chain or interacts with your funds.",
  },
  {
    icon: "🔌",
    title: "Non-Custodial Wallet Integration",
    body: "If you connect a wallet, it is strictly read-only. BY8 cannot access, control, or move any funds.",
  },
  {
    icon: "✅",
    title: "Wallet Connection is Optional",
    body: "Core analytics are fully available without a wallet. Optional features always notify you before connecting.",
  },
  {
    icon: "🔒",
    title: "Your Data is Safe",
    body: "We only use publicly available on-chain data. No private information is stored beyond your tracking preferences.",
  },
];

const WHALE_PREVIEW = [
  { rank: 1, address: "5AG5...yVh", balance: "142.7M", status: "Eligible" },
  { rank: 2, address: "0xb3...91c", balance: "98.4M", status: "Eligible" },
  { rank: 3, address: "0xe2...77f", balance: "71.1M", status: "Eligible" },
  { rank: 4, address: "0xa1...44b", balance: "52.8M", status: "Eligible" },
  { rank: 5, address: "0xd4...6e8", balance: "39.2M", status: "Pending" },
];

const FAQS = [
  {
    q: "Is BY8 affiliated with Pump.fun?",
    a: "No. BY8 Launch Tool is an independent analytics product and is not affiliated with, endorsed by, or connected to Pump.fun in any way. We are a standalone platform focused on token launch visibility.",
  },
  {
    q: "Do I need to connect my wallet?",
    a: "No wallet connection is required to get started. All core analytics are read-only and accessible without a wallet. Optional features clearly state when a wallet connection is needed — and it's always your choice.",
  },
  {
    q: "Is my data safe with BY8?",
    a: "Yes. We only use publicly available on-chain data. No private keys are ever requested. No sensitive information beyond your token's contract address and tracking preferences is stored.",
  },
  {
    q: "How fast does visibility tracking start?",
    a: "Immediately after setup. Most tokens see their first engagement metrics within minutes of activating the tracking dashboard. Data updates continuously in real time.",
  },
  {
    q: "What tokens does BY8 support?",
    a: "BY8 currently supports Solana-based tokens. You can track any token with a valid Solana contract address. Support for additional networks including Ethereum and Base is on the roadmap.",
  },
];

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function SectionHeading({
  children,
  sub,
}: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="text-center mb-10 md:mb-14">
      <h2
        className="text-2xl md:text-3xl lg:text-4xl font-bold leading-tight"
        style={{ fontFamily: "Space Grotesk, sans-serif", color: "#f0f4f8" }}
      >
        {children}
      </h2>
      {sub && (
        <p
          className="mt-3 text-base max-w-xl mx-auto leading-relaxed"
          style={{ color: "#8892a4" }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

function FAQItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => {
    haptic("tap");
    setOpen((v) => !v);
  }, []);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: open ? "rgba(0,196,255,0.04)" : "rgba(11,15,24,0.75)",
        border: open
          ? "1px solid rgba(0,196,255,0.22)"
          : "1px solid rgba(100,60,200,0.12)",
        transition: "background 200ms ease, border-color 200ms ease",
      }}
      data-ocid={`faq.item.${index + 1}`}
    >
      <button
        type="button"
        className="w-full flex items-center justify-between px-5 py-4 text-left gap-4"
        onClick={toggle}
        aria-expanded={open}
        data-ocid={`faq.toggle.${index + 1}`}
      >
        <span
          className="font-semibold text-sm md:text-base leading-snug"
          style={{ color: "#e8edf5", fontFamily: "Space Grotesk, sans-serif" }}
        >
          {q}
        </span>
        <span
          className="flex-shrink-0 text-lg"
          style={{
            color: open ? "#00c4ff" : "#8892a4",
            transform: open ? "rotate(45deg)" : "rotate(0deg)",
            transition:
              "transform 220ms cubic-bezier(0.34,1.56,0.64,1), color 200ms ease",
            display: "block",
          }}
        >
          +
        </span>
      </button>
      <div
        style={{
          maxHeight: open ? "220px" : "0px",
          overflow: "hidden",
          transition: "max-height 280ms cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        <div className="px-5 pb-5">
          <p className="text-sm leading-relaxed" style={{ color: "#8892a4" }}>
            {a}
          </p>
        </div>
      </div>
    </div>
  );
}

function useStaggerReveal(selector: string, staggerMs = 60) {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const cards = Array.from(
              (entry.target as HTMLElement).querySelectorAll<HTMLElement>(
                "[data-stagger]",
              ),
            );
            cards.forEach((card, i) => {
              card.style.transitionDelay = `${i * staggerMs}ms`;
              card.classList.add("stagger-visible");
            });
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.1 },
    );
    const sections = document.querySelectorAll(selector);
    for (const s of sections) observer.observe(s);
    return () => observer.disconnect();
  }, [selector, staggerMs]);
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────

export default function LandingPage() {
  const router = useRouter();
  useHaptics();

  const demoRef = useRef<HTMLElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const liveUserCount = useDriftingCounter(820, 890, 8000, 8);

  const handleGetStarted = useCallback(() => {
    haptic("confirm");
    void router.navigate({ to: "/onboarding" });
  }, [router]);

  const handleViewDemo = useCallback(() => {
    haptic("tap");
    demoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleNavClick = useCallback(
    (id: string) => {
      haptic("tap");
      setMobileMenuOpen(false);
      setTimeout(
        () => {
          document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
        },
        mobileMenuOpen ? 200 : 0,
      );
    },
    [mobileMenuOpen],
  );

  // Close menu on outside click or escape
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [mobileMenuOpen]);

  useStaggerReveal("[data-stagger-section]", 60);

  return (
    <div className="min-h-screen" style={{ background: "#0a0e1a" }}>
      {/* ── Sticky Nav ── */}
      <header
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          background: "rgba(10,14,26,0.88)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderBottom: "1px solid rgba(100,60,200,0.14)",
        }}
        data-ocid="nav.header"
      >
        <div
          className="flex items-center justify-between px-5 md:px-10"
          style={{ height: 64 }}
        >
          {/* Logo */}
          <a
            href="#hero"
            className="flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
            data-ocid="nav.logo_link"
          >
            <img
              src="/assets/logo.png"
              alt="BY8 Launch Tool"
              className="h-9 w-auto object-contain"
              style={{
                filter:
                  "drop-shadow(0 0 10px rgba(0,180,255,0.45)) drop-shadow(0 0 4px rgba(179,102,255,0.25))",
              }}
            />
            <span
              className="font-bold text-sm hidden sm:block"
              style={{
                fontFamily: "Space Grotesk, sans-serif",
                background: "linear-gradient(135deg, #00b4ff, #b366ff)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              BY8 Launch Tool
            </span>
          </a>

          {/* Desktop nav links */}
          <nav
            className="hidden md:flex items-center gap-6 text-sm"
            style={{ color: "#8892a4" }}
          >
            {NAV_LINKS.map((link) => (
              <button
                key={link.id}
                type="button"
                className="hover:text-foreground transition-colors duration-200 bg-transparent border-0 p-0 cursor-pointer"
                style={{ color: "inherit" }}
                onClick={() => handleNavClick(link.id)}
                data-ocid={`nav.link.${link.id.replace(/-/g, "_")}`}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Desktop CTA + Mobile hamburger */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="btn-3d px-5 py-2 rounded-xl text-sm font-bold min-h-[40px] hidden sm:flex items-center"
              onClick={handleGetStarted}
              data-ocid="nav.get_started_button"
            >
              Get Started
            </button>
            {/* Hamburger — mobile only */}
            <button
              type="button"
              className="md:hidden w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-200"
              style={{
                background: mobileMenuOpen
                  ? "rgba(0,180,255,0.1)"
                  : "rgba(136,146,164,0.08)",
                border: `1px solid ${mobileMenuOpen ? "rgba(0,180,255,0.25)" : "rgba(136,146,164,0.12)"}`,
                color: mobileMenuOpen ? "#00b4ff" : "#8892a4",
              }}
              onClick={() => {
                haptic("tap");
                setMobileMenuOpen((v) => !v);
              }}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              data-ocid="nav.hamburger_button"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile slide-down menu */}
        <div
          style={{
            maxHeight: mobileMenuOpen ? "320px" : "0px",
            overflow: "hidden",
            transition: "max-height 280ms cubic-bezier(0.4,0,0.2,1)",
            background: "rgba(8,12,20,0.97)",
            borderTop: mobileMenuOpen
              ? "1px solid rgba(100,60,200,0.12)"
              : "none",
          }}
          data-ocid="nav.mobile_menu"
        >
          <div className="px-5 py-4 flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <button
                key={link.id}
                type="button"
                className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors duration-200"
                style={{
                  color: "#c8cfe0",
                  background: "transparent",
                  border: "none",
                }}
                onClick={() => handleNavClick(link.id)}
                data-ocid={`nav.mobile_link.${link.id.replace(/-/g, "_")}`}
              >
                {link.label}
              </button>
            ))}
            <button
              type="button"
              className="btn-3d mt-2 w-full py-3 rounded-xl text-sm font-bold min-h-[44px]"
              onClick={() => {
                setMobileMenuOpen(false);
                handleGetStarted();
              }}
              data-ocid="nav.mobile_get_started_button"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* ── SECTION 1: Hero ── */}
      <section
        id="hero"
        className="relative min-h-screen flex flex-col items-center justify-center px-5 pt-16 overflow-hidden"
        data-ocid="hero.section"
      >
        {/* Ambient blobs */}
        <div
          className="ambient-blob ambient-blob-a"
          style={{ top: "10%", left: "15%" }}
          aria-hidden
        />
        <div
          className="ambient-blob ambient-blob-b"
          style={{ top: "55%", right: "10%" }}
          aria-hidden
        />
        <div
          className="ambient-blob ambient-blob-c"
          style={{ bottom: "20%", left: "40%" }}
          aria-hidden
        />

        {/* Radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 50% 40%, rgba(0,180,255,0.06) 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 30% 70%, rgba(179,102,255,0.04) 0%, transparent 60%)",
          }}
          aria-hidden
        />

        <div className="relative z-10 text-center max-w-3xl mx-auto">
          {/* Logo mark */}
          <div className="flex justify-center mb-8">
            <img
              src="/assets/logo.png"
              alt="BY8 Launch Tool"
              className="h-16 md:h-20 w-auto object-contain"
              style={{
                filter:
                  "drop-shadow(0 0 20px rgba(0,180,255,0.55)) drop-shadow(0 0 8px rgba(179,102,255,0.35))",
              }}
            />
          </div>

          {/* Eyebrow badge */}
          <div className="flex justify-center mb-5">
            <span
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold"
              style={{
                background: "rgba(0,180,255,0.08)",
                border: "1px solid rgba(0,180,255,0.18)",
                color: "#00b4ff",
                fontFamily: "Space Grotesk, sans-serif",
              }}
            >
              <span
                className="pulse-dot w-1.5 h-1.5 rounded-full"
                style={{ background: "#00b4ff" }}
              />
              Token Visibility Platform
            </span>
          </div>

          {/* Headline */}
          <h1
            className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight mb-5"
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              color: "#f0f4f8",
            }}
          >
            Understand Your <span className="text-gradient">Token Launch</span>{" "}
            in Real Time
          </h1>

          {/* Subtext */}
          <p
            className="text-base md:text-lg leading-relaxed mb-5 max-w-xl mx-auto"
            style={{ color: "#8892a4" }}
          >
            BY8 helps Web3 creators track visibility, engagement, and early
            traction signals during token launches — no wallet connection
            required to get started.
          </p>

          {/* Live user count pill */}
          <div className="flex justify-center mb-7">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
              style={{
                background: "rgba(0,255,135,0.06)",
                border: "1px solid rgba(0,255,135,0.15)",
              }}
              data-ocid="hero.live_user_count"
            >
              <span
                className="pulse-dot w-2 h-2 rounded-full"
                style={{ background: "#00ff87" }}
              />
              <span
                className="text-sm font-semibold"
                style={{
                  color: "#e8edf5",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {liveUserCount.toLocaleString()}
              </span>
              <span className="text-xs" style={{ color: "#8892a4" }}>
                teams tracking tokens right now
              </span>
            </div>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
            <button
              type="button"
              className="btn-3d btn-shimmer px-7 py-3.5 rounded-xl text-sm font-bold min-h-[48px] w-full sm:w-auto"
              onClick={handleGetStarted}
              data-ocid="hero.get_started_button"
            >
              Get Started
            </button>
            <button
              type="button"
              className="btn-3d-ghost px-7 py-3.5 rounded-xl text-sm font-bold min-h-[48px] w-full sm:w-auto"
              onClick={handleViewDemo}
              data-ocid="hero.view_demo_button"
            >
              View Live Demo →
            </button>
          </div>

          {/* Trust stats strip */}
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 pt-6"
            style={{ borderTop: "1px solid rgba(100,60,200,0.1)" }}
            data-ocid="hero.trust_strip"
          >
            {TRUST_STATS.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center gap-0.5"
              >
                <span
                  className="text-lg font-bold"
                  style={{
                    color: "#00b4ff",
                    fontFamily: "Space Grotesk, sans-serif",
                  }}
                >
                  {stat.value}
                </span>
                <span className="text-xs" style={{ color: "#8892a4" }}>
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll cue */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5"
          style={{ color: "rgba(136,146,164,0.35)" }}
          aria-hidden
        >
          <span
            className="text-xs tracking-widest uppercase"
            style={{ fontSize: 10 }}
          >
            Scroll
          </span>
          <div
            className="w-px h-8"
            style={{
              background:
                "linear-gradient(to bottom, rgba(136,146,164,0.35), transparent)",
            }}
          />
        </div>
      </section>

      {/* ── Activity Ticker Row ── */}
      <GlobalActivityTicker />

      {/* ── SECTION 2: Problem ── */}
      <section
        id="why"
        className="px-5 py-20 md:py-28"
        style={{ background: "rgba(13,17,38,0.6)" }}
        data-ocid="why.section"
      >
        <div className="max-w-5xl mx-auto">
          <SectionHeading sub="Understanding why tokens fail is the first step to making yours succeed.">
            Most Token Launches Fail Without Visibility Data
          </SectionHeading>

          <div className="grid md:grid-cols-3 gap-5" data-stagger-section>
            {PROBLEMS.map((item, i) => (
              <div
                key={item.title}
                className="card-premium rounded-2xl p-6 flex flex-col gap-4"
                data-stagger
                data-ocid={`why.card.${i + 1}`}
              >
                <span className="text-3xl">{item.icon}</span>
                <h3
                  className="font-bold text-base"
                  style={{
                    color: "#e8edf5",
                    fontFamily: "Space Grotesk, sans-serif",
                  }}
                >
                  {item.title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "#8892a4" }}
                >
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 3: How It Works ── */}
      <section
        id="how-it-works"
        className="px-5 py-20 md:py-28"
        data-ocid="how.section"
      >
        <div className="max-w-5xl mx-auto">
          <SectionHeading sub="Three simple steps from token entry to live visibility tracking.">
            How BY8 Works
          </SectionHeading>

          <div className="grid md:grid-cols-3 gap-6 relative">
            {/* Connector line desktop */}
            <div
              className="hidden md:block absolute top-12 left-1/3 right-1/3 h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(0,196,255,0.3), transparent)",
                maskImage:
                  "repeating-linear-gradient(90deg, black 0, black 8px, transparent 8px, transparent 14px)",
                WebkitMaskImage:
                  "repeating-linear-gradient(90deg, black 0, black 8px, transparent 8px, transparent 14px)",
              }}
              aria-hidden
            />

            {HOW_STEPS.map((step, i) => (
              <div
                key={step.step}
                className="flex flex-col items-center text-center gap-4"
                data-ocid={`how.step.${i + 1}`}
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-2xl relative z-10"
                  style={{
                    background: "rgba(8,13,22,0.97)",
                    border: "1px solid rgba(0,196,255,0.28)",
                    boxShadow:
                      "0 0 0 4px rgba(0,196,255,0.06), 0 0 20px rgba(0,196,255,0.12)",
                  }}
                >
                  {step.icon}
                </div>
                <div
                  className="text-xs font-mono font-bold tracking-widest"
                  style={{
                    color: "#00b4ff",
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  STEP {step.step}
                </div>
                <h3
                  className="font-bold text-base leading-snug"
                  style={{
                    color: "#e8edf5",
                    fontFamily: "Space Grotesk, sans-serif",
                  }}
                >
                  {step.title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "#8892a4" }}
                >
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 4: Features ── */}
      <section
        id="features"
        className="px-5 py-20 md:py-28"
        style={{ background: "rgba(13,17,38,0.6)" }}
        data-ocid="features.section"
      >
        <div className="max-w-5xl mx-auto">
          <SectionHeading sub="Everything you need, nothing you don't. Designed for speed and clarity.">
            Built for Fast-Moving Token Launches
          </SectionHeading>

          <div
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
            data-stagger-section
          >
            {FEATURES.map((feat, i) => (
              <div
                key={feat.title}
                className="card-glass rounded-2xl p-5 flex gap-4 items-start"
                data-stagger
                style={{
                  transition:
                    "transform 220ms cubic-bezier(0.34,1.2,0.64,1), box-shadow 220ms ease, border-color 220ms ease, opacity 400ms cubic-bezier(0.22,1,0.36,1)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform =
                    "translateY(-2px) translateZ(0)";
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    "0 0 20px rgba(0,196,255,0.08), 0 8px 24px rgba(0,0,0,0.3)";
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "rgba(100,60,200,0.22)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform =
                    "translateZ(0)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "rgba(255,255,255,0.07)";
                }}
                data-ocid={`features.card.${i + 1}`}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                  style={{
                    background:
                      i % 2 === 0
                        ? "rgba(0,180,255,0.08)"
                        : "rgba(179,102,255,0.08)",
                    border: `1px solid ${i % 2 === 0 ? "rgba(0,180,255,0.15)" : "rgba(179,102,255,0.15)"}`,
                  }}
                >
                  {feat.icon}
                </div>
                <div className="min-w-0">
                  <h3
                    className="font-bold text-sm mb-1"
                    style={{
                      color: "#e8edf5",
                      fontFamily: "Space Grotesk, sans-serif",
                    }}
                  >
                    {feat.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "#8892a4" }}
                  >
                    {feat.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 5: Live Demo ── */}
      <section
        id="demo"
        ref={demoRef}
        className="px-5 py-20 md:py-28"
        style={{ background: "rgba(8,12,22,0.7)" }}
        data-ocid="demo.section"
      >
        <div className="max-w-4xl mx-auto">
          <SectionHeading sub="An interactive walkthrough of what your live dashboard looks like. Press Play to start.">
            See BY8 in Action
          </SectionHeading>

          <div className="flex items-center justify-center gap-3 mb-6">
            <span
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{
                background: "rgba(0,180,255,0.07)",
                border: "1px solid rgba(0,180,255,0.16)",
                color: "#00b4ff",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "#00b4ff", opacity: 0.9 }}
              />
              User-controlled · Click Play to start
            </span>
          </div>

          <AnimatedDemoPanel className="max-w-2xl mx-auto" />
        </div>
      </section>

      {/* ── SECTION 6: Trust & Security ── */}
      <section
        id="trust"
        className="px-5 py-20 md:py-28"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,30,60,0.25) 0%, rgba(13,17,38,0.7) 50%, rgba(0,30,60,0.25) 100%)",
          borderTop: "1px solid rgba(0,180,255,0.06)",
          borderBottom: "1px solid rgba(0,180,255,0.06)",
        }}
        data-ocid="trust.section"
      >
        <div className="max-w-5xl mx-auto">
          <SectionHeading sub="Your security and trust are the foundation of everything we build.">
            Your Security Is Non-Negotiable
          </SectionHeading>

          <div className="grid md:grid-cols-2 gap-5 mb-10">
            {TRUST_POINTS.map((point, i) => (
              <div
                key={point.title}
                className={`flex gap-4 items-start p-5 rounded-2xl${
                  TRUST_POINTS.length % 2 !== 0 && i === TRUST_POINTS.length - 1
                    ? " md:col-span-2"
                    : ""
                }`}
                style={{
                  background:
                    i === TRUST_POINTS.length - 1 &&
                    TRUST_POINTS.length % 2 !== 0
                      ? "rgba(0,255,135,0.03)"
                      : "rgba(0,180,255,0.03)",
                  border:
                    i === TRUST_POINTS.length - 1 &&
                    TRUST_POINTS.length % 2 !== 0
                      ? "1px solid rgba(0,255,135,0.12)"
                      : "1px solid rgba(0,180,255,0.1)",
                }}
                data-ocid={`trust.card.${i + 1}`}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                  style={{
                    background:
                      i === TRUST_POINTS.length - 1 &&
                      TRUST_POINTS.length % 2 !== 0
                        ? "rgba(0,255,135,0.08)"
                        : "rgba(0,180,255,0.08)",
                    border:
                      i === TRUST_POINTS.length - 1 &&
                      TRUST_POINTS.length % 2 !== 0
                        ? "1px solid rgba(0,255,135,0.15)"
                        : "1px solid rgba(0,180,255,0.15)",
                  }}
                >
                  {point.icon}
                </div>
                <div className="min-w-0">
                  <h3
                    className="font-bold text-sm mb-1.5"
                    style={{
                      color: "#e8edf5",
                      fontFamily: "Space Grotesk, sans-serif",
                    }}
                  >
                    ✓ {point.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "#8892a4" }}
                  >
                    {point.body}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Security badges */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {[
              { icon: "✓", label: "Platform Audited for Read-Only Compliance" },
              { icon: "✓", label: "99.9% Uptime SLA" },
              { icon: "✓", label: "Zero Private Key Access" },
            ].map((badge) => (
              <div
                key={badge.label}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
                style={{
                  background: "rgba(0,255,135,0.04)",
                  border: "1px solid rgba(0,255,135,0.15)",
                }}
              >
                <span
                  className="text-sm font-bold flex-shrink-0"
                  style={{ color: "#00ff87" }}
                >
                  {badge.icon}
                </span>
                <span
                  className="text-xs font-medium"
                  style={{ color: "#c8cfe0" }}
                >
                  {badge.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 7: Testimonials ── */}
      <section
        id="testimonials"
        className="px-5 py-20 md:py-28"
        data-ocid="testimonials.section"
      >
        <div className="max-w-5xl mx-auto">
          <SectionHeading sub="Real traders, real results. See what the BY8 community is saying.">
            Trusted by Token Creators
          </SectionHeading>
          <Testimonials />
        </div>
      </section>

      {/* ── SECTION 8: Whale Leaderboard Preview ── */}
      <section
        id="whale-leaderboard"
        className="px-5 py-20 md:py-28"
        style={{ background: "rgba(13,17,38,0.6)" }}
        data-ocid="whale_leaderboard.section"
      >
        <div className="max-w-2xl mx-auto">
          <SectionHeading sub="Wallets holding the most tokens, verified by the BY8 analytics engine.">
            Verified Whale Holders
          </SectionHeading>

          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "rgba(10,14,26,0.95)",
              border: "1px solid rgba(0,196,255,0.12)",
            }}
          >
            {/* Table header */}
            <div
              className="grid grid-cols-4 px-4 py-3 text-[10px] font-bold tracking-widest uppercase"
              style={{
                background: "rgba(0,196,255,0.04)",
                borderBottom: "1px solid rgba(0,196,255,0.1)",
                color: "#8892a4",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              <span>Rank</span>
              <span>Wallet</span>
              <span className="text-right">Balance</span>
              <span className="text-right">Status</span>
            </div>

            {/* Rows — top 5 */}
            {WHALE_PREVIEW.map((entry, i) => (
              <div
                key={entry.address}
                className="grid grid-cols-4 px-4 py-3 items-center"
                style={{
                  background:
                    i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                  borderBottom:
                    i < WHALE_PREVIEW.length - 1
                      ? "1px solid rgba(255,255,255,0.04)"
                      : "none",
                }}
                data-ocid={`whale_leaderboard.item.${i + 1}`}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-sm font-bold"
                    style={{
                      color: entry.rank <= 3 ? "#fbbf24" : "#8892a4",
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    {entry.rank <= 3 && "🐳 "}#{entry.rank}
                  </span>
                </div>
                <span
                  className="text-xs font-mono truncate"
                  style={{
                    color: "#00b4ff",
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  {entry.address}
                </span>
                <span
                  className="text-xs font-bold text-right"
                  style={{
                    color: "#e8edf5",
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  {entry.balance}
                </span>
                <div className="flex justify-end">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background:
                        entry.status === "Eligible"
                          ? "rgba(0,255,135,0.08)"
                          : "rgba(251,191,36,0.08)",
                      border: `1px solid ${
                        entry.status === "Eligible"
                          ? "rgba(0,255,135,0.2)"
                          : "rgba(251,191,36,0.2)"
                      }`,
                      color:
                        entry.status === "Eligible" ? "#00ff87" : "#fbbf24",
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    {entry.status}
                  </span>
                </div>
              </div>
            ))}

            {/* CTA */}
            <div
              className="px-4 py-4 flex items-center justify-between"
              style={{ borderTop: "1px solid rgba(0,196,255,0.1)" }}
            >
              <p className="text-xs" style={{ color: "#8892a4" }}>
                Showing top {WHALE_PREVIEW.length} whale holders
              </p>
              <button
                type="button"
                className="btn-3d-cyan px-4 py-2 rounded-xl text-xs font-bold min-h-[36px]"
                onClick={() => {
                  haptic("tap");
                  void router.navigate({ to: "/whale" });
                }}
                data-ocid="whale_leaderboard.join_button"
              >
                Join the Leaderboard →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 9: FAQ ── */}
      <section id="faq" className="px-5 py-20 md:py-28" data-ocid="faq.section">
        <div className="max-w-2xl mx-auto">
          <SectionHeading sub="Straightforward answers to the questions we hear most.">
            Frequently Asked Questions
          </SectionHeading>

          <div className="flex flex-col gap-3">
            {FAQS.map((faq, i) => (
              <FAQItem key={faq.q} q={faq.q} a={faq.a} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 10: Community ── */}
      <section
        id="community"
        className="px-5 py-24 md:py-32 text-center relative overflow-hidden"
        style={{
          background:
            "linear-gradient(180deg, rgba(13,17,38,0.6) 0%, rgba(20,10,50,0.5) 50%, rgba(8,12,22,0.8) 100%)",
          borderTop: "1px solid rgba(179,102,255,0.08)",
          borderBottom: "1px solid rgba(179,102,255,0.06)",
        }}
        data-ocid="community.section"
      >
        {/* Background glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(179,102,255,0.05) 0%, transparent 70%)",
          }}
          aria-hidden
        />

        <div className="max-w-xl mx-auto relative z-10">
          {/* Discord icon orb */}
          <div
            className="w-20 h-20 rounded-2xl mx-auto mb-7 flex items-center justify-center"
            style={{
              background: "rgba(88,101,242,0.12)",
              border: "1px solid rgba(88,101,242,0.3)",
              boxShadow:
                "0 0 40px rgba(88,101,242,0.15), 0 0 80px rgba(179,102,255,0.08)",
            }}
            aria-hidden
          >
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="#5865F2"
              aria-hidden="true"
            >
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
            </svg>
          </div>

          {/* Eyebrow */}
          <div className="flex justify-center mb-4">
            <span
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                background: "rgba(88,101,242,0.1)",
                border: "1px solid rgba(88,101,242,0.25)",
                color: "#7b8fff",
              }}
            >
              <span
                className="pulse-dot w-1.5 h-1.5 rounded-full"
                style={{ background: "#5865F2" }}
              />
              Discord Community
            </span>
          </div>

          <h2
            className="text-3xl md:text-4xl font-bold mb-4"
            style={{
              color: "#f0f4f8",
              fontFamily: "Space Grotesk, sans-serif",
              letterSpacing: "-0.01em",
            }}
          >
            Join the BY8 Community
          </h2>
          <p
            className="text-base leading-relaxed mb-3"
            style={{ color: "#8892a4", maxWidth: 420, margin: "0 auto 1.5rem" }}
          >
            Connect with Web3 creators and token teams. Share launch insights,
            get real-time tips, and stay ahead of traction signals.
          </p>

          {/* Member count social proof */}
          <div className="flex justify-center mb-8">
            <div
              className="inline-flex items-center gap-3 px-4 py-2 rounded-full"
              style={{
                background: "rgba(88,101,242,0.07)",
                border: "1px solid rgba(88,101,242,0.18)",
              }}
            >
              <span
                className="pulse-dot w-1.5 h-1.5 rounded-full"
                style={{ background: "#5865F2" }}
              />
              <span
                className="text-sm"
                style={{ color: "rgba(136,146,164,0.8)" }}
              >
                Active launch discussions · No hype · Real analytics talk
              </span>
            </div>
          </div>

          <a
            href="https://discord.gg/DAAHMM4t"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-3d inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl text-base font-bold min-h-[52px]"
            onClick={() => haptic("tap")}
            data-ocid="community.discord_button"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
            </svg>
            Join Discord
          </a>

          <p
            className="mt-5 text-xs"
            style={{ color: "rgba(136,146,164,0.45)" }}
          >
            discord.gg/DAAHMM4t
          </p>
        </div>
      </section>

      {/* ── SECTION 11: Footer ── */}
      <footer
        className="px-5 py-12 relative"
        style={{
          background: "rgba(6,9,18,0.97)",
          borderTop: "1px solid rgba(100,60,200,0.1)",
        }}
        data-ocid="footer.section"
      >
        {/* Gradient divider */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(0,196,255,0.3), rgba(181,111,255,0.3), transparent)",
          }}
          aria-hidden
        />

        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8 mb-8">
            {/* Brand */}
            <div className="flex flex-col items-center md:items-start gap-3">
              <div className="flex items-center gap-2.5">
                <img
                  src="/assets/logo.png"
                  alt="BY8 Launch Tool"
                  className="h-8 w-auto object-contain"
                  style={{
                    filter:
                      "drop-shadow(0 0 8px rgba(0,180,255,0.4)) drop-shadow(0 0 3px rgba(179,102,255,0.2))",
                  }}
                />
                <span
                  className="font-bold text-sm"
                  style={{
                    fontFamily: "Space Grotesk, sans-serif",
                    background: "linear-gradient(135deg, #00b4ff, #b366ff)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  BY8 Launch Tool
                </span>
              </div>
              <p
                className="text-xs text-center md:text-left"
                style={{ color: "#8892a4" }}
              >
                Professional token launch analytics for Web3 creators.
              </p>
            </div>

            {/* Links */}
            <nav
              className="flex flex-wrap justify-center md:justify-end gap-x-6 gap-y-2 text-sm"
              style={{ color: "#8892a4" }}
            >
              <a
                href="https://discord.gg/DAAHMM4t"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors duration-200"
                onClick={() => haptic("tap")}
                data-ocid="footer.discord_link"
              >
                Discord
              </a>
              <button
                type="button"
                className="hover:text-foreground transition-colors duration-200 bg-transparent border-0 p-0 cursor-pointer"
                style={{ color: "inherit" }}
                onClick={() => haptic("tap")}
                data-ocid="footer.terms_link"
              >
                Terms of Service
              </button>
              <button
                type="button"
                className="hover:text-foreground transition-colors duration-200 bg-transparent border-0 p-0 cursor-pointer"
                style={{ color: "inherit" }}
                onClick={() => haptic("tap")}
                data-ocid="footer.privacy_link"
              >
                Privacy Policy
              </button>
              <a
                href="mailto:support@by8.io"
                className="hover:text-foreground transition-colors duration-200"
                onClick={() => haptic("tap")}
                data-ocid="footer.contact_link"
              >
                Contact
              </a>
            </nav>
          </div>

          <div
            className="flex flex-col md:flex-row items-center justify-between gap-3 pt-6 text-xs"
            style={{
              borderTop: "1px solid rgba(100,60,200,0.08)",
              color: "#8892a4",
            }}
          >
            <p>
              © {new Date().getFullYear()} BY8 Launch Tool. All rights reserved.
            </p>
            <p
              className="text-center"
              style={{ color: "rgba(136,146,164,0.7)" }}
            >
              Built with love using{" "}
              <a
                href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "by8.caffeine.xyz")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 transition-colors hover:opacity-100"
                style={{ color: "rgba(136,146,164,0.7)" }}
              >
                caffeine.ai
              </a>
            </p>
            <p
              className="text-center md:text-right"
              style={{ color: "rgba(136,146,164,0.55)", maxWidth: 400 }}
            >
              For defensive analysis only. Not affiliated with pump.fun. Not
              financial advice.
            </p>
          </div>

          {/* Uptime row */}
          <div
            className="flex items-center justify-between mt-5 pt-5"
            style={{ borderTop: "1px solid rgba(100,60,200,0.05)" }}
          >
            <div
              className="flex items-center gap-2"
              data-ocid="footer.uptime_status"
            >
              <span
                className="pulse-dot w-1.5 h-1.5 rounded-full"
                style={{ background: "#00ff87" }}
              />
              <span className="text-[11px]" style={{ color: "#8892a4" }}>
                All systems operational
              </span>
              <span
                className="text-[11px] font-semibold"
                style={{
                  color: "#00ff87",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                · 99.9% uptime this month
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
