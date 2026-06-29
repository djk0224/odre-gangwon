import type { TravelZoneId } from "@/types/travel";

export type CommunitySortMode = "recent" | "rating" | "popular";

export interface CommunityPost {
  id: string;
  placeId: string;
  placeName: string;
  zoneId: TravelZoneId;
  authorId: string;
  authorName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  body: string;
  photoUrl?: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  /** 시드·UI용; 실제 좋아요는 likedPostIds로 관리 */
  seedLiked?: boolean;
}

export interface CommunityComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface SubmitPostInput {
  placeId: string;
  placeName: string;
  zoneId: TravelZoneId;
  authorId: string;
  authorName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  body: string;
  photoUrl?: string;
}
