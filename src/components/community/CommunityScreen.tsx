"use client";

import { useMemo, useState } from "react";
import { PenLine } from "lucide-react";
import { CommunityPostCard } from "@/components/community/CommunityPostCard";
import { CommunityPostDetailSheet } from "@/components/community/CommunityPostDetailSheet";
import { ReviewComposeSheet } from "@/components/community/ReviewComposeSheet";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useCommunityStore } from "@/stores/communityStore";
import { useTripStore } from "@/stores/tripStore";
import { cn } from "@/lib/utils";
import type { CommunityPost, CommunitySortMode } from "@/types/community";
import type { TravelZoneId } from "@/types/travel";

const sortOptions: { id: CommunitySortMode; label: string }[] = [
  { id: "recent", label: "최신" },
  { id: "rating", label: "별점" },
  { id: "popular", label: "인기" },
];

interface CommunityScreenProps {
  zoneId: TravelZoneId;
  zoneLabel: string;
  placeFilterId?: string | null;
  recentPlaceIds: string[];
  isLoggedIn: boolean;
  authorId: string;
  authorName: string;
  onOpenPlace: (placeId: string) => void;
  onRequireLogin: () => void;
  onClearPlaceFilter?: () => void;
}

export function CommunityScreen({
  zoneId,
  zoneLabel,
  placeFilterId,
  recentPlaceIds,
  isLoggedIn,
  authorId,
  authorName,
  onOpenPlace,
  onRequireLogin,
  onClearPlaceFilter,
}: CommunityScreenProps) {
  const [sort, setSort] = useState<CommunitySortMode>("recent");
  const [composeOpen, setComposeOpen] = useState(false);
  const [detailPostId, setDetailPostId] = useState<string | null>(null);

  const getPostsForZone = useCommunityStore((state) => state.getPostsForZone);
  const getComments = useCommunityStore((state) => state.getComments);
  const toggleLike = useCommunityStore((state) => state.toggleLike);
  const isPostLiked = useCommunityStore((state) => state.isPostLiked);
  const addComment = useCommunityStore((state) => state.addComment);
  const submitPost = useCommunityStore((state) => state.submitPost);
  const deletePost = useCommunityStore((state) => state.deletePost);
  const likedPostIds = useCommunityStore((state) => state.likedPostIds);
  const userPosts = useCommunityStore((state) => state.userPosts);
  const deletedPostIds = useCommunityStore((state) => state.deletedPostIds);
  const trackBehavior = useTripStore((state) => state.trackBehavior);

  const posts = useMemo(
    () => getPostsForZone(zoneId, sort, placeFilterId),
    [getPostsForZone, zoneId, sort, placeFilterId, likedPostIds, userPosts, deletedPostIds],
  );

  const detailPost: CommunityPost | null =
    detailPostId ? posts.find((post) => post.id === detailPostId) ?? null : null;

  const filteredPlaceName = placeFilterId
    ? posts.find((post) => post.placeId === placeFilterId)?.placeName
    : undefined;

  return (
    <main className="relative space-y-5 px-5 py-6 pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
      <SectionHeader
        description={`${zoneLabel} 여행자 리뷰 · 별점 · 사진 · 댓글`}
        eyebrow="Community"
        title="커뮤니티"
      />

      {placeFilterId && filteredPlaceName ? (
        <div className="flex items-center justify-between rounded-2xl border border-pine/12 bg-paper/70 px-3 py-2">
          <p className="text-xs text-stone">
            <span className="font-semibold text-pine">{filteredPlaceName}</span> 리뷰만 보기
          </p>
          {onClearPlaceFilter ? (
            <button
              className="text-xs font-medium text-pine underline"
              onClick={onClearPlaceFilter}
              type="button"
            >
              전체
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="flex gap-2">
        {sortOptions.map((option) => (
          <button
            key={option.id}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              sort === option.id
                ? "bg-pine text-ivory"
                : "border border-pine/15 text-stone",
            )}
            onClick={() => setSort(option.id)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>

      {posts.length === 0 ? (
        <p className="rounded-2xl border border-pine/10 bg-paper/60 px-4 py-8 text-center text-sm text-stone">
          이 권역의 리뷰가 아직 없습니다. 첫 리뷰를 남겨 보세요.
        </p>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <CommunityPostCard
              key={post.id}
              commentCount={getComments(post.id).length}
              liked={isPostLiked(post.id)}
              onOpenComments={() => setDetailPostId(post.id)}
              onOpenPlace={onOpenPlace}
              onDelete={
                post.authorId === authorId
                  ? () => {
                      deletePost(post.id);
                      if (detailPostId === post.id) setDetailPostId(null);
                    }
                  : undefined
              }
              onToggleLike={() => {
                toggleLike(post.id);
                trackBehavior("review_like", { placeId: post.placeId });
              }}
              post={post}
            />
          ))}
        </div>
      )}

      <button
        aria-label="리뷰 작성"
        className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-5 z-20 flex size-14 items-center justify-center rounded-full bg-pine text-ivory shadow-[0_12px_28px_rgba(47,74,58,0.28)]"
        onClick={() => {
          if (!isLoggedIn) {
            onRequireLogin();
            return;
          }
          setComposeOpen(true);
        }}
        type="button"
      >
        <PenLine aria-hidden="true" className="size-5" />
      </button>

      <ReviewComposeSheet
        authorId={authorId}
        authorName={authorName}
        defaultPlaceId={placeFilterId}
        isLoggedIn={isLoggedIn}
        onClose={() => setComposeOpen(false)}
        onRequireLogin={onRequireLogin}
        onSubmit={(input) => {
          submitPost(input);
          trackBehavior("review_submit", { placeId: input.placeId });
        }}
        open={composeOpen}
        recentPlaceIds={recentPlaceIds}
        zoneId={zoneId}
        zoneLabel={zoneLabel}
      />

      <CommunityPostDetailSheet
        comments={detailPost ? getComments(detailPost.id) : []}
        isLoggedIn={isLoggedIn}
        liked={detailPost ? isPostLiked(detailPost.id) : false}
        onClose={() => setDetailPostId(null)}
        onOpenPlace={onOpenPlace}
        onRequireLogin={onRequireLogin}
        onSubmitComment={(body) => {
          if (!detailPost) return false;
          const ok = addComment(detailPost.id, authorId, authorName, body);
          if (ok) {
            trackBehavior("review_comment", { placeId: detailPost.placeId });
          }
          return ok;
        }}
        onToggleLike={() => {
          if (!detailPost) return;
          toggleLike(detailPost.id);
          trackBehavior("review_like", { placeId: detailPost.placeId });
        }}
        open={Boolean(detailPost)}
        post={detailPost}
      />
    </main>
  );
}
