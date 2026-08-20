import type { DocumentChunk } from "../../types/docs";

import {
  normalizeText,
  tokenize,
} from "./normalize";

type FieldName =
  | "title"
  | "heading"
  | "content"
  | "service"
  | "platform";

type IndexedChunk = {
  chunk: DocumentChunk;
  tokenCounts: Record<FieldName, Map<string, number>>;
  normalized: Record<FieldName, string>;
};

export type LexicalSearchResult = {
  chunk: DocumentChunk;
  score: number;
  matchedTokens: string[];
};

const FIELD_BOOSTS: Record<FieldName, number> = {
  title: 5,
  heading: 3.5,
  content: 1,
  service: 1.5,
  platform: 3,
};

const K1 = 1.2;

function countTokens(
  tokens: string[],
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const token of tokens) {
    counts.set(
      token,
      (counts.get(token) ?? 0) + 1,
    );
  }

  return counts;
}

function buildFields(
  chunk: DocumentChunk,
): Record<FieldName, string> {
  return {
    title: chunk.documentTitle,
    heading: chunk.headingPath.join(" "),
    content: chunk.content,
    service: chunk.service.replaceAll("-", " "),
    platform: chunk.platform ?? "",
  };
}

export class LexicalSearchIndex {
  private readonly documents: IndexedChunk[];
  private readonly documentFrequency =
    new Map<string, number>();

  constructor(chunks: DocumentChunk[]) {
    this.documents = chunks.map((chunk) => {
      const fields = buildFields(chunk);

      const tokenCounts = {
        title: countTokens(tokenize(fields.title)),
        heading: countTokens(tokenize(fields.heading)),
        content: countTokens(tokenize(fields.content)),
        service: countTokens(tokenize(fields.service)),
        platform: countTokens(tokenize(fields.platform)),
      };

      const normalized = {
        title: normalizeText(fields.title),
        heading: normalizeText(fields.heading),
        content: normalizeText(fields.content),
        service: normalizeText(fields.service),
        platform: normalizeText(fields.platform),
      };

      const allTokens = new Set<string>();

      for (const counts of Object.values(tokenCounts)) {
        for (const token of counts.keys()) {
          allTokens.add(token);
        }
      }

      for (const token of allTokens) {
        this.documentFrequency.set(
          token,
          (this.documentFrequency.get(token) ?? 0) + 1,
        );
      }

      return {
        chunk,
        tokenCounts,
        normalized,
      };
    });
  }

  search(
    query: string,
    limit = 5,
  ): LexicalSearchResult[] {
    const queryTokens = [
      ...new Set(tokenize(query)),
    ];

    if (queryTokens.length === 0) {
      return [];
    }

    const totalDocuments = this.documents.length;

    const results: LexicalSearchResult[] = [];

    for (const document of this.documents) {
      let score = 0;

      const matchedTokens = new Set<string>();

      for (const token of queryTokens) {
        const frequency =
          this.documentFrequency.get(token) ?? 0;

        if (frequency === 0) {
          continue;
        }

        const idf = Math.log(
          1 +
            (totalDocuments - frequency + 0.5) /
              (frequency + 0.5),
        );

        for (const field of Object.keys(
          FIELD_BOOSTS,
        ) as FieldName[]) {
          const termFrequency =
            document.tokenCounts[field].get(token) ??
            0;

          if (termFrequency === 0) {
            continue;
          }

          matchedTokens.add(token);

          const saturation =
            (termFrequency * (K1 + 1)) /
            (termFrequency + K1);

          score +=
            FIELD_BOOSTS[field] *
            idf *
            saturation;
        }
      }

      if (score <= 0) {
        continue;
      }

      const coverage =
        matchedTokens.size /
        queryTokens.length;

      score += coverage * 4;

      const titleTokens =
        document.tokenCounts.title;

      const headingTokens =
        document.tokenCounts.heading;

      const allInTitle = queryTokens.every(
        (token) => titleTokens.has(token),
      );

      const allInHeading = queryTokens.every(
        (token) => headingTokens.has(token),
      );

      if (allInTitle) {
        score += 12;
      } else if (allInHeading) {
        score += 8;
      }

      results.push({
        chunk: document.chunk,
        score,
        matchedTokens: [...matchedTokens],
      });
    }

    const sortedResults = results.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.chunk.documentPath.localeCompare(
        b.chunk.documentPath,
      );
    });

    const diversified: LexicalSearchResult[] = [];
    const seenDocumentPaths = new Set<string>();

    for (const result of sortedResults) {
      if (
        seenDocumentPaths.has(
          result.chunk.documentPath,
        )
      ) {
        continue;
      }

      seenDocumentPaths.add(
        result.chunk.documentPath,
      );

      diversified.push(result);

      if (diversified.length >= limit) {
        break;
      }
    }

    return diversified;
  }
}
