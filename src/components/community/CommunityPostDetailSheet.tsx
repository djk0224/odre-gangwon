"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { CommunityPostCard } from "@/components/community/CommunityPostCard";
import type { CommunityComment, CommunityPost } from "@/types/community";

interface CommunityPostDetailSheetProps {
  open: boolean;
  post: CommunityPost | null;
  comments: CommunityComment[];
  liked: boolean;
  isLoggedIn: boolean;
  onClose: () => void;
  onToggleLike: () => void;
  onSubmitComment: (body: string) => boolean;
  onOpenPlace: (placeId: string) => void;
  onRequireLogin: () => void;
}

export function CommunityPostDetailSheet({
  open,
  post,
  comments,
  liked,
  isLoggedIn,
  onClose,
  onToggleLike,
  onSubmitComment,
  onOpenPlace,
  onRequireLogin,
}: CommunityPostDetailSheetProps) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  if (!post) return null;

  function handleSubmit() {
    if (!isLoggedIn) {
      onRequireLogin();
      return;
    }
    const ok = onSubmitComment(draft);
    if (!ok) {
      setError("댓글을 2자 이상 입력해 주세요.");
      return;
    }
    setDraft("");
    setError("");
  }

  return (
    <BottomSheet
      eyebrow="Community"
      footer={
        <PremiumButton className="w-full" onClick={handleSubmit}>
          댓글 등록
        </PremiumButton>
      }
      onClose={onClose}
      open={open}
      subtitle={post.placeName}
      title="리뷰 · 댓글"
    >
      <div className="space-y-4">
        <CommunityPostCard
          commentCount={comments.length}
          liked={liked}
          onOpenComments={() => undefined}
          onOpenPlace={onOpenPlace}
          onToggleLike={onToggleLike}
          post={post}
        />

        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pine">
            댓글 {comments.length}
          </p>
          {comments.length === 0 ? (
            <p className="text-sm text-stone">첫 댓글을 남겨 보세요.</p>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className="rounded-2xl border border-pine/10 bg-paper/60 px-3 py-2.5"
              >
                <p className="text-xs font-semibold text-ink">{comment.authorName}</p>
                <p className="mt-1 text-sm leading-6 text-stone">{comment.body}</p>
              </div>
            ))
          )}
        </section>

        <textarea
          className="min-h-20 w-full resize-none rounded-2xl border border-pine/15 bg-ivory px-3 py-2.5 text-sm text-ink outline-none focus:border-pine/40"
          onChange={(event) => setDraft(event.target.value)}
          placeholder={isLoggedIn ? "댓글을 입력하세요" : "로그인 후 댓글을 남길 수 있어요"}
          value={draft}
        />
        {error ? <p className="text-xs text-red-700">{error}</p> : null}
      </div>
    </BottomSheet>
  );
}
