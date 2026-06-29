"use client";

import { useMemo, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { StarRating } from "@/components/ui/StarRating";
import { compressImageFileToDataUrl } from "@/lib/communityImage";
import { validateReviewBody } from "@/services/communityService";
import { getCatalogPlaces } from "@/services/placeGeocodeService";
import type { SubmitPostInput } from "@/types/community";
import type { Place, TravelZoneId } from "@/types/travel";

interface ReviewComposeSheetProps {
  open: boolean;
  zoneId: TravelZoneId;
  zoneLabel: string;
  recentPlaceIds: string[];
  defaultPlaceId?: string | null;
  isLoggedIn: boolean;
  authorId: string;
  authorName: string;
  onClose: () => void;
  onSubmit: (input: SubmitPostInput) => void;
  onRequireLogin: () => void;
}

export function ReviewComposeSheet({
  open,
  zoneId,
  zoneLabel,
  recentPlaceIds,
  defaultPlaceId,
  isLoggedIn,
  authorId,
  authorName,
  onClose,
  onSubmit,
  onRequireLogin,
}: ReviewComposeSheetProps) {
  const [placeId, setPlaceId] = useState(defaultPlaceId ?? "");
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [body, setBody] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  const zonePlaces = useMemo(
    () => getCatalogPlaces().filter((place) => place.region === zoneId),
    [zoneId],
  );

  const recentPlaces = useMemo(
    () =>
      recentPlaceIds
        .map((id) => zonePlaces.find((place) => place.id === id))
        .filter((place): place is Place => Boolean(place)),
    [recentPlaceIds, zonePlaces],
  );

  const pickerPlaces = useMemo(() => {
    const merged = [...recentPlaces];
    for (const place of zonePlaces.slice(0, 12)) {
      if (!merged.some((item) => item.id === place.id)) {
        merged.push(place);
      }
    }
    return merged;
  }, [recentPlaces, zonePlaces]);

  const selectedPlace = pickerPlaces.find((place) => place.id === placeId) ?? zonePlaces[0];

  async function handlePhotoChange(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const dataUrl = await compressImageFileToDataUrl(file);
      setPhotoUrl(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "사진을 불러오지 못했습니다.");
    } finally {
      setUploading(false);
    }
  }

  function usePlaceFallbackPhoto() {
    if (selectedPlace?.imageUrl) {
      setPhotoUrl(selectedPlace.imageUrl);
    }
  }

  function handleSubmit() {
    if (!isLoggedIn) {
      onRequireLogin();
      return;
    }
    const validation = validateReviewBody(body);
    if (validation) {
      setError(validation);
      return;
    }
    if (!selectedPlace) {
      setError("리뷰할 장소를 선택해 주세요.");
      return;
    }

    onSubmit({
      placeId: selectedPlace.id,
      placeName: selectedPlace.name,
      zoneId,
      authorId,
      authorName,
      rating,
      body,
      photoUrl,
    });
    setBody("");
    setPhotoUrl(undefined);
    setRating(5);
    setError("");
    onClose();
  }

  return (
    <BottomSheet
      eyebrow="Community"
      footer={
        <PremiumButton className="w-full" disabled={uploading} onClick={handleSubmit}>
          리뷰 게시
        </PremiumButton>
      }
      onClose={onClose}
      open={open}
      subtitle={`${zoneLabel} · 장소 리뷰`}
      title="리뷰 작성"
    >
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-xs font-semibold text-pine">장소</p>
          <div className="flex flex-wrap gap-2">
            {pickerPlaces.map((place) => (
              <button
                key={place.id}
                className={
                  placeId === place.id || (!placeId && place.id === selectedPlace?.id)
                    ? "rounded-full bg-pine px-3 py-1.5 text-xs font-medium text-ivory"
                    : "rounded-full border border-pine/15 px-3 py-1.5 text-xs font-medium text-stone"
                }
                onClick={() => setPlaceId(place.id)}
                type="button"
              >
                {place.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold text-pine">별점</p>
          <StarRating onChange={setRating} value={rating} />
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold text-pine">리뷰</p>
          <textarea
            className="min-h-28 w-full resize-none rounded-2xl border border-pine/15 bg-ivory px-3 py-2.5 text-sm text-ink outline-none focus:border-pine/40"
            onChange={(event) => setBody(event.target.value)}
            placeholder="방문 경험, 혼잡도, 추천 시간대를 남겨 주세요."
            value={body}
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-pine">사진 (선택)</p>
          {photoUrl ? (
            <div className="relative overflow-hidden rounded-2xl border border-pine/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="리뷰 사진 미리보기" className="max-h-40 w-full object-cover" src={photoUrl} />
              <button
                aria-label="사진 제거"
                className="absolute right-2 top-2 rounded-full bg-ink/60 p-1 text-ivory"
                onClick={() => setPhotoUrl(undefined)}
                type="button"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-pine/20 bg-paper/50 px-4 py-6 text-sm text-stone">
              <ImagePlus aria-hidden="true" className="size-4" />
              {uploading ? "처리 중…" : "사진 추가"}
              <input
                accept="image/*"
                className="sr-only"
                onChange={(event) => void handlePhotoChange(event.target.files?.[0])}
                type="file"
              />
            </label>
          )}
          <button
            className="text-xs font-medium text-pine underline"
            onClick={usePlaceFallbackPhoto}
            type="button"
          >
            장소 대표 이미지 사용
          </button>
        </div>

        {error ? <p className="text-xs text-red-700">{error}</p> : null}
      </div>
    </BottomSheet>
  );
}
