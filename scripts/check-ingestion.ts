import { readFile } from "node:fs/promises";

import type { DocumentChunk } from "../src/types/docs";

type IngestionData = {
  stats: {
    discoveredDocuments: number;
    processedDocuments: number;
    chunks: number;
    failures: number;
  };
  chunks: DocumentChunk[];
  failures: unknown[];
};

const MAX_CHUNK_CHARS = 3_200;

async function main() {
  const raw = await readFile(
    ".data/liara-docs.json",
    "utf8",
  );

  const data = JSON.parse(raw) as IngestionData;

  const chunks = data.chunks;

  const lengths = chunks
    .map((chunk) => chunk.content.length)
    .sort((a, b) => a - b);

  const percentile = (value: number) => {
    if (lengths.length === 0) {
      return 0;
    }

    const index = Math.floor(
      (lengths.length - 1) * value,
    );

    return lengths[index];
  };

  const ids = chunks.map((chunk) => chunk.id);

  const duplicateIds =
    ids.length - new Set(ids).size;

  const oversized = chunks.filter(
    (chunk) =>
      chunk.content.length > MAX_CHUNK_CHARS,
  );

  const emptyHeadings = chunks.filter(
    (chunk) => chunk.headingPath.length === 0,
  );

  const tiny = chunks.filter(
    (chunk) => chunk.content.length < 80,
  );

  console.log("===== INGESTION QUALITY =====");

  console.log({
    documents: data.stats.processedDocuments,
    chunks: chunks.length,
    failures: data.stats.failures,
    minLength: lengths[0] ?? 0,
    maxLength: lengths.at(-1) ?? 0,
    averageLength:
      lengths.length === 0
        ? 0
        : Math.round(
            lengths.reduce(
              (sum, length) => sum + length,
              0,
            ) / lengths.length,
          ),
    p50: percentile(0.5),
    p90: percentile(0.9),
    p95: percentile(0.95),
    p99: percentile(0.99),
    oversized: oversized.length,
    emptyHeadings: emptyHeadings.length,
    duplicateIds,
    tinyChunks: tiny.length,
  });

  const errors: string[] = [];

  if (data.stats.failures > 0) {
    errors.push(
      `${data.stats.failures} documents failed ingestion`,
    );
  }

  if (oversized.length > 0) {
    errors.push(
      `${oversized.length} chunks exceed ${MAX_CHUNK_CHARS} characters`,
    );
  }

  if (emptyHeadings.length > 0) {
    errors.push(
      `${emptyHeadings.length} chunks have no heading`,
    );
  }

  if (duplicateIds > 0) {
    errors.push(
      `${duplicateIds} duplicate chunk IDs found`,
    );
  }

  if (errors.length > 0) {
    console.error("\n===== FAILED =====");

    for (const error of errors) {
      console.error(`- ${error}`);
    }

    process.exitCode = 1;

    return;
  }

  console.log("\nQuality checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
