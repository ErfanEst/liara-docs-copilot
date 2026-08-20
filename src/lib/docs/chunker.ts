import { createHash } from "node:crypto";

import type {
  DocumentChunk,
  DocumentContentType,
  LiaraDocument,
  ParsedSection,
} from "../../types/docs";

const MAX_CHUNK_CHARS = 3_200;

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function isIgnorableChunk(content: string): boolean {
  const value = content.trim();

  if (!value) {
    return true;
  }

  // Ignore chunks made only from markdown separators
  // and relative navigation links.
  const meaningfulLines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^-{3,}$/.test(line))
    .filter(
      (line) =>
        !/^\[\.[^\]]+\]$/.test(line) &&
        !/^\[\.[^\]]+\]\(\.[^)]+\)$/.test(line) &&
        !/^[-*]?\s*\[[^\]]+\]\(\.[^)]+\)$/.test(line),
    );

  return meaningfulLines.length === 0;
}

function detectContentType(content: string): DocumentContentType {
  const trimmed = content.trim();

  const containsCode =
    trimmed.includes("```") || trimmed.includes("~~~");

  if (!containsCode) {
    return "text";
  }

  const onlyCode =
    (trimmed.startsWith("```") && trimmed.endsWith("```")) ||
    (trimmed.startsWith("~~~") && trimmed.endsWith("~~~"));

  return onlyCode ? "code" : "mixed";
}

function splitTextByLimit(
  value: string,
  maxLength: number,
): string[] {
  const chunks: string[] = [];

  let remaining = value.trim();

  while (remaining.length > maxLength) {
    let cutAt = remaining.lastIndexOf("\n", maxLength);

    if (cutAt < Math.floor(maxLength * 0.5)) {
      cutAt = remaining.lastIndexOf(" ", maxLength);
    }

    if (cutAt < Math.floor(maxLength * 0.5)) {
      cutAt = maxLength;
    }

    const part = remaining.slice(0, cutAt).trim();

    if (part) {
      chunks.push(part);
    }

    remaining = remaining.slice(cutAt).trim();
  }

  if (remaining) {
    chunks.push(remaining);
  }

  return chunks;
}

function splitOversizedBlock(block: string): string[] {
  if (block.length <= MAX_CHUNK_CHARS) {
    return [block];
  }

  const lines = block.split(/\r?\n/);

  const opening = lines[0]?.trim();

  const fence =
    opening?.startsWith("```")
      ? "```"
      : opening?.startsWith("~~~")
        ? "~~~"
        : undefined;

  if (!fence) {
    return splitTextByLimit(block, MAX_CHUNK_CHARS);
  }

  const openingLine = lines[0];

  const hasClosingFence =
    lines.length > 1 &&
    lines[lines.length - 1].trim().startsWith(fence);

  const closingLine = hasClosingFence
    ? lines[lines.length - 1]
    : fence;

  const bodyLines = hasClosingFence
    ? lines.slice(1, -1)
    : lines.slice(1);

  const body = bodyLines.join("\n");

  const overhead =
    openingLine.length +
    closingLine.length +
    2;

  const maxBodyLength = Math.max(
    500,
    MAX_CHUNK_CHARS - overhead,
  );

  return splitTextByLimit(
    body,
    maxBodyLength,
  ).map(
    (part) =>
      `${openingLine}\n${part}\n${closingLine}`,
  );
}

function splitIntoBlocks(content: string): string[] {
  const lines = content.split(/\r?\n/);

  const blocks: string[] = [];

  let current: string[] = [];
  let insideFence = false;
  let fenceMarker: "```" | "~~~" | undefined;

  const flush = () => {
    const block = current.join("\n").trim();

    if (block) {
      blocks.push(...splitOversizedBlock(block));
    }

    current = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!insideFence) {
      if (trimmed.startsWith("```")) {
        flush();

        insideFence = true;
        fenceMarker = "```";

        current.push(line);

        continue;
      }

      if (trimmed.startsWith("~~~")) {
        flush();

        insideFence = true;
        fenceMarker = "~~~";

        current.push(line);

        continue;
      }

      if (!trimmed) {
        flush();
        continue;
      }

      current.push(line);
      continue;
    }

    current.push(line);

    if (
      fenceMarker &&
      trimmed.startsWith(fenceMarker)
    ) {
      insideFence = false;
      fenceMarker = undefined;

      flush();
    }
  }

  flush();

  return blocks;
}

function splitSection(section: ParsedSection): string[] {
  const blocks = splitIntoBlocks(section.content);

  const chunks: string[] = [];

  let current = "";

  const flush = () => {
    const value = current.trim();

    if (value) {
      chunks.push(value);
    }

    current = "";
  };

  for (const block of blocks) {
    if (!current) {
      current = block;
      continue;
    }

    const candidate = `${current}\n\n${block}`;

    if (candidate.length <= MAX_CHUNK_CHARS) {
      current = candidate;
      continue;
    }

    flush();

    current = block;
  }

  flush();

  return chunks;
}

export function createDocumentChunks(
  document: LiaraDocument,
  sections: ParsedSection[],
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];

  const seen = new Set<string>();

  for (const section of sections) {
    const headingPath =
      section.headingPath.length > 0
        ? section.headingPath
        : [document.title];

    const parts = splitSection(section);

    for (const content of parts) {
      const normalizedContent = content.trim();

      if (isIgnorableChunk(normalizedContent)) {
        continue;
      }

      const contentHash = sha256(normalizedContent);

      const identity = [
        document.sourceUrl,
        headingPath.join(" > "),
        contentHash,
      ].join("\n");

      if (seen.has(identity)) {
        continue;
      }

      seen.add(identity);

      chunks.push({
        id: sha256(identity).slice(0, 24),
        documentTitle: document.title,
        service: document.service,
        platform: document.platform,
        headingPath,
        content: normalizedContent,
        contentType: detectContentType(
          normalizedContent,
        ),
        sourceUrl: document.sourceUrl,
        llmUrl: document.llmUrl,
        documentPath: document.documentPath,
        contentHash,
      });
    }
  }

  return chunks;
}
