import { useRef, useState, useEffect } from "react";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { cn } from "@/lib/utils.ts";
import { buildSuggestions, type ExpressionSuggestion } from "@/lib/expressions.ts";

type UpstreamNode = {
  label?: string;
  nodeType: string;
  output?: Record<string, unknown>;
};

type ExpressionInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  upstreamNodes?: UpstreamNode[];
  id?: string;
};

export default function ExpressionInput({
  value,
  onChange,
  placeholder,
  multiline = false,
  rows = 4,
  upstreamNodes = [],
  id,
}: ExpressionInputProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [filter, setFilter] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  const allSuggestions = buildSuggestions(upstreamNodes);

  const filtered = filter
    ? allSuggestions.filter(
        (s) =>
          s.label.toLowerCase().includes(filter.toLowerCase()) ||
          s.description.toLowerCase().includes(filter.toLowerCase())
      )
    : allSuggestions;

  const suggestions = filtered.slice(0, 8);

  // Watch for `{{` trigger
  const handleChange = (newValue: string) => {
    onChange(newValue);

    // Find the last `{{` that hasn't been closed
    const lastOpen = newValue.lastIndexOf("{{");
    if (lastOpen !== -1) {
      const afterOpen = newValue.slice(lastOpen + 2);
      if (!afterOpen.includes("}}")) {
        setFilter(afterOpen.trim());
        setShowDropdown(true);
        setActiveIndex(0);
        return;
      }
    }
    setShowDropdown(false);
    setFilter("");
  };

  const applySuggestion = (suggestion: ExpressionSuggestion) => {
    // Replace from the last `{{` to end with the suggestion
    const lastOpen = value.lastIndexOf("{{");
    const before = lastOpen !== -1 ? value.slice(0, lastOpen) : value;
    onChange(before + suggestion.value);
    setShowDropdown(false);
    setFilter("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      const s = suggestions[activeIndex];
      if (s) applySuggestion(s);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const hasExpressions = value.includes("{{");

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        {multiline ? (
          <Textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            id={id}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={rows}
            className={cn(
              "pr-8 font-mono text-xs",
              hasExpressions && "border-amber-400 bg-amber-50/30"
            )}
          />
        ) : (
          <Input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            id={id}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={cn(
              "pr-8 font-mono text-xs",
              hasExpressions && "border-amber-400 bg-amber-50/30"
            )}
          />
        )}
        {/* {{ }} toggle hint */}
        <button
          type="button"
          tabIndex={-1}
          title="Insert expression"
          onClick={() => {
            const newVal = value + "{{ ";
            onChange(newVal);
            setShowDropdown(true);
            setFilter("");
            setActiveIndex(0);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-amber-600 hover:text-amber-800 bg-amber-100 hover:bg-amber-200 rounded px-1 py-0.5 leading-none transition-colors cursor-pointer select-none"
          style={multiline ? { top: "0.75rem", transform: "none" } : undefined}
        >
          {"{{"}&nbsp;{"}}"}
        </button>
      </div>

      {/* Autocomplete dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          <div className="px-2 py-1 text-[10px] text-gray-400 border-b border-gray-100">
            Expressions — ↑↓ navigate, Enter/Tab to insert
          </div>
          {suggestions.map((s, i) => (
            <button
              key={s.value}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                applySuggestion(s);
              }}
              className={cn(
                "w-full text-left px-3 py-2 flex items-start gap-2 hover:bg-gray-50 transition-colors cursor-pointer",
                i === activeIndex && "bg-amber-50"
              )}
            >
              <span className="font-mono text-[11px] text-amber-700 shrink-0 mt-0.5">
                {s.label}
              </span>
              <span className="text-[11px] text-gray-500 truncate">
                {s.description}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
