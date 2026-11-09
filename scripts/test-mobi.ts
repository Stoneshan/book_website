import { readFileSync } from "node:fs";
import { parseMobi } from "../src/lib/parsers/mobi";

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("usage: tsx scripts/test-mobi.ts <path-to.mobi>");
    process.exit(1);
  }

  const buffer = readFileSync(file);
  const format = process.argv[3] === "azw3" ? "azw3" : "mobi";
  const parsed = await parseMobi(buffer, file, format);
  console.log({
    title: parsed.title,
    author: parsed.author,
    chapters: parsed.chapters.length,
    words: parsed.wordCount,
    cover: parsed.cover ? `${parsed.cover.ext} ${parsed.cover.buffer.length} bytes` : null,
    firstTitles: parsed.chapters.slice(0, 5).map((chapter) => chapter.title),
    firstHtml: parsed.chapters[0]?.html.slice(0, 160),
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
