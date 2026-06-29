"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { seedCommunityComments, seedCommunityPosts } from "@/data/mockCommunityPosts";
import {
  buildNewComment,
  buildNewPost,
  sortCommunityPosts,
} from "@/services/communityService";
import type {
  CommunityComment,
  CommunityPost,
  CommunitySortMode,
  SubmitPostInput,
} from "@/types/community";
import type { TravelZoneId } from "@/types/travel";

interface CommunityState {
  userPosts: CommunityPost[];
  commentsByPostId: Record<string, CommunityComment[]>;
  likedPostIds: string[];
  deletedPostIds: string[];
  submitPost: (input: SubmitPostInput) => CommunityPost;
  deletePost: (postId: string) => void;
  addComment: (postId: string, authorId: string, authorName: string, body: string) => boolean;
  toggleLike: (postId: string) => void;
  isPostLiked: (postId: string) => boolean;
  getAllPosts: () => CommunityPost[];
  getPostsForZone: (
    zoneId: TravelZoneId,
    sort: CommunitySortMode,
    placeIdFilter?: string | null,
  ) => CommunityPost[];
  getComments: (postId: string) => CommunityComment[];
}

function seedCommentCounts(): Record<string, CommunityComment[]> {
  const map: Record<string, CommunityComment[]> = {};
  for (const comment of seedCommunityComments) {
    const list = map[comment.postId] ?? [];
    list.push(comment);
    map[comment.postId] = list;
  }
  return map;
}

const initialSeedComments = seedCommentCounts();

export const useCommunityStore = create<CommunityState>()(
  persist(
    (set, get) => ({
      userPosts: [],
      commentsByPostId: initialSeedComments,
      likedPostIds: [],
      deletedPostIds: [],

      submitPost: (input) => {
        const post = buildNewPost(input);
        set((state) => ({
          userPosts: [post, ...state.userPosts],
          deletedPostIds: state.deletedPostIds.filter((id) => id !== post.id),
        }));
        return post;
      },

      deletePost: (postId) => {
        set((state) => ({
          userPosts: state.userPosts.filter((post) => post.id !== postId),
          deletedPostIds: state.deletedPostIds.includes(postId)
            ? state.deletedPostIds
            : [...state.deletedPostIds, postId],
          likedPostIds: state.likedPostIds.filter((id) => id !== postId),
        }));
      },

      addComment: (postId, authorId, authorName, body) => {
        const trimmed = body.trim();
        if (trimmed.length < 2) return false;

        const comment = buildNewComment(postId, authorId, authorName, trimmed);
        set((state) => {
          const existing = state.commentsByPostId[postId] ?? [];
          return {
            commentsByPostId: {
              ...state.commentsByPostId,
              [postId]: [...existing, comment],
            },
            userPosts: state.userPosts.map((post) =>
              post.id === postId
                ? { ...post, commentCount: post.commentCount + 1 }
                : post,
            ),
          };
        });
        return true;
      },

      toggleLike: (postId) => {
        set((state) => {
          const liked = state.likedPostIds.includes(postId);
          return {
            likedPostIds: liked
              ? state.likedPostIds.filter((id) => id !== postId)
              : [...state.likedPostIds, postId],
          };
        });
      },

      isPostLiked: (postId) => get().likedPostIds.includes(postId),

      getAllPosts: () => {
        const deleted = new Set(get().deletedPostIds);
        return [...seedCommunityPosts, ...get().userPosts].filter((post) => !deleted.has(post.id));
      },

      getPostsForZone: (zoneId, sort, placeIdFilter) => {
        const all = get().getAllPosts().filter((post) => post.zoneId === zoneId);
        const filtered = placeIdFilter
          ? all.filter((post) => post.placeId === placeIdFilter)
          : all;
        return sortCommunityPosts(filtered, sort, get().likedPostIds);
      },

      getComments: (postId) => {
        const userComments = get().commentsByPostId[postId] ?? [];
        const seed = initialSeedComments[postId] ?? [];
        return [...seed, ...userComments].sort((a, b) =>
          a.createdAt.localeCompare(b.createdAt),
        );
      },
    }),
    {
      name: "odre-community-store",
      partialize: (state) => ({
        userPosts: state.userPosts.map((post) => ({
          ...post,
          photoUrl: post.photoUrl?.startsWith("data:") ? undefined : post.photoUrl,
        })),
        commentsByPostId: state.commentsByPostId,
        likedPostIds: state.likedPostIds,
        deletedPostIds: state.deletedPostIds,
      }),
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as Partial<CommunityState>) };
        merged.commentsByPostId = {
          ...initialSeedComments,
          ...(merged.commentsByPostId ?? {}),
        };
        return merged;
      },
    },
  ),
);
