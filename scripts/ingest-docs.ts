import { mkdir, writeFile } from "node:fs/promises";

import {
  discoverDocuments,
  loadDocument,
} from "../src/lib/docs/loader";

import { parseMarkdownSections } from "../src/lib/docs/parser";

import { createDocumentChunks } from "../src/lib/docs/chunker";

import type {
  DocumentChunk,
  LiaraDocument,
} from "../src/types/docs";

const OUTPUT_DIRECTORY = ".data";
const OUTPUT_FILE = `${OUTPUT_DIRECTORY}/liara-docs.json`;

function readPositiveInteger(
  value: string | undefined,
  fallback: number,
): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

async function main() {
  console.log("Discovering Liara documentation...");

  const discovered = await discoverDocuments();

  const requestedLimit = readPositiveInteger(
    process.env.DOCS_LIMIT,
    discovered.length,
  );

  const selected = discovered.slice(0, requestedLimit);

  const concurrency = Math.min(
    readPositiveInteger(process.env.DOCS_CONCURRENCY, 6),
    selected.length,
  );

  console.log(`Found ${discovered.length} documents.`);
  console.log(`Processing ${selected.length} documents.`);
  console.log(`Concurrency: ${concurrency}`);

  const documents: LiaraDocument[] = [];
  const chunks: DocumentChunk[] = [];
  const failures: Array<{
    url: string;
    error: string;
  }> = [];

  let cursor = 0;

  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;

      if (index >= selected.length) {
        return;
      }

      const link = selected[index];

      try {
        const document = await loadDocument(link);

        const sections = parseMarkdownSections(document.markdown);

        const documentChunks = createDocumentChunks(
          document,
          sections,
        );

        documents.push(document);
        chunks.push(...documentChunks);

        console.log(
          `[${index + 1}/${selected.length}] ${document.title} -> ${documentChunks.length} chunks`,
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);

        failures.push({
          url: link.llmUrl,
          error: message,
        });

        console.error(
          `[${index + 1}/${selected.length}] FAILED ${link.llmUrl}: ${message}`,
        );
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: concurrency },
      () => worker(),
    ),
  );

  documents.sort((a, b) =>
    a.documentPath.localeCompare(b.documentPath),
  );

  chunks.sort((a, b) =>
    a.id.localeCompare(b.id),
  );

  await mkdir(OUTPUT_DIRECTORY, {
    recursive: true,
  });

  const result = {
    generatedAt: new Date().toISOString(),
    source: "https://docs.liara.ir/all-links-llms.txt",
    stats: {
      discoveredDocuments: discovered.length,
      processedDocuments: documents.length,
      chunks: chunks.length,
      failures: failures.length,
    },
    documents: documents.map((document) => ({
      title: document.title,
      service: document.service,
      platform: document.platform,
      sourceUrl: document.sourceUrl,
      llmUrl: document.llmUrl,
      documentPath: document.documentPath,
    })),
    chunks,
    failures,
  };

  await writeFile(
    OUTPUT_FILE,
    `${JSON.stringify(result, null, 2)}\n`,
    "utf8",
  );

  console.log("");
  console.log("Ingestion finished.");
  console.log(`Documents: ${documents.length}`);
  console.log(`Chunks: ${chunks.length}`);
  console.log(`Failures: ${failures.length}`);
  console.log(`Output: ${OUTPUT_FILE}`);

  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
