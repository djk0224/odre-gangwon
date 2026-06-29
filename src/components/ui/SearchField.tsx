"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  "aria-label"?: string;
}

export function SearchField({
  value,
  onChange,
  placeholder,
  className,
  "aria-label": ariaLabel = "검색",
}: SearchFieldProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border border-pine/10 bg-paper px-4 py-2.5",
        className,
      )}
    >
      <Search aria-hidden="true" className="size-4 shrink-0 text-pine" />
      <input
        aria-label={ariaLabel}
        className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-stone"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="search"
        value={value}
      />
      {value ? (
        <button
          aria-label="검색어 지우기"
          className="flex size-6 shrink-0 items-center justify-center rounded-full text-stone transition-colors hover:bg-pine/8 hover:text-pine"
          onClick={() => onChange("")}
          type="button"
        >
          <X aria-hidden="true" className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
