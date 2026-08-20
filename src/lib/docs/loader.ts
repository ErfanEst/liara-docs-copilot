import type {
  LiaraDocument,
  LiaraDocumentLink,
} from "../../types/docs";

const ALL_LINKS_URL = "https://docs.liara.ir/all-links-llms.txt";

const KNOWN_PLATFORMS = new Set([
  "nextjs",
  "nodejs",
  "python",
  "django",
  "flask",
  "laravel",
  "php",
  "react",
  "vue",
  "angular",
  "dotnet",
  "go",
  "docker",
  "static",
  "wordpress",
]);

function removeBom(value: string): string {
  return value.replace(/^\uFEFF/, "");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url: string): Promise<string> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "liara-docs-copilot/0.1",
        },
        signal: AbortSignal.timeout(20_000),
      });

      if (!response.ok) {
        throw new Error(
          `Request failed: ${response.status} ${response.statusText}`,
        );
      }

      return removeBom(await response.text());
    } catch (error) {
      lastError = error;

      if (attempt < 3) {
        await delay(attempt * 500);
      }
    }
  }

  throw lastError;
}

function detectPlatform(documentPath: string): string | undefined {
  const segments = documentPath.toLowerCase().split("/");

  return segments.find((segment) => KNOWN_PLATFORMS.has(segment));
}

export async function discoverDocuments(): Promise<LiaraDocumentLink[]> {
  const markdown = await fetchText(ALL_LINKS_URL);

  const pattern =
    /^- \[([^\]]+)\]\((https:\/\/docs\.liara\.ir\/llms\/[^)\s]+\.md)\)\s*$/gm;

  const links = new Map<string, LiaraDocumentLink>();

  for (const match of markdown.matchAll(pattern)) {
    const title = match[1]?.trim();
    const llmUrl = match[2]?.trim();

    if (!title || !llmUrl) {
      continue;
    }

    links.set(llmUrl, {
      title,
      llmUrl,
    });
  }

  return [...links.values()];
}

export async function loadDocument(
  link: LiaraDocumentLink,
): Promise<LiaraDocument> {
  const markdown = await fetchText(link.llmUrl);

  const sourceUrlMatch = markdown.match(/^Original link:\s*(\S+)/m);

  const sourceUrl = sourceUrlMatch?.[1] ?? link.llmUrl;

  const url = new URL(link.llmUrl);

  const documentPath = url.pathname
    .replace(/^\/llms\//, "")
    .replace(/\.md$/, "");

  const [service = "unknown"] = documentPath.split("/");

  const headingMatch = markdown.match(/^#\s+(.+)$/m);

  return {
    title: headingMatch?.[1]?.trim() ?? link.title,
    llmUrl: link.llmUrl,
    sourceUrl,
    documentPath,
    service,
    platform: detectPlatform(documentPath),
    markdown,
  };
}
