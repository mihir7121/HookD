"use client";
import { useEffect, useRef, useState } from "react";
import { normalizeTag } from "@/lib/discover";

export function TagSelect({
  value,
  onChange,
  suggestions,
  max = 3,
  color = "#00cfff",
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
  max?: number;
  color?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const normalized = normalizeTag(query);
  const q = query.toLowerCase().trim();

  // Suggestions that match the query and aren't already selected
  const filtered = suggestions.filter(
    (s) => !value.includes(s) && (q === "" || s.includes(q))
  );

  // Show create option only if: query is long enough, normalized form doesn't
  // already exist in suggestions or selected tags
  const canCreate =
    normalized.length >= 2 &&
    !suggestions.includes(normalized) &&
    !value.includes(normalized);

  const showDropdown = open && (filtered.length > 0 || canCreate);

  const addTag = (tag: string) => {
    if (value.length >= max || value.includes(tag)) return;
    onChange([...value, tag]);
    setQuery("");
    inputRef.current?.focus();
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // If there's exactly one filtered match, select it; otherwise create
      if (filtered.length === 1) {
        addTag(filtered[0]);
      } else if (canCreate) {
        addTag(normalized);
      }
    }
    if (e.key === "Escape") setOpen(false);
    if (e.key === "Backspace" && query === "" && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Selected chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1.5 px-2.5 py-1 font-mono text-xs tracking-[0.1em] uppercase"
              style={{
                border: `1px solid ${color}50`,
                color,
                background: `${color}10`,
              }}
            >
              {tag.replace(/-/g, " ")}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="leading-none transition-opacity hover:opacity-100"
                style={{ color: `${color}80` }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      {value.length < max ? (
        <div className="relative">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={
              value.length === 0
                ? "Search or create a tag..."
                : `Add ${max - value.length} more tag${max - value.length > 1 ? "s" : ""}...`
            }
            className="w-full px-3 py-2 bg-bg border border-border font-mono text-xs text-textmid placeholder:text-textdim focus:outline-none transition-colors"
            style={{ borderColor: open ? `${color}40` : undefined }}
          />
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs pointer-events-none"
            style={{ color: "rgba(255,255,255,0.18)" }}
          >
            {value.length}/{max}
          </span>
        </div>
      ) : (
        <p className="font-mono text-xs px-1" style={{ color: `${color}60` }}>
          Max {max} tags selected
        </p>
      )}

      {/* Dropdown */}
      {showDropdown && (
        <div
          className="absolute z-50 w-full mt-1 border overflow-y-auto"
          style={{
            background: "#0d0d10",
            borderColor: `${color}25`,
            maxHeight: "200px",
            boxShadow: `0 8px 32px rgba(0,0,0,0.5)`,
          }}
        >
          {filtered.length === 0 && !canCreate && (
            <p
              className="px-3 py-2 font-mono text-xs"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              No matches
            </p>
          )}
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="w-full text-left px-3 py-2 font-mono text-xs tracking-[0.12em] uppercase hover:bg-white/5 transition-colors"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              {s.replace(/-/g, " ")}
            </button>
          ))}
          {canCreate && (
            <button
              type="button"
              onClick={() => addTag(normalized)}
              className="w-full text-left px-3 py-2.5 font-mono text-xs tracking-[0.12em] transition-colors hover:bg-white/5"
              style={{
                color,
                borderTop: filtered.length > 0 ? `1px solid ${color}15` : undefined,
              }}
            >
              + create &ldquo;{normalized.replace(/-/g, " ")}&rdquo;
            </button>
          )}
        </div>
      )}
    </div>
  );
}
