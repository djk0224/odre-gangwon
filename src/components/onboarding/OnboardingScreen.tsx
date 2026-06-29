"use client";

import { BrandStoryBeat } from "@/components/onboarding/BrandStoryBeat";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { RegionalPillarStrip } from "@/components/travel/RegionalPillarStrip";
import {
  brandStoryBeats,
  brandStoryHero,
  brandStoryPhase1,
} from "@/data/brandStory";

interface OnboardingScreenProps {
  onStart: () => void;
}

export function OnboardingScreen({ onStart }: OnboardingScreenProps) {
  return (
    <main className="min-h-full bg-pine-deep text-ivory">
      <div className="relative px-6 pb-12 pt-14">
        <div className="pointer-events-none absolute inset-x-[-20%] top-8 h-96 rounded-[50%] bg-pine blur-3xl opacity-25" />

        <div className="relative space-y-12">
          <header className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-mist">
              {brandStoryHero.eyebrow}
            </p>
            <h1 className="text-[2.2rem] font-semibold leading-[1.14] tracking-tight">
              {brandStoryHero.titleLines[0]}
              <br />
              {brandStoryHero.titleLines[1]}
            </h1>
            <p className="max-w-[340px] text-sm leading-7 text-mist">{brandStoryHero.lead}</p>
            <p className="text-xs font-medium text-sand/90">
              한국어 브랜드명 · <span className="text-ivory">{brandStoryHero.koreanName}</span>
            </p>
          </header>

          <section className="space-y-4" aria-labelledby="brand-story-heading">
            <div className="space-y-1.5">
              <h2
                className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sand/90"
                id="brand-story-heading"
              >
                브랜드 스토리
              </h2>
              <p className="text-xs leading-5 text-mist/85">
                강원을 초대하고, 실행이 끊기지 않게 설계했습니다.
              </p>
            </div>
            <div className="space-y-3">
              {brandStoryBeats.map((beat) => (
                <BrandStoryBeat key={beat.id} beat={beat} />
              ))}
            </div>
          </section>

          <section className="space-y-4" aria-labelledby="pillars-heading">
            <div className="space-y-1.5">
              <h2
                className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sand/90"
                id="pillars-heading"
              >
                강원 실행 축 5가지
              </h2>
              <p className="text-xs leading-5 text-mist/85">
                도로·액티비티·권역·로컬·예약·인증을 한 제품 안에서 연결합니다.
              </p>
            </div>
            <RegionalPillarStrip variant="onboarding" />
          </section>

          <section className="space-y-6" aria-labelledby="phase1-heading">
            <div
              className="rounded-3xl border border-ivory/12 bg-ivory/8 px-5 py-5 backdrop-blur"
              id="phase1-heading"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sand/90">
                {brandStoryPhase1.eyebrow}
              </p>
              <p className="mt-2 text-sm font-semibold leading-snug">{brandStoryPhase1.title}</p>
              <p className="mt-3 text-xs leading-6 text-mist">{brandStoryPhase1.flow}</p>
              <p className="mt-3 text-[11px] leading-5 text-mist/80">{brandStoryPhase1.note}</p>
            </div>

            <PremiumButton className="w-full min-h-11" onClick={onStart} variant="ivory">
              {brandStoryHero.koreanName} 시작하기
            </PremiumButton>
          </section>
        </div>
      </div>
    </main>
  );
}
