import { readFile } from "node:fs/promises";

import { LexicalSearchIndex } from "../src/lib/retrieval/lexical";

import type { DocumentChunk } from "../src/types/docs";

type IngestionData = {
  chunks: DocumentChunk[];
};

async function main() {
  const query = process.argv
    .slice(2)
    .join(" ")
    .trim();

  if (!query) {
    console.error(
      'Usage: npm run docs:search -- "your query"',
    );

    process.exitCode = 1;
    return;
  }

  const raw = await readFile(
    ".data/liara-docs.json",
    "utf8",
  );

  const data = JSON.parse(raw) as IngestionData;

  console.log(
    `Indexing ${data.chunks.length} chunks...`,
  );

  const index = new LexicalSearchIndex(
    data.chunks,
  );

  const results = index.search(query, 5);

  console.log("");
  console.log(`Query: ${query}`);
  console.log("");

  if (results.length === 0) {
    console.log("No results.");
    return;
  }

  results.forEach((result, index) => {
    const chunk = result.chunk;

    const preview = chunk.content
      .replace(/\s+/g, " ")
      .slice(0, 300);

    console.log(
      `===== RESULT ${index + 1} =====`,
    );

    console.log(
      `Score: ${result.score.toFixed(3)}`,
    );

    console.log(
      `Matched: ${result.matchedTokens.join(", ")}`,
    );

    console.log(
      `Document: ${chunk.documentTitle}`,
    );

    console.log(
      `Heading: ${chunk.headingPath.join(" > ")}`,
    );

    console.log(
      `Service: ${chunk.service}`,
    );

    console.log(
      `Platform: ${chunk.platform ?? "-"}`,
    );

    console.log(
      `Path: ${chunk.documentPath}`,
    );

    console.log(
      `Source: ${chunk.sourceUrl}`,
    );

    console.log(`Preview: ${preview}`);
    console.log("");
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
