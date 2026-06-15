import { ShieldCheck, Star, TrendingUp, Users } from "lucide-react";
import { motion } from "motion/react";

type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;

interface TrustBadge {
  icon: IconComponent;
  label: string;
  value: string;
  color: string;
}

const BADGES: TrustBadge[] = [
  {
    icon: Users,
    label: "Traders Served",
    value: "12,400+",
    color: "#00ff87",
  },
  {
    icon: ShieldCheck,
    label: "Success Rate",
    value: "99.8%",
    color: "#00d4ff",
  },
  {
    icon: TrendingUp,
    label: "Volume Boosted",
    value: "$2.4M+",
    color: "#a855f7",
  },
  {
    icon: Star,
    label: "Rating",
    value: "4.9★",
    color: "#fbbf24",
  },
];

export function TrustBadges({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-center gap-2 flex-wrap ${className}`}
      data-ocid="trust_badges.row"
    >
      {BADGES.map((badge, i) => {
        const Icon = badge.icon;
        return (
          <motion.div
            key={badge.label}
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.06, duration: 0.3 }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{
              background: `${badge.color}0f`,
              border: `1px solid ${badge.color}2a`,
              boxShadow: `0 0 10px ${badge.color}0a`,
            }}
          >
            <Icon
              className="w-3 h-3 flex-shrink-0"
              style={{ color: badge.color }}
            />
            <span
              className="font-black text-[11px]"
              style={{
                color: badge.color,
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {badge.value}
            </span>
            <span
              className="text-[10px] hidden sm:inline"
              style={{ color: "#4a5568" }}
            >
              {badge.label}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

export function TrustedByBadge() {
  return (
    <div
      className="inline-flex items-center gap-1.5 text-xs"
      style={{ color: "#4a5568", fontFamily: "JetBrains Mono, monospace" }}
    >
      <ShieldCheck className="w-3 h-3" style={{ color: "#00ff87" }} />
      <span>
        Trusted by{" "}
        <span style={{ color: "#00ff87", fontWeight: 700 }}>12,400+</span>{" "}
        traders
      </span>
    </div>
  );
}

export default TrustBadges;
