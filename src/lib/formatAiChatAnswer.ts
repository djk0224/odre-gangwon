/** 마크다운 없이 모바일 채팅용 짧은 문장으로 정리 */
export function stripMarkdownForChat(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^#+\s*/gm, "")
    .replace(/^\s*[-*]\s+/gm, "· ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export interface AiChatDaySection {
  label: string;
  items: string[];
}

export interface AiChatDisplayBlocks {
  headline: string;
  days: AiChatDaySection[];
  tips: string[];
}

export function blocksFromPlainAnswer(text: string): AiChatDisplayBlocks {
  const plain = stripMarkdownForChat(text);
  const headline = plain.split("\n\n")[0]?.slice(0, 120) ?? plain.slice(0, 120);

  const days: AiChatDaySection[] = [];
  const tips: string[] = [];

  const dayPattern =
    /(?:^|\n)\s*(?:(?:첫째|둘째|셋째)\s*날|\d일차|Day\s*\d)\s*[:：]?\s*/gi;
  const parts = plain.split(dayPattern).filter(Boolean);

  if (parts.length > 1) {
    let dayIndex = 0;
    const labels = ["1일차", "2일차", "3일차"];
    for (let i = 1; i < parts.length; i += 2) {
      const body = parts[i]?.trim();
      if (!body) continue;
      days.push({
        label: labels[dayIndex] ?? `${dayIndex + 1}일차`,
        items: body
          .split(/(?<=[.!?])\s+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 8)
          .slice(0, 5),
      });
      dayIndex += 1;
    }
  }

  const tipMatch = plain.match(/여행\s*팁|팁\s*[:：]/i);
  if (tipMatch?.index != null) {
    const tipBody = plain.slice(tipMatch.index);
    tipBody
      .split(/\n|(?<=[.!?])\s+/)
      .map((line) => line.replace(/^[*·\s]+/, "").trim())
      .filter((line) => line.length > 6 && !/여행\s*팁/i.test(line))
      .slice(0, 4)
      .forEach((line) => tips.push(line));
  }

  if (days.length === 0 && tips.length === 0) {
    return {
      headline,
      days: [],
      tips: plain
        .split(/\n+/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .slice(0, 6),
    };
  }

  return { headline, days, tips };
}
