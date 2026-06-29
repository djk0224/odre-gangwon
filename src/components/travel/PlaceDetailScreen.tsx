"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarPlus,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Globe,
  Heart,
  MapPin,
  Navigation,
  Phone,
  Share2,
  Tag,
} from "lucide-react";
import { CommunityPostCard } from "@/components/community/CommunityPostCard";
import { KakaoPlaceMap } from "@/components/travel/KakaoPlaceMap";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { StarRating } from "@/components/ui/StarRating";
import { getPlaceRatingSummary } from "@/services/communityService";
import { useCommunityStore } from "@/stores/communityStore";
import {
  getKakaoMapLink,
  getNearbyPlaces,
  getPlaceDetailMeta,
} from "@/data/placeDetailMeta";
import { getPlaceCategoryLabel } from "@/lib/placeLabels";
import { cn } from "@/lib/utils";
import { buildEngineContextFromTripStore } from "@/services/engines/engineContext";
import { useTripStore } from "@/stores/tripStore";
import type { Place } from "@/types/travel";

interface PlaceDetailScreenProps {
  place: Place;
  hasItinerary?: boolean;
  onBack: () => void;
  onOpenPlace: (placeId: string) => void;
  onAddToSchedule: (place: Place) => void;
  onPlanAroundPlace?: (place: Place) => void;
  onOpenReservation?: (placeId: string) => void;
  onRequireLogin?: () => void;
  currentUserId?: string;
}

export function PlaceDetailScreen({
  place,
  hasItinerary = false,
  onBack,
  onOpenPlace,
  onAddToSchedule,
  onPlanAroundPlace,
  onOpenReservation,
  onRequireLogin,
  currentUserId,
}: PlaceDetailScreenProps) {
  const [hoursExpanded, setHoursExpanded] = useState(false);
  const [visited, setVisited] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  const savedPlaceIds = useTripStore((state) => state.savedPlaceIds);
  const recentPlaceIds = useTripStore((state) => state.recentPlaceIds);
  const preferences = useTripStore((state) => state.preferences);
  const behaviorProfile = useTripStore((state) => state.behaviorProfile);
  const itineraryAnchorPlaceId = useTripStore((state) => state.itineraryAnchorPlaceId);
  const toggleSavedPlace = useTripStore((state) => state.toggleSavedPlace);
  const isSaved = savedPlaceIds.includes(place.id);

  const getAllPosts = useCommunityStore((state) => state.getAllPosts);
  const userPosts = useCommunityStore((state) => state.userPosts);
  const deletedPostIds = useCommunityStore((state) => state.deletedPostIds);
  const deletePost = useCommunityStore((state) => state.deletePost);
  const getComments = useCommunityStore((state) => state.getComments);
  const isPostLiked = useCommunityStore((state) => state.isPostLiked);
  const toggleLike = useCommunityStore((state) => state.toggleLike);

  const placeReviews = useMemo(
    () =>
      getAllPosts()
        .filter((post) => post.placeId === place.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 2),
    [getAllPosts, place.id, userPosts, deletedPostIds],
  );

  const ratingSummary = useMemo(
    () => getPlaceRatingSummary(getAllPosts(), place.id),
    [getAllPosts, place.id, userPosts, deletedPostIds],
  );

  const meta = useMemo(() => getPlaceDetailMeta(place), [place]);
  const nearbyPlaces = useMemo(
    () =>
      getNearbyPlaces(
        place,
        buildEngineContextFromTripStore({
          preferences,
          savedPlaceIds,
          recentPlaceIds,
          itineraryAnchorPlaceId,
          behaviorProfile,
        }),
      ),
    [place, preferences, savedPlaceIds, recentPlaceIds, itineraryAnchorPlaceId, behaviorProfile],
  );

  function showMessage(message: string) {
    setActionMessage(message);
    window.setTimeout(() => setActionMessage(""), 2200);
  }

  function handleShare() {
    const url = getKakaoMapLink(place);
    if (typeof navigator !== "undefined" && navigator.share) {
      void navigator.share({ title: place.name, text: place.description, url });
      return;
    }
    void navigator.clipboard?.writeText(url);
    showMessage("링크가 복사되었습니다.");
  }

  function handleDirections() {
    window.open(getKakaoMapLink(place), "_blank", "noopener,noreferrer");
  }

  function handleCall() {
    if (!meta.phone) {
      showMessage("등록된 전화번호가 없습니다.");
      return;
    }
    window.location.href = `tel:${meta.phone.replace(/-/g, "")}`;
  }

  return (
    <main className="pb-28">
      <section className="relative">
        {place.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            className="aspect-[4/3] w-full object-cover"
            src={place.imageUrl}
          />
        ) : (
          <div className={cn("aspect-[4/3] w-full bg-gradient-to-br", place.gradient)} />
        )}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 py-4">
          <button
            aria-label="뒤로"
            className="flex size-10 items-center justify-center rounded-full bg-paper/90 text-ink shadow-sm"
            onClick={onBack}
            type="button"
          >
            <ArrowLeft aria-hidden="true" className="size-5" />
          </button>
          <div className="flex gap-2">
            <button
              aria-label="공유"
              className="flex size-10 items-center justify-center rounded-full bg-paper/90 text-ink shadow-sm"
              onClick={handleShare}
              type="button"
            >
              <Share2 aria-hidden="true" className="size-4" />
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-4 px-5 pt-5">
        <div>
          <p className="text-sm text-stone">{getPlaceCategoryLabel(place.category)}</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">{place.name}</h1>
          <div className="mt-2 flex items-center gap-2 text-sm text-stone">
            <Heart aria-hidden="true" className="size-4 fill-pine text-pine" />
            <span>{meta.saveCount.toLocaleString("ko-KR")}</span>
            <span>·</span>
            <span>{place.estimatedDuration}</span>
          </div>
        </div>

        {actionMessage ? (
          <p className="rounded-xl bg-pine/8 px-4 py-2 text-center text-sm font-medium text-pine">
            {actionMessage}
          </p>
        ) : null}

        <div className="grid grid-cols-4 gap-2">
          <ActionButton
            active={isSaved}
            icon={Heart}
            label="찜"
            onClick={() => {
              const ok = toggleSavedPlace(place.id);
              if (!ok) {
                onRequireLogin?.();
                return;
              }
              showMessage(isSaved ? "찜을 해제했습니다." : "장소 탭 · 찜에 저장했습니다.");
            }}
          />
          <ActionButton
            active={visited}
            icon={Check}
            label="가봤어요"
            onClick={() => {
              setVisited((current) => !current);
              showMessage(visited ? "방문 기록을 취소했습니다." : "방문 기록을 남겼습니다.");
            }}
          />
          <ActionButton
            icon={CalendarPlus}
            label="일정추가"
            onClick={() => onAddToSchedule(place)}
          />
          <ActionButton icon={Navigation} label="길찾기" onClick={handleDirections} />
        </div>
      </section>

      <section className="mt-6 space-y-5 px-5">
        {meta.editorialSections.map((section) => (
          <article className="space-y-3" key={section.title}>
            <div className={cn("aspect-[16/9] rounded-xl bg-gradient-to-br", section.gradient)} />
            <h2 className="text-lg font-semibold text-ink">{section.title}</h2>
            <p className="text-sm leading-6 text-stone">{section.body}</p>
          </article>
        ))}
      </section>

      <section className="mt-8 px-5">
        <h2 className="text-lg font-semibold text-ink">기본정보</h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-pine/10 bg-paper">
          <div className="relative p-3">
            <KakaoPlaceMap coordinates={place.coordinates} placeName={place.name} />
            <button
              className="absolute bottom-5 right-5 rounded-full bg-ivory px-3 py-1.5 text-xs font-semibold text-pine shadow-sm"
              onClick={handleDirections}
              type="button"
            >
              지도 크게 보기
            </button>
          </div>

          <ul className="divide-y divide-pine/8 px-4">
            <InfoRow icon={MapPin} label={meta.address} />
            {meta.phone ? <InfoRow icon={Phone} label={meta.phone} onClick={handleCall} /> : null}
            {meta.website ? (
              <InfoRow
                icon={Globe}
                label={meta.website.replace(/^https?:\/\//, "")}
                onClick={() => window.open(meta.website, "_blank", "noopener,noreferrer")}
              />
            ) : null}
            <li className="flex gap-3 py-3">
              <Tag aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-pine" />
              <div className="flex flex-wrap gap-1.5">
                {place.tags.map((tag) => (
                  <span
                    className="rounded-full bg-pine/8 px-2 py-0.5 text-xs font-medium text-pine"
                    key={tag}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </li>
          </ul>

          <div className="grid grid-cols-2 gap-2 border-t border-pine/8 p-3">
            <PremiumButton onClick={handleCall} variant="ghost">
              전화하기
            </PremiumButton>
            <PremiumButton onClick={handleDirections}>길찾기</PremiumButton>
          </div>
        </div>
      </section>

      <section className="mt-6 px-5">
        <button
          className="flex w-full items-center justify-between rounded-xl border border-pine/10 bg-paper px-4 py-4 text-left"
          onClick={() => setHoursExpanded((current) => !current)}
          type="button"
        >
          <div>
            <p className="text-sm font-semibold text-ink">이용시간</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-stone">
              <Clock3 aria-hidden="true" className="size-3.5" />
              {place.operatingHours}
            </p>
          </div>
          <ChevronDown
            aria-hidden="true"
            className={cn("size-5 text-stone transition-transform", hoursExpanded && "rotate-180")}
          />
        </button>
        {hoursExpanded ? (
          <ul className="mt-2 overflow-hidden rounded-xl border border-pine/10 bg-paper">
            {meta.weeklyHours.map((row) => (
              <li
                className="flex items-center justify-between border-b border-pine/8 px-4 py-2.5 text-sm last:border-b-0"
                key={row.day}
              >
                <span className="font-medium text-ink">{row.day}</span>
                <span className="text-stone">{row.hours}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="mt-6 px-5">
        <h2 className="text-sm font-semibold text-ink">추가 정보</h2>
        <ul className="mt-2 space-y-2">
          {meta.amenities.map((item) => (
            <li className="text-sm text-stone" key={item}>
              · {item}
            </li>
          ))}
          <li className="text-sm text-stone">· {place.distanceNote}</li>
          {place.reservationRequired ? (
            <li className="text-sm text-pine">· ODRÉ에서 시간대 예약 후 방문을 권장합니다.</li>
          ) : null}
        </ul>
      </section>

      {placeReviews.length > 0 || ratingSummary.count > 0 ? (
        <section className="mt-8 px-5">
          <div>
            <h2 className="text-lg font-semibold text-ink">여행자 리뷰</h2>
            {ratingSummary.count > 0 ? (
              <div className="mt-2 flex items-center gap-2">
                <StarRating size="sm" value={ratingSummary.average} />
                <p className="text-xs text-stone">
                  {ratingSummary.average} · {ratingSummary.count}개 리뷰
                </p>
              </div>
            ) : null}
          </div>
          {placeReviews.length > 0 ? (
            <div className="mt-3 space-y-3">
              {placeReviews.map((post) => (
                <CommunityPostCard
                  key={post.id}
                  commentCount={getComments(post.id).length}
                  liked={isPostLiked(post.id)}
                  onDelete={
                    currentUserId && post.authorId === currentUserId
                      ? () => deletePost(post.id)
                      : undefined
                  }
                  onOpenComments={() => undefined}
                  onOpenPlace={() => onOpenPlace(post.placeId)}
                  onToggleLike={() => toggleLike(post.id)}
                  post={post}
                />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {nearbyPlaces.length > 0 ? (
        <section className="mt-8 px-5">
          <h2 className="text-lg font-semibold text-ink">주변 명소</h2>
          <ul className="mt-3 space-y-2">
            {nearbyPlaces.map(({ place: nearby, distanceLabel }) => (
              <li key={nearby.id}>
                <button
                  className="flex w-full items-center gap-3 rounded-xl border border-pine/10 bg-paper p-3 text-left"
                  onClick={() => onOpenPlace(nearby.id)}
                  type="button"
                >
                  <div
                    className={cn("size-14 shrink-0 rounded-lg bg-gradient-to-br", nearby.gradient)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">{nearby.name}</p>
                    <p className="mt-0.5 text-xs text-stone">
                      {getPlaceCategoryLabel(nearby.category)} · {distanceLabel}
                    </p>
                  </div>
                  <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-stone" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {place.partner && place.reservationRequired && onOpenReservation ? (
        <section className="mt-6 px-5">
          <PremiumButton className="w-full" onClick={() => onOpenReservation(place.id)} variant="ghost">
            입장권·시간대 확인
          </PremiumButton>
        </section>
      ) : null}

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[430px] bg-gradient-to-t from-ivory via-ivory/95 to-transparent px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-6">
        <div className="pointer-events-auto space-y-2">
          {!hasItinerary && onPlanAroundPlace ? (
            <PremiumButton className="w-full" onClick={() => onPlanAroundPlace(place)}>
              이 장소 중심으로 일정 만들기
            </PremiumButton>
          ) : (
            <PremiumButton className="w-full" onClick={() => onAddToSchedule(place)}>
              현재 일정에 추가
            </PremiumButton>
          )}
        </div>
      </div>
    </main>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  active = false,
}: {
  icon: typeof Heart;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-[11px] font-semibold transition-colors",
        active
          ? "border-pine bg-pine/8 text-pine"
          : "border-pine/10 bg-paper text-stone",
      )}
      onClick={onClick}
      type="button"
    >
      <Icon aria-hidden="true" className={cn("size-4", active && "fill-current")} />
      {label}
    </button>
  );
}

function InfoRow({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof MapPin;
  label: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-pine" />
      <span className={cn("text-sm leading-5", onClick ? "text-pine underline-offset-2" : "text-stone")}>
        {label}
      </span>
    </>
  );

  if (onClick) {
    return (
      <li>
        <button
          className="flex w-full gap-3 py-3 text-left"
          onClick={onClick}
          type="button"
        >
          {content}
        </button>
      </li>
    );
  }

  return <li className="flex gap-3 py-3">{content}</li>;
}
