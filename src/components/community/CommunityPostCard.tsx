"use client";

import { Heart, MessageCircle } from "lucide-react";
import { StarRating } from "@/components/ui/StarRating";
import { TravelCardShell } from "@/components/ui/TravelCard";
import { cn } from "@/lib/utils";
import type { CommunityPost } from "@/types/community";

interface CommunityPostCardProps {
  post: CommunityPost;
  liked: boolean;
  commentCount: number;
  onToggleLike: () => void;
  onOpenComments: () => void;
  onOpenPlace: (placeId: string) => void;
  onDelete?: () => void;
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 0) return `${days}일 전`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours > 0) return `${hours}시간 전`;
  return "방금";
}

export function CommunityPostCard({
  post,
  liked,
  commentCount,
  onToggleLike,
  onOpenComments,
  onOpenPlace,
  onDelete,
}: CommunityPostCardProps) {
  const displayLikeCount = post.likeCount + (liked ? 1 : 0);

  return (
    <TravelCardShell className="overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">{post.authorName}</p>
            <p className="text-xs text-stone">{formatRelativeTime(post.createdAt)}</p>
          </div>
          <StarRating size="sm" value={post.rating} />
        </div>

        <button
          className="mt-2 text-left text-sm font-semibold text-pine hover:underline"
          onClick={() => onOpenPlace(post.placeId)}
          type="button"
        >
          {post.placeName}
        </button>

        <p className="mt-2 text-sm leading-6 text-ink/90">{post.body}</p>

        {post.photoUrl ? (
          <div className="mt-3 overflow-hidden rounded-2xl border border-pine/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={`${post.placeName} 방문 사진`}
              className="max-h-56 w-full object-cover"
              src={post.photoUrl}
            />
          </div>
        ) : null}

        <div className="mt-4 flex items-center gap-4">
          <button
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-medium transition-colors",
              liked ? "text-pine" : "text-stone",
            )}
            onClick={onToggleLike}
            type="button"
          >
            <Heart
              aria-hidden="true"
              className={cn("size-4", liked && "fill-pine/20")}
            />
            {displayLikeCount}
          </button>
          <button
            className="inline-flex items-center gap-1.5 text-xs font-medium text-stone"
            onClick={onOpenComments}
            type="button"
          >
            <MessageCircle aria-hidden="true" className="size-4" />
            {commentCount}
          </button>
          {onDelete ? (
            <button
              className="ml-auto text-xs font-medium text-stone underline"
              onClick={onDelete}
              type="button"
            >
              삭제
            </button>
          ) : null}
        </div>
      </div>
    </TravelCardShell>
  );
}
