import {
  getNaverNewsClientId,
  getNaverNewsClientSecret,
  isNaverNewsConfigured,
} from "@/lib/serverEnv";

const NAVER_NEWS_ENDPOINT = "https://openapi.naver.com/v1/search/news.json";

export interface NaverNewsItem {
  title: string;
  originallink: string;
  link: string;
  description: string;
  pubDate: string;
}

export interface NaverNewsSearchOptions {
  display?: number;
  start?: number;
  sort?: "sim" | "date";
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNaverNewsResponse(payload: unknown): NaverNewsItem[] {
  if (!payload || typeof payload !== "object") return [];
  const items = (payload as { items?: unknown }).items;
  if (!Array.isArray(items)) return [];

  return items
    .filter((item): item is Record<string, string> => Boolean(item && typeof item === "object"))
    .map((item) => ({
      title: stripHtml(item.title ?? ""),
      originallink: item.originallink ?? "",
      link: item.link ?? "",
      description: stripHtml(item.description ?? ""),
      pubDate: item.pubDate ?? "",
    }))
    .filter((item) => item.title.length > 0);
}

export async function searchNaverNews(
  query: string,
  options: NaverNewsSearchOptions = {},
): Promise<NaverNewsItem[]> {
  if (!isNaverNewsConfigured()) return [];

  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const params = new URLSearchParams({
    query: trimmedQuery,
    display: String(options.display ?? 5),
    start: String(options.start ?? 1),
    sort: options.sort ?? "date",
  });

  const response = await fetch(`${NAVER_NEWS_ENDPOINT}?${params.toString()}`, {
    headers: {
      "X-Naver-Client-Id": getNaverNewsClientId(),
      "X-Naver-Client-Secret": getNaverNewsClientSecret(),
    },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`Naver news API ${response.status}: ${response.statusText}`);
  }

  const payload = (await response.json()) as unknown;
  return parseNaverNewsResponse(payload);
}

export function dedupeNaverNewsItems(items: NaverNewsItem[]): NaverNewsItem[] {
  const seen = new Set<string>();
  const deduped: NaverNewsItem[] = [];

  for (const item of items) {
    const key = item.originallink || item.link || item.title;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}

export function formatNaverNewsSourceLine(item: NaverNewsItem, maxLength = 35): string {
  const title = item.title.length > maxLength ? `${item.title.slice(0, maxLength - 1)}…` : item.title;
  return title;
}

export function parseNaverNewsPubDate(pubDate: string): string | undefined {
  const parsed = new Date(pubDate);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10);
}

/** ISO 날짜(2026-06-01) 이상인지 */
export function isNaverNewsOnOrAfter(pubDate: string, floorIso: string): boolean {
  const parsed = parseNaverNewsPubDate(pubDate);
  if (!parsed) return false;
  return parsed >= floorIso;
}

export function filterNaverNewsSince(items: NaverNewsItem[], floorIso: string): NaverNewsItem[] {
  return items.filter((item) => isNaverNewsOnOrAfter(item.pubDate, floorIso));
}

export { stripHtml as stripNaverNewsHtml };
