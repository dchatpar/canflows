/**
 * GCTopBar — Government of Canada accessibility bar with EN/FR toggle.
 * Positioned above the main header following Canada.ca design standards.
 */
import { useLanguage } from "@/contexts/language-context.tsx";
import { cn } from "@/lib/utils.ts";

type GCTopBarProps = { className?: string };

export default function GCTopBar({ className }: GCTopBarProps) {
  const { lang, setLang, t } = useLanguage();

  return (
    <div
      className={cn(
        "w-full border-b border-[#b5b5b5] bg-white text-[13px]",
        className
      )}
      role="banner"
    >
      {/* Skip nav */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-primary focus:text-white focus:px-4 focus:py-2 focus:text-sm"
      >
        {t.skipToMain}
      </a>

      <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-4 py-1.5">
        {/* GC wordmark — SVG-based, red/white Canada.ca brand */}
        <div className="flex items-center gap-3">
          {/* Canada wordmark flag motif */}
          <svg
            viewBox="0 0 40 28"
            className="h-7 w-auto"
            aria-hidden="true"
            focusable="false"
          >
            {/* Left red stripe */}
            <rect x="0" y="0" width="12" height="28" fill="#CC0000" />
            {/* White center */}
            <rect x="12" y="0" width="16" height="28" fill="white" />
            {/* Maple leaf in center */}
            <path
              d="M20 4 L21.5 8.5 L26 8 L22.5 11 L24 15.5 L20 13 L16 15.5 L17.5 11 L14 8 L18.5 8.5 Z"
              fill="#CC0000"
            />
            <rect x="19" y="15" width="2" height="4" fill="#CC0000" />
            {/* Right red stripe */}
            <rect x="28" y="0" width="12" height="28" fill="#CC0000" />
          </svg>
          <span className="hidden text-xs text-gray-600 sm:block">
            {t.officialSite}
          </span>
        </div>

        {/* Language toggle */}
        <button
          onClick={() => setLang(lang === "en" ? "fr" : "en")}
          className="rounded border border-[#284162] px-3 py-1 text-[13px] font-medium text-[#284162] transition hover:bg-[#284162] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#284162]"
          aria-label={lang === "en" ? "Changer la langue en français" : "Change language to English"}
          lang={lang === "en" ? "fr" : "en"}
        >
          {t.langToggle}
        </button>
      </div>
    </div>
  );
}
