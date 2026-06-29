import fs from "node:fs";
import path from "node:path";

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; ODRE-Gangwon/1.0)",
  Accept: "text/html,application/xhtml+xml",
};

const OG_IMAGE_PATTERNS = [
  /<meta[^>]*property=["']og:image:secure_url["'][^>]*content=["']([^"']+)["']/i,
  /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image:secure_url["']/i,
  /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
  /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
  /<meta[^>]*name=["']twitter:image(?::src)?["'][^>]*content=["']([^"']+)["']/i,
  /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image(?::src)?["']/i,
];

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function resolveUrl(raw: string, baseUrl: string): string | undefined {
  const decoded = decodeHtmlEntities(raw);
  try {
    const resolved = new URL(decoded, baseUrl);
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") return undefined;
    return resolved.toString();
  } catch {
    return undefined;
  }
}

export function parseOgImageFromHtml(html: string, baseUrl: string): string | undefined {
  for (const pattern of OG_IMAGE_PATTERNS) {
    const match = pattern.exec(html);
    if (match?.[1]) {
      const resolved = resolveUrl(match[1], baseUrl);
      if (resolved) return resolved;
    }
  }
  return undefined;
}

export async function fetchArticleOgImageUrl(
  pageUrl: string,
  options?: { referer?: string },
): Promise<string | undefined> {
  const trimmed = pageUrl.trim();
  if (!trimmed) return undefined;

  const headers: Record<string, string> = { ...FETCH_HEADERS };
  if (options?.referer) headers.Referer = options.referer;

  const response = await fetch(trimmed, {
    headers,
    redirect: "follow",
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) return undefined;

  const html = await response.text();
  return parseOgImageFromHtml(html, trimmed);
}

/** 네이버 뉴스 link → originallink 순으로 og:image 탐색 */
export async function resolveArticleHeroImageUrl(
  originallink: string,
  naverLink?: string,
): Promise<{ imageUrl: string; pageUrl: string } | undefined> {
  const candidates = [...new Set([naverLink, originallink].filter(Boolean))] as string[];

  for (const pageUrl of candidates) {
    try {
      const imageUrl = await fetchArticleOgImageUrl(pageUrl);
      if (imageUrl) return { imageUrl, pageUrl };
    } catch {
      continue;
    }
  }

  return undefined;
}

function extensionFromContentType(contentType: string | null): string {
  const lower = (contentType ?? "").toLowerCase();
  if (lower.includes("png")) return ".png";
  if (lower.includes("webp")) return ".webp";
  if (lower.includes("gif")) return ".gif";
  return ".jpg";
}

function extensionFromUrl(imageUrl: string): string | undefined {
  const match = /\.(jpe?g|png|webp|gif)(\?|$)/i.exec(imageUrl);
  if (!match) return undefined;
  const ext = match[1].toLowerCase();
  return ext === "jpeg" ? ".jpg" : `.${ext}`;
}

export async function downloadHeroImageToFile(
  imageUrl: string,
  destPathWithoutExt: string,
  options?: { referer?: string },
): Promise<string | undefined> {
  const headers: Record<string, string> = { ...FETCH_HEADERS, Accept: "image/*,*/*" };
  if (options?.referer) headers.Referer = options.referer;

  const response = await fetch(imageUrl, {
    headers,
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) return undefined;

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 512) return undefined;

  const ext =
    extensionFromUrl(imageUrl) ??
    extensionFromContentType(response.headers.get("content-type"));

  const destPath = `${destPathWithoutExt}${ext}`;
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, buffer);

  return destPath;
}

export function toPublicImagePath(absolutePath: string, publicDir: string): string {
  const relative = path.relative(publicDir, absolutePath).split(path.sep).join("/");
  return `/${relative}`;
}
