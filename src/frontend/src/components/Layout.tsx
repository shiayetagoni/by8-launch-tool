/**
 * BY8 Launch Tool — App Layout
 * Wraps all post-onboarding pages with bottom nav + safe area padding.
 * Header is only rendered on the landing page (handled by LandingPage directly).
 * Content area has correct bottom padding for the fixed nav bar.
 */

import BottomNav from "@/components/BottomNav";
import { Toaster } from "@/components/ui/sonner";
import { useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";

const LANDING_ROUTES = ["/", "/onboarding"];
const NAV_HEIGHT = 72; // px — matches the BottomNav 60px + 12px padding

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isLanding = LANDING_ROUTES.includes(location.pathname);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#0a0e1a" }}
    >
      {/* Main content */}
      <main
        className="flex-1 flex flex-col"
        style={{
          paddingBottom: isLanding ? 0 : NAV_HEIGHT,
          // iOS safe area on top for status bar
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        {children}
      </main>

      {/* Sonner toast portal */}
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "rgba(11,15,24,0.97)",
            border: "1px solid rgba(100,60,200,0.2)",
            color: "#f0f4f8",
            fontFamily: "Space Grotesk, sans-serif",
          },
        }}
      />

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  );
}
