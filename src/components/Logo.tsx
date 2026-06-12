import { cn } from "@/lib/utils.ts";

type LogoProps = {
  className?: string;
  showText?: boolean;
  variant?: "default" | "icon";
  light?: boolean;
};

export default function Logo({ className, showText = true, variant = "default", light = false }: LogoProps) {
  const iconSize = variant === "icon" ? "size-8" : "size-9";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {/* CanFlow.ai logo — stylized C with flow nodes */}
      <div className="relative">
        <svg
          viewBox="0 0 48 48"
          className={cn(iconSize)}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Red maple leaf-inspired shield */}
          <rect x="4" y="4" width="40" height="40" rx="10" fill="#CC0000" />
          {/* Flow nodes */}
          <circle cx="34" cy="14" r="3" fill="white" opacity="0.9" />
          <circle cx="14" cy="24" r="3" fill="white" opacity="0.9" />
          <circle cx="34" cy="34" r="3" fill="white" opacity="0.9" />
          {/* C arc letterform */}
          <path
            d="M34 14 C20 14 12 18 12 24 C12 30 20 34 34 34"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          {/* Flow arrow on end node */}
          <path
            d="M31 31 L34 34 L31 37"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity="0.7"
          />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col leading-tight">
          <div className="flex items-baseline gap-0">
            <span className={cn("text-xl font-bold tracking-tight", light ? "text-white" : "text-gray-900")}>
              Can
            </span>
            <span className={cn("text-xl font-bold tracking-tight", light ? "text-red-300" : "text-primary")}>
              Flow
            </span>
            <span className={cn("text-sm font-semibold", light ? "text-white/50" : "text-gray-400")}>.ai</span>
          </div>
          <span className={cn("text-[9px] tracking-widest uppercase font-semibold", light ? "text-white/50" : "text-gray-400")}>
            by AOT Technologies
          </span>
        </div>
      )}
    </div>
  );
}
