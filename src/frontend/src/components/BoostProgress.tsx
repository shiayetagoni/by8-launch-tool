import { CheckCircle2, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

// ─── Boost progress steps ──────────────────────────────────────────────────────

const STEPS = [
  { id: "verify", label: "Transaction Verified" },
  { id: "nodes", label: "Nodes Connected" },
  { id: "volume", label: "Volume Generation Active" },
  { id: "spread", label: "Market Activity Spreading..." },
];

interface BoostProgressProps {
  isVisible: boolean;
  /** 0-100 — caller drives progress based on real submission state */
  progressPct?: number;
  /** Which step ids are completed */
  completedSteps?: Set<string>;
  /** Which step id is currently active */
  activeStep?: string | null;
  onComplete?: () => void;
}

export function BoostProgress({
  isVisible,
  progressPct = 0,
  completedSteps = new Set(),
  activeStep = null,
}: BoostProgressProps) {
  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="space-y-4 mt-5"
        data-ocid="boost_progress.section"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 1.2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              }}
            >
              <Loader2 className="w-4 h-4" style={{ color: "#00ff87" }} />
            </motion.div>
            <span
              className="font-semibold text-sm"
              style={{
                fontFamily: "Space Grotesk, sans-serif",
                color: "#f0f4f8",
              }}
            >
              Boost In Progress
            </span>
          </div>
          <span
            className="text-sm font-black tabular-nums"
            style={{
              fontFamily: "JetBrains Mono, monospace",
              color: "#00ff87",
            }}
          >
            {Math.round(progressPct)}%
          </span>
        </div>

        {/* Progress bar */}
        <div
          className="w-full h-2 rounded-full overflow-hidden"
          style={{
            background: "rgba(0,255,135,0.08)",
            border: "1px solid rgba(0,255,135,0.1)",
          }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{
              background: "linear-gradient(90deg, #00ff87, #00d4ff)",
              boxShadow: "0 0 12px rgba(0,255,135,0.5)",
            }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>

        {/* Steps */}
        <div className="space-y-2">
          {STEPS.map((step) => {
            const isDone = completedSteps.has(step.id);
            const isActive = activeStep === step.id && !isDone;
            const isPending = !isDone && !isActive;

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: isPending ? 0.35 : 1, x: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-3"
                data-ocid={`boost_progress.step.${step.id}`}
              >
                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                  {isDone ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 20,
                      }}
                    >
                      <CheckCircle2
                        className="w-4 h-4"
                        style={{
                          color: "#00ff87",
                          filter: "drop-shadow(0 0 4px #00ff87)",
                        }}
                      />
                    </motion.div>
                  ) : isActive ? (
                    <motion.div
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{
                        duration: 1,
                        repeat: Number.POSITIVE_INFINITY,
                      }}
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        background: "#00ff87",
                        boxShadow: "0 0 8px #00ff87",
                      }}
                    />
                  ) : (
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: "rgba(255,255,255,0.1)" }}
                    />
                  )}
                </div>
                <span
                  className="text-xs"
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    color: isDone
                      ? "#00ff87"
                      : isActive
                        ? "#f0f4f8"
                        : "#4a5568",
                  }}
                >
                  {step.label}
                  {isDone && " ✓"}
                  {isActive && step.id === "volume" && " ⟳"}
                </span>
              </motion.div>
            );
          })}
        </div>

        <p
          className="text-[10px] text-center"
          style={{ color: "#4a5568", fontFamily: "JetBrains Mono, monospace" }}
        >
          ⚡ Results visible within 30–90 seconds on-chain
        </p>
      </motion.div>
    </AnimatePresence>
  );
}

export default BoostProgress;
