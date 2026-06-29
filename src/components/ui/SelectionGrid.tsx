"use client";

import { cn } from "@/lib/utils";

export interface SelectionOption<T extends string> {
  id: T;
  label: string;
  description?: string;
}

type SelectionGridBaseProps<T extends string> = {
  options: SelectionOption<T>[];
  columns?: 2 | 3;
  size?: "md" | "lg";
};

type SingleSelectionGridProps<T extends string> = SelectionGridBaseProps<T> & {
  multiple?: false;
  value: T;
  onChange: (value: T) => void;
};

type MultiSelectionGridProps<T extends string> = SelectionGridBaseProps<T> & {
  multiple: true;
  value: T[];
  onChange: (value: T[]) => void;
};

type SelectionGridProps<T extends string> =
  | SingleSelectionGridProps<T>
  | MultiSelectionGridProps<T>;

export function SelectionGrid<T extends string>(props: SelectionGridProps<T>) {
  const { options, onChange, columns = 2, size = "md", multiple = false } = props;
  const value = props.value;

  const selectedSet = new Set(Array.isArray(value) ? value : [value]);

  return (
    <div
      className={cn(
        "grid gap-2.5",
        columns === 2 ? "grid-cols-2" : "grid-cols-3",
      )}
    >
      {options.map((option) => {
        const selected = selectedSet.has(option.id);
        return (
          <button
            className={cn(
              "rounded-2xl border text-center font-semibold transition-colors",
              size === "lg" ? "min-h-[3.25rem] px-4 py-4 text-base" : "min-h-[2.75rem] px-3 py-3 text-sm",
              selected
                ? "border-pine bg-paper text-pine shadow-[0_0_0_3px_rgba(47,74,58,0.1)]"
                : "border-transparent bg-ivory text-stone hover:border-pine/15",
            )}
            key={option.id}
            onClick={() => {
              if (multiple) {
                const current = Array.isArray(value) ? value : [];
                const next = selected
                  ? current.filter((item) => item !== option.id)
                  : [...current, option.id];
                (onChange as MultiSelectionGridProps<T>["onChange"])(
                  next.length > 0 ? next : current,
                );
                return;
              }
              (onChange as SingleSelectionGridProps<T>["onChange"])(option.id);
            }}
            type="button"
          >
            <span className="block">{option.label}</span>
            {option.description && size === "lg" ? (
              <span className="mt-1 block text-xs font-normal text-stone">
                {option.description}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
