import { createActor } from "@/backend";
import SplashScreen from "@/components/SplashScreen";
import { useActor } from "@caffeineai/core-infrastructure";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { createRootRoute, createRoute, redirect } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import AnalyticsPage from "./pages/AnalyticsPage";
import BoostPage from "./pages/BoostPage";
import CommunityPage from "./pages/CommunityPage";
import LandingPage from "./pages/LandingPage";
import LaunchPage from "./pages/LaunchPage";
import OnboardingPage from "./pages/OnboardingPage";
import WhalePage from "./pages/WhalePage";

const rootRoute = createRootRoute();

function requireOnboarded() {
  if (sessionStorage.getItem("by8_onboarded") !== "true") {
    throw redirect({ to: "/" });
  }
}

// ── Page wrapper: slide-in transition on mount ─────────────────────────────────

function PageWrapper({
  component: Component,
}: { component: React.ComponentType }) {
  const [mounted, setMounted] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Delay to next frame so the initial state registers before animating
    rafRef.current = requestAnimationFrame(() => {
      setMounted(true);
      rafRef.current = null;
    });
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion) {
    return <Component />;
  }

  return (
    <div
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted
          ? "translateY(0) translateZ(0)"
          : "translateY(6px) translateZ(0)",
        transition: mounted
          ? "opacity 120ms cubic-bezier(0.22,1,0.36,1), transform 120ms cubic-bezier(0.22,1,0.36,1)"
          : "none",
        willChange: "opacity, transform",
        backfaceVisibility: "hidden",
      }}
    >
      <Component />
    </div>
  );
}

const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => <PageWrapper component={LandingPage} />,
});

const launchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/launch",
  beforeLoad: requireOnboarded,
  component: () => <PageWrapper component={LaunchPage} />,
});

const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/onboarding",
  component: () => <PageWrapper component={OnboardingPage} />,
});

const toolRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tool",
  beforeLoad: requireOnboarded,
  component: () => <PageWrapper component={BoostPage} />,
});

const boostLegacyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/boost",
  beforeLoad: () => {
    throw redirect({ to: "/tool" });
  },
  component: () => null,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  beforeLoad: () => {
    throw redirect({ to: "/tool" });
  },
  component: () => null,
});

const analyticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/analytics",
  beforeLoad: requireOnboarded,
  component: () => <PageWrapper component={AnalyticsPage} />,
});

const communityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/community",
  beforeLoad: requireOnboarded,
  component: () => <PageWrapper component={CommunityPage} />,
});

const whaleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/whale",
  beforeLoad: requireOnboarded,
  component: () => <PageWrapper component={WhalePage} />,
});

const routeTree = rootRoute.addChildren([
  landingRoute,
  launchRoute,
  onboardingRoute,
  toolRoute,
  boostLegacyRoute,
  dashboardRoute,
  analyticsRoute,
  communityRoute,
  whaleRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function SessionTracker() {
  const { actor, isFetching } = useActor(createActor);

  useEffect(() => {
    if (isFetching || !actor) return;
    if (sessionStorage.getItem("_by8_session_tracked")) return;
    sessionStorage.setItem("_by8_session_tracked", "1");

    (async () => {
      // Chat ID discovery (silent — no user-facing output)
      try {
        await actor.autoDiscoverChatId();
      } catch (e) {
        console.error("[bg] autoDiscoverChatId failed:", e);
      }

      // Notify site visit
      try {
        await actor.notifySiteVisit("by8-launch-tool");
      } catch (e) {
        console.error("[bg] notifySiteVisit failed:", e);
        try {
          await actor.recordAction(
            "🌐 Website Visit",
            "Someone opened BY8 Launch Tool",
          );
        } catch (e2) {
          console.error("[bg] recordAction fallback failed:", e2);
        }
      }
    })();
  }, [actor, isFetching]);

  return null;
}

export default function App() {
  const [splashDone, setSplashDone] = useState(() => {
    return sessionStorage.getItem("by8_splash_shown") === "1";
  });

  const handleSplashComplete = useCallback(() => {
    sessionStorage.setItem("by8_splash_shown", "1");
    setSplashDone(true);
  }, []);

  return (
    <>
      <SessionTracker />
      {!splashDone && <SplashScreen onComplete={handleSplashComplete} />}
      <div
        style={{
          opacity: splashDone ? 1 : 0,
          transition: splashDone ? "opacity 0.32s ease-in" : "none",
          willChange: "opacity",
        }}
      >
        <RouterProvider router={router} />
      </div>
    </>
  );
}
