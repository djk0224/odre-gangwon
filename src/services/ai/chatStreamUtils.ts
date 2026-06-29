/** UI 타이핑 효과용 텍스트 청크 */
export async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function* chunkText(text: string, chunkSize = 6): AsyncGenerator<string> {
  for (let i = 0; i < text.length; i += chunkSize) {
    yield text.slice(i, i + chunkSize);
    await delay(14);
  }
}

export function encodeStreamLine(event: unknown): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`);
}
