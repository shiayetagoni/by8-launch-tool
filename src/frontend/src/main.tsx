import { InternetIdentityProvider } from "@caffeineai/core-infrastructure";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Component, type ErrorInfo, type ReactNode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

BigInt.prototype.toJSON = function () {
  return this.toString();
};

declare global {
  interface BigInt {
    toJSON(): string;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      // Never throw query errors into React tree — let components handle null actor
      throwOnError: false,
      retry: (failureCount, error) => {
        // Don't retry canister ID / config errors — they won't self-resolve
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes("CANISTER_ID_BACKEND") || msg.includes("not set")) {
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});

// ─── Error Boundary ─────────────────────────────────────────────────────────

interface ErrorBoundaryState {
  hasError: boolean;
}

class SilentErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log silently — backend connectivity is optional
    console.warn(
      "[SilentErrorBoundary] Caught error:",
      error.message,
      info.componentStack,
    );
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Wrap InternetIdentityProvider so that if backend config fails, the app still renders
function SafeIdentityProvider({ children }: { children: ReactNode }) {
  return (
    <SilentErrorBoundary fallback={children}>
      <InternetIdentityProvider>{children}</InternetIdentityProvider>
    </SilentErrorBoundary>
  );
}

// Top-level safety net: if anything in the app tree throws synchronously,
// show the app shell instead of a blank white screen
function AppErrorFallback() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "1rem",
        background: "#0a0a0a",
        color: "#e0e0e0",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ fontSize: "2rem" }}>🚀</div>
      <p style={{ margin: 0 }}>Loading BY8 Launch Tool…</p>
      <p style={{ margin: 0, fontSize: "0.75rem", opacity: 0.5 }}>
        Connecting to network
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{
          marginTop: "0.5rem",
          padding: "0.5rem 1.25rem",
          borderRadius: "6px",
          border: "1px solid #444",
          background: "transparent",
          color: "#e0e0e0",
          cursor: "pointer",
          fontSize: "0.875rem",
        }}
      >
        Retry
      </button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <SilentErrorBoundary fallback={<AppErrorFallback />}>
    <QueryClientProvider client={queryClient}>
      <SafeIdentityProvider>
        <App />
      </SafeIdentityProvider>
    </QueryClientProvider>
  </SilentErrorBoundary>,
);
