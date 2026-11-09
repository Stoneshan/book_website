import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const PAGE_WIDTH = 432;
const PAGE_HEIGHT = 648;
const MARGIN = 52;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const ink = rgb(0.16, 0.13, 0.1);
const softInk = rgb(0.36, 0.31, 0.25);
const accent = rgb(0.64, 0.23, 0.17);
const paper = rgb(0.985, 0.965, 0.93);
const line = rgb(0.85, 0.8, 0.71);

const fables = [
  {
    title: "The Fox and the Grapes",
    body: [
      "A hungry fox saw some fine bunches of grapes hanging from a vine that was trained along a high trellis, and did his best to reach them by jumping as high as he could into the air.",
      "But it was all in vain, for they were just out of reach. So he gave up trying, and walked away with an air of dignity and unconcern, remarking, “I thought those grapes were ripe, but I see now they are quite sour.”",
    ],
    moral: "It is easy to despise what you cannot get.",
  },
  {
    title: "The Tortoise and the Hare",
    body: [
      "A hare one day ridiculed the short feet and slow pace of the tortoise, who replied, laughing: “Though you be swift as the wind, I will beat you in a race.”",
      "The hare, believing the tortoise’s assertion to be simply impossible, assented to the proposal; and they agreed that the fox should choose the course and fix the goal.",
      "On the day appointed the two started together. The tortoise never for a moment stopped, but went on with a slow but steady pace straight to the end of the course. The hare, lying down by the wayside, fell fast asleep. At last waking up, and moving as fast as he could, he saw the tortoise had reached the goal, and was comfortably dozing after her fatigue.",
    ],
    moral: "Slow but steady wins the race.",
  },
  {
    title: "The North Wind and the Sun",
    body: [
      "The North Wind and the Sun were disputing which was the stronger, when a traveller came along wrapped in a warm cloak. They agreed that the one who first succeeded in making the traveller take his cloak off should be considered stronger than the other.",
      "Then the North Wind blew as hard as he could, but the more he blew the more closely did the traveller fold his cloak around him; and at last the North Wind gave up the attempt.",
      "Then the Sun shone out warmly, and immediately the traveller took off his cloak. And so the North Wind was obliged to confess that the Sun was the stronger of the two.",
    ],
    moral: "Gentleness and kind persuasion win where force and bluster fail.",
  },
  {
    title: "The Crow and the Pitcher",
    body: [
      "A crow perishing with thirst saw a pitcher, and hoping to find water, flew to it with delight. When he reached it, he discovered to his grief that it contained so little water that he could not possibly get at it.",
      "He tried everything he could think of to reach the water, but all his efforts were in vain. At last he collected as many stones as he could carry and dropped them one by one with his beak into the pitcher, until he brought the water within his reach and thus saved his life.",
    ],
    moral: "Necessity is the mother of invention.",
  },
  {
    title: "The Lion and the Mouse",
    body: [
      "A lion was awakened from sleep by a mouse running over his face. Rising up angrily, he caught him and was about to kill him, when the mouse piteously entreated, saying: “If you would only spare my life, I would be sure to repay your kindness.” The lion laughed and let him go.",
      "It happened shortly after this that the lion was caught by some hunters, who bound him by strong ropes to the ground. The mouse, recognising his roar, came and gnawed the rope with his teeth, and set him free, exclaiming: “You ridiculed the idea of my ever being able to help you, not expecting to receive from me any repayment of your favour; but now you know that it is possible for even a mouse to confer benefits on a lion.”",
    ],
    moral: "Little friends may prove great friends.",
  },
];

function wrap(text, font, size, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

const document = await PDFDocument.create();
document.setTitle("Aesop's Fables — Selected Tales");
document.setAuthor("Aesop");
document.setSubject("Public domain sample for the Moyue PDF reader");
document.setCreator("Moyue demo generator");

const serif = await document.embedFont(StandardFonts.TimesRoman);
const serifItalic = await document.embedFont(StandardFonts.TimesRomanItalic);
const serifBold = await document.embedFont(StandardFonts.TimesRomanBold);

function newPage() {
  const page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: paper });
  page.drawRectangle({
    x: 24,
    y: 24,
    width: PAGE_WIDTH - 48,
    height: PAGE_HEIGHT - 48,
    borderColor: line,
    borderWidth: 0.8,
  });
  return page;
}

function drawFooter(page, index, total) {
  page.drawLine({
    start: { x: MARGIN, y: 44 },
    end: { x: PAGE_WIDTH - MARGIN, y: 44 },
    thickness: 0.5,
    color: line,
  });
  page.drawText("MOYUE · ONLINE LIBRARY", {
    x: MARGIN,
    y: 30,
    size: 6.5,
    font: serif,
    color: softInk,
    characterSpacing: 1.4,
  });
  const label = `${index} / ${total}`;
  page.drawText(label, {
    x: PAGE_WIDTH - MARGIN - serif.widthOfTextAtSize(label, 7),
    y: 30,
    size: 7,
    font: serif,
    color: softInk,
  });
}

const titlePage = newPage();
titlePage.drawText("SELECTED TALES", {
  x: MARGIN,
  y: 548,
  size: 9,
  font: serif,
  color: accent,
  characterSpacing: 3.2,
});
titlePage.drawText("Aesop’s", {
  x: MARGIN,
  y: 462,
  size: 62,
  font: serifItalic,
  color: ink,
});
titlePage.drawText("Fables", {
  x: MARGIN,
  y: 396,
  size: 62,
  font: serifItalic,
  color: ink,
});
titlePage.drawLine({
  start: { x: MARGIN, y: 350 },
  end: { x: PAGE_WIDTH - MARGIN, y: 350 },
  thickness: 0.8,
  color: line,
});
titlePage.drawText(
  "Five familiar fables, set in a quiet page for the Moyue PDF reader.",
  {
    x: MARGIN,
    y: 322,
    size: 10.5,
    font: serif,
    color: softInk,
    lineHeight: 16,
    maxWidth: CONTENT_WIDTH,
  },
);
titlePage.drawText("AESOP", {
  x: MARGIN,
  y: 150,
  size: 10,
  font: serifBold,
  color: softInk,
  characterSpacing: 2.4,
});
titlePage.drawRectangle({
  x: PAGE_WIDTH - MARGIN - 26,
  y: 140,
  width: 26,
  height: 26,
  color: accent,
});
titlePage.drawText("M", {
  x: PAGE_WIDTH - MARGIN - 26 + 7,
  y: 147,
  size: 13,
  font: serif,
  color: paper,
});
drawFooter(titlePage, 1, fables.length + 1);

let pageNumber = 2;
for (const fable of fables) {
  const page = newPage();
  page.drawText(fable.title, {
    x: MARGIN,
    y: PAGE_HEIGHT - 132,
    size: 23,
    font: serifBold,
    color: ink,
    maxWidth: CONTENT_WIDTH,
  });
  page.drawText("A FABLE FROM AESOP", {
    x: MARGIN,
    y: PAGE_HEIGHT - 154,
    size: 7,
    font: serif,
    color: accent,
    characterSpacing: 2.2,
  });
  page.drawLine({
    start: { x: MARGIN, y: PAGE_HEIGHT - 170 },
    end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - 170 },
    thickness: 0.6,
    color: line,
  });

  let y = PAGE_HEIGHT - 200;
  for (const paragraph of fable.body) {
    const lines = wrap(paragraph, serif, 11.5, CONTENT_WIDTH);
    for (const textLine of lines) {
      page.drawText(textLine, {
        x: MARGIN,
        y,
        size: 11.5,
        font: serif,
        color: ink,
        lineHeight: 17,
      });
      y -= 17;
    }
    y -= 11;
  }

  y -= 8;
  page.drawLine({
    start: { x: MARGIN, y: y + 6 },
    end: { x: MARGIN + 34, y: y + 6 },
    thickness: 1,
    color: accent,
  });
  y -= 16;
  const moralLines = wrap(`Moral: ${fable.moral}`, serifItalic, 10.5, CONTENT_WIDTH);
  for (const textLine of moralLines) {
    page.drawText(textLine, {
      x: MARGIN,
      y,
      size: 10.5,
      font: serifItalic,
      color: softInk,
      lineHeight: 15,
    });
    y -= 15;
  }

  drawFooter(page, pageNumber, fables.length + 1);
  pageNumber += 1;
}

const bytes = await document.save();
const output = path.join(process.cwd(), "public", "demo", "sample.pdf");
mkdirSync(path.dirname(output), { recursive: true });
writeFileSync(output, bytes);
console.log(`[demo] wrote ${output} (${(bytes.length / 1024).toFixed(1)} KB)`);
