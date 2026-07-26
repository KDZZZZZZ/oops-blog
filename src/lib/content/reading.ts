export interface ReadingStats {
  /** CJK characters plus latin words, i.e. "how much there is to read". */
  characters: number;
  /** Rounded minutes, never below 1. */
  minutes: number;
}

const CJK_PATTERN = /[぀-ヿ㐀-䶿一-鿿豈-﫿]/g;
const LATIN_WORD_PATTERN = /[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g;

/** Chinese reading speed is counted per character, latin per word. */
const CJK_PER_MINUTE = 480;
const LATIN_WORDS_PER_MINUTE = 220;

export function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/^---\r?\n[\s\S]*?\r?\n---/, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/~~~[\s\S]*?~~~/g, " ")
    .replace(/`[^`\n]*`/g, " ")
    .replace(/\$\$[\s\S]*?\$\$/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^\s{0,3}[#>]+\s*/gm, " ")
    .replace(/[*_~|]/g, " ");
}

export function estimateReadingStats(markdown: string): ReadingStats {
  const text = stripMarkdown(markdown);
  const cjkCount = text.match(CJK_PATTERN)?.length ?? 0;
  const latinCount = text.replace(CJK_PATTERN, " ").match(LATIN_WORD_PATTERN)?.length ?? 0;

  return {
    characters: cjkCount + latinCount,
    minutes: Math.max(
      1,
      Math.round(cjkCount / CJK_PER_MINUTE + latinCount / LATIN_WORDS_PER_MINUTE),
    ),
  };
}

export function formatCharacterCount(characters: number): string {
  if (characters < 1000) return `${characters} 字`;
  return `${(characters / 1000).toFixed(1)} 千字`;
}
