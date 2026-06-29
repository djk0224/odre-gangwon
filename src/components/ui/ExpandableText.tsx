"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ExpandableTextProps {
  children: string;
  className?: string;
  collapsedClassName?: string;
  expandLabel?: string;
  collapseLabel?: string;
}

export function ExpandableText({
  children,
  className,
  collapsedClassName = "line-clamp-3",
  expandLabel = "더보기",
  collapseLabel = "접기",
}: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el || expanded) return;

    function measure() {
      if (!el) return;
      setHasOverflow(el.scrollHeight > el.clientHeight + 1);
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [children, expanded]);

  const showToggle = hasOverflow || expanded;

  return (
    <div>
      <p
        ref={textRef}
        className={cn(className, !expanded && collapsedClassName)}
      >
        {children}
      </p>
      {showToggle ? (
        <button
          className="mt-1.5 text-xs font-semibold text-pine hover:text-pine-deep"
          onClick={(event) => {
            event.stopPropagation();
            setExpanded((current) => !current);
          }}
          type="button"
        >
          {expanded ? collapseLabel : expandLabel}
        </button>
      ) : null}
    </div>
  );
}
