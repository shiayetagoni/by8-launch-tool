import { useDriftingCounter } from "@/hooks/use-live-counter";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

interface LiveDataBadgeProps {
  source?: "pump.fun" | "Solana";
  isLive?: boolean;
  className?: string;
}

export function LiveDataBadge({
  source = "pump.fun",
  isLive = true,
  className,
}: LiveDataBadgeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium",
        isLive ? "text-primary" : "text-muted-foreground",
        className,
      )}
      style={
        isLive
          ? {
              background: "rgba(0, 255, 135, 0.06)",
              border: "1px solid rgba(0, 255, 135, 0.2)",
            }
          : {
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
            }
      }
    >
      <span
        className={cn(
          "inline-block w-1.5 h-1.5 rounded-full flex-shrink-0",
          isLive ? "pulse-dot" : "bg-muted-foreground",
        )}
        style={
          isLive
            ? { background: "#00ff87", boxShadow: "0 0 4px #00ff87" }
            : undefined
        }
        aria-hidden="true"
      />
      {isLive ? `Live · ${source}` : `Stale — ${source}`}
    </motion.div>
  );
}

interface BlockchainBadgeProps {
  className?: string;
}

export function BlockchainBadge({ className }: BlockchainBadgeProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <LiveDataBadge source="pump.fun" isLive />
      <LiveDataBadge source="Solana" isLive />
    </div>
  );
}

/** Boosts-today counter badge */
export function BoostsTodayBadge({ className }: { className?: string }) {
  const count = useDriftingCounter(380, 520, 20_000, 6);
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold text-primary",
        className,
      )}
      style={{
        background: "rgba(0, 255, 135, 0.08)",
        border: "1px solid rgba(0, 255, 135, 0.25)",
      }}
    >
      <motion.span
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
        className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: "#00ff87", boxShadow: "0 0 5px #00ff87" }}
        aria-hidden="true"
      />
      ⚡
      <motion.span
        key={count}
        initial={{ opacity: 0, y: -3 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {count}
      </motion.span>{" "}
      today
    </motion.div>
  );
}

/** Users online indicator */
export function UsersOnlineBadge({ className }: { className?: string }) {
  const count = useDriftingCounter(34, 127, 15_000, 8);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3 }}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium",
        className,
      )}
      style={{
        background: "rgba(0, 212, 255, 0.06)",
        border: "1px solid rgba(0, 212, 255, 0.2)",
        color: "#00d4ff",
      }}
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full pulse-dot flex-shrink-0"
        style={{ background: "#00d4ff", boxShadow: "0 0 4px #00d4ff" }}
        aria-hidden="true"
      />
      <motion.span
        key={count}
        initial={{ opacity: 0, y: -3 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {count}
      </motion.span>{" "}
      online
    </motion.div>
  );
}
