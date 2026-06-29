import type {
  CommunityComment,
  CommunityPost,
  CommunitySortMode,
  SubmitPostInput,
} from "@/types/community";

const MIN_BODY_LENGTH = 10;

export function validateReviewBody(body: string): string | null {
  const trimmed = body.trim();
  if (trimmed.length < MIN_BODY_LENGTH) {
    return `리뷰는 ${MIN_BODY_LENGTH}자 이상 입력해 주세요.`;
  }
  if (trimmed.length > 800) {
    return "리뷰는 800자 이내로 작성해 주세요.";
  }
  return null;
}

export function sortCommunityPosts(
  posts: CommunityPost[],
  mode: CommunitySortMode,
  likedPostIds: string[],
): CommunityPost[] {
  const copy = [...posts];
  switch (mode) {
    case "rating":
      return copy.sort((a, b) => b.rating - a.rating || b.createdAt.localeCompare(a.createdAt));
    case "popular":
      return copy.sort((a, b) => {
        const aLikes = a.likeCount + (likedPostIds.includes(a.id) ? 1 : 0);
        const bLikes = b.likeCount + (likedPostIds.includes(b.id) ? 1 : 0);
        return bLikes - aLikes || b.createdAt.localeCompare(a.createdAt);
      });
    case "recent":
    default:
      return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export function getPlaceRatingSummary(
  posts: CommunityPost[],
  placeId: string,
): { average: number; count: number } {
  const forPlace = posts.filter((post) => post.placeId === placeId);
  if (forPlace.length === 0) {
    return { average: 0, count: 0 };
  }
  const sum = forPlace.reduce((acc, post) => acc + post.rating, 0);
  return { average: Math.round((sum / forPlace.length) * 10) / 10, count: forPlace.length };
}

export function mergePostLikeState(
  post: CommunityPost,
  likedPostIds: string[],
): CommunityPost & { likedByMe: boolean } {
  const likedByMe = likedPostIds.includes(post.id);
  return {
    ...post,
    likedByMe,
    likeCount: post.likeCount + (likedByMe ? 1 : 0),
  };
}

export function buildNewPost(input: SubmitPostInput): CommunityPost {
  return {
    id: `post-user-${Date.now()}`,
    placeId: input.placeId,
    placeName: input.placeName,
    zoneId: input.zoneId,
    authorId: input.authorId,
    authorName: input.authorName,
    rating: input.rating,
    body: input.body.trim(),
    photoUrl: input.photoUrl,
    createdAt: new Date().toISOString(),
    likeCount: 0,
    commentCount: 0,
  };
}

export function buildNewComment(
  postId: string,
  authorId: string,
  authorName: string,
  body: string,
): CommunityComment {
  return {
    id: `comment-${Date.now()}`,
    postId,
    authorId,
    authorName,
    body: body.trim(),
    createdAt: new Date().toISOString(),
  };
}
