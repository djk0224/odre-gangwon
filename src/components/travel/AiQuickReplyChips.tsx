"use client";

import type { AiQuickReply } from "@/services/ai/types";

interface AiQuickReplyChipsProps {
  replies: AiQuickReply[];
  disabled?: boolean;
  onSelect: (reply: AiQuickReply) => void;
}

export function AiQuickReplyChips({ replies, disabled, onSelect }: AiQuickReplyChipsProps) {
  if (replies.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {replies.map((reply) => (
        <button
          className="rounded-full border border-pine/20 bg-ivory px-3 py-1.5 text-xs font-medium text-pine transition-colors hover:bg-pine/8 disabled:opacity-50"
          disabled={disabled}
          key={reply.id}
          onClick={() => onSelect(reply)}
          type="button"
        >
          {reply.label}
        </button>
      ))}
    </div>
  );
}
