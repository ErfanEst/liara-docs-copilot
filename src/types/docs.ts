export type DocumentContentType = "text" | "code" | "mixed";

export type LiaraDocumentLink = {
  title: string;
  llmUrl: string;
};

export type LiaraDocument = {
  title: string;
  llmUrl: string;
  sourceUrl: string;
  documentPath: string;
  service: string;
  platform?: string;
  markdown: string;
};

export type ParsedSection = {
  headingPath: string[];
  content: string;
};

export type DocumentChunk = {
  id: string;
  documentTitle: string;
  service: string;
  platform?: string;
  headingPath: string[];
  content: string;
  contentType: DocumentContentType;
  sourceUrl: string;
  llmUrl: string;
  documentPath: string;
  contentHash: string;
};
