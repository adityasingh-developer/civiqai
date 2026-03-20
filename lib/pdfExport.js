import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb } from "pdf-lib";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 48;
const MARGIN_TOP = 52;
const MARGIN_BOTTOM = 52;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

let fontBytesPromise = null;

function sanitizeFileName(value) {
  return (value || "saved-message")
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

function normalizeInlineMarkdown(text) {
  return `${text || ""}`
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .trim();
}

function wrapText(text, font, size, maxWidth) {
  const words = `${text || ""}`.split(/\s+/).filter(Boolean);

  if (!words.length) {
    return [""];
  }

  const lines = [];
  let currentLine = words[0];

  for (let index = 1; index < words.length; index += 1) {
    const candidate = `${currentLine} ${words[index]}`;

    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      currentLine = candidate;
      continue;
    }

    lines.push(currentLine);
    currentLine = words[index];
  }

  lines.push(currentLine);
  return lines;
}

function splitMarkdownBlocks(text) {
  return `${text || ""}`.replace(/\r\n/g, "\n").split("\n");
}

function buildMessageBlocks(message) {
  const lines = splitMarkdownBlocks(message?.text);

  return lines.map((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      return { type: "space" };
    }

    if (trimmed.startsWith("### ")) {
      return { type: "heading", level: 3, text: trimmed.slice(4) };
    }

    if (trimmed.startsWith("## ")) {
      return { type: "heading", level: 2, text: trimmed.slice(3) };
    }

    if (trimmed.startsWith("# ")) {
      return { type: "heading", level: 1, text: trimmed.slice(2) };
    }

    if (/^[-*]\s+/.test(trimmed)) {
      return { type: "bullet", text: trimmed.replace(/^[-*]\s+/, "") };
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const match = trimmed.match(/^(\d+\.)\s+(.*)$/);
      return {
        type: "numbered",
        marker: match?.[1] || "1.",
        text: match?.[2] || trimmed,
      };
    }

    return { type: "paragraph", text: trimmed };
  });
}

function downloadPdf(bytes, filename) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function loadFontBytes() {
  if (!fontBytesPromise) {
    fontBytesPromise = Promise.all([
      fetch("/fonts/Nirmala.ttf").then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load Nirmala.ttf");
        }

        return response.arrayBuffer();
      }),
      fetch("/fonts/NirmalaB.ttf").then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load NirmalaB.ttf");
        }

        return response.arrayBuffer();
      }),
    ]);
  }

  return fontBytesPromise;
}

export async function exportSavedMessagePdf(message) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  const [regularFontBytes, boldFontBytes] = await loadFontBytes();
  const regularFont = await pdf.embedFont(regularFontBytes);
  const boldFont = await pdf.embedFont(boldFontBytes);
  const mutedColor = rgb(0.35, 0.35, 0.35);
  const textColor = rgb(0.08, 0.08, 0.08);
  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let cursorY = PAGE_HEIGHT - MARGIN_TOP;

  const ensureSpace = (requiredHeight = 18) => {
    if (cursorY - requiredHeight >= MARGIN_BOTTOM) {
      return;
    }

    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    cursorY = PAGE_HEIGHT - MARGIN_TOP;
  };

  const drawLines = ({
    lines,
    font,
    size,
    lineHeight,
    indent = 0,
    color = textColor,
  }) => {
    lines.forEach((line) => {
      ensureSpace(lineHeight);
      page.drawText(line, {
        x: MARGIN_X + indent,
        y: cursorY,
        size,
        font,
        color,
      });
      cursorY -= lineHeight;
    });
  };

  const metaLines = [
    `Role: ${message.role === "assistant" ? "Assistant" : "You"}`,
    `Saved: ${new Date(message.createdAt || Date.now()).toLocaleString()}`,
  ];

  drawLines({
    lines: ["Saved Message Export"],
    font: boldFont,
    size: 20,
    lineHeight: 26,
  });

  cursorY -= 6;

  drawLines({
    lines: metaLines,
    font: regularFont,
    size: 10,
    lineHeight: 14,
    color: mutedColor,
  });

  cursorY -= 10;

  buildMessageBlocks(message).forEach((block) => {
    if (block.type === "space") {
      cursorY -= 8;
      return;
    }

    if (block.type === "heading") {
      const sizeByLevel = { 1: 18, 2: 16, 3: 14 };
      const headingSize = sizeByLevel[block.level] || 14;
      const lines = wrapText(
        normalizeInlineMarkdown(block.text),
        boldFont,
        headingSize,
        CONTENT_WIDTH
      );

      drawLines({
        lines,
        font: boldFont,
        size: headingSize,
        lineHeight: headingSize + 6,
      });
      cursorY -= 4;
      return;
    }

    if (block.type === "bullet" || block.type === "numbered") {
      const marker = block.type === "bullet" ? "-" : block.marker;
      const markerWidth = regularFont.widthOfTextAtSize(marker, 12);
      const lines = wrapText(
        normalizeInlineMarkdown(block.text),
        regularFont,
        12,
        CONTENT_WIDTH - 20
      );

      ensureSpace(18);
      page.drawText(marker, {
        x: MARGIN_X,
        y: cursorY,
        size: 12,
        font: regularFont,
        color: textColor,
      });

      drawLines({
        lines,
        font: regularFont,
        size: 12,
        lineHeight: 18,
        indent: markerWidth + 8,
      });
      cursorY -= 2;
      return;
    }

    const lines = wrapText(
      normalizeInlineMarkdown(block.text),
      regularFont,
      12,
      CONTENT_WIDTH
    );

    drawLines({
      lines,
      font: regularFont,
      size: 12,
      lineHeight: 18,
    });
    cursorY -= 2;
  });

  const bytes = await pdf.save();
  const timestamp = new Date(message.createdAt || Date.now())
    .toISOString()
    .slice(0, 10);
  const prefix = message.role === "assistant" ? "assistant" : "user";
  const filename = `${prefix}-${sanitizeFileName(message.text?.slice(0, 30) || "message")}-${timestamp}.pdf`;

  downloadPdf(bytes, filename);
}
