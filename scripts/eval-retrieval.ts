import { readFile } from "node:fs/promises";

import { LexicalSearchIndex } from "../src/lib/retrieval/lexical";

import type { DocumentChunk } from "../src/types/docs";

type IngestionData = {
  chunks: DocumentChunk[];
};

type EvaluationCase = {
  query: string;
  expectedPaths: string[];
};

async function main() {
  const docsRaw = await readFile(
    ".data/liara-docs.json",
    "utf8",
  );

  const evalRaw = await readFile(
    "evals/retrieval-baseline.json",
    "utf8",
  );

  const data = JSON.parse(
    docsRaw,
  ) as IngestionData;

  const cases = JSON.parse(
    evalRaw,
  ) as EvaluationCase[];

  const index = new LexicalSearchIndex(
    data.chunks,
  );

  let hitsAt1 = 0;
  let hitsAt3 = 0;
  let hitsAt5 = 0;

  let reciprocalRankTotal = 0;

  console.log(
    "===== RETRIEVAL BASELINE =====",
  );

  for (const testCase of cases) {
    const results = index.search(
      testCase.query,
      5,
    );

    const rank = results.findIndex(
      (result) =>
        testCase.expectedPaths.includes(
          result.chunk.documentPath,
        ),
    );

    const humanRank =
      rank === -1 ? null : rank + 1;

    if (humanRank === 1) {
      hitsAt1 += 1;
    }

    if (
      humanRank !== null &&
      humanRank <= 3
    ) {
      hitsAt3 += 1;
    }

    if (
      humanRank !== null &&
      humanRank <= 5
    ) {
      hitsAt5 += 1;
    }

    if (humanRank !== null) {
      reciprocalRankTotal +=
        1 / humanRank;
    }

    console.log("");
    console.log(
      humanRank === null
        ? `❌ ${testCase.query}`
        : `✅ ${testCase.query}`,
    );

    console.log(
      `Expected rank: ${humanRank ?? "not in top 5"}`,
    );

    results.forEach((result, index) => {
      console.log(
        `  ${index + 1}. ${result.chunk.documentPath} (${result.score.toFixed(2)})`,
      );
    });
  }

  const count = cases.length;

  const recall1 = hitsAt1 / count;
  const recall3 = hitsAt3 / count;
  const recall5 = hitsAt5 / count;

  const mrr =
    reciprocalRankTotal / count;

  console.log("");
  console.log("===== METRICS =====");

  console.log(
    `Recall@1: ${(recall1 * 100).toFixed(1)}%`,
  );

  console.log(
    `Recall@3: ${(recall3 * 100).toFixed(1)}%`,
  );

  console.log(
    `Recall@5: ${(recall5 * 100).toFixed(1)}%`,
  );

  console.log(
    `MRR: ${mrr.toFixed(3)}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
