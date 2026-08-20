import type { ParsedSection } from "../../types/docs";

export function parseMarkdownSections(markdown: string): ParsedSection[] {
  const lines = markdown.split(/\r?\n/);

  const sections: ParsedSection[] = [];

  const headings: string[] = [];

  let currentLines: string[] = [];
  let currentHeadingPath: string[] = [];
  let insideCodeFence = false;

  const flushSection = () => {
    const content = currentLines.join("\n").trim();

    if (content) {
      sections.push({
        headingPath: currentHeadingPath,
        content,
      });
    }

    currentLines = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
      insideCodeFence = !insideCodeFence;
      currentLines.push(line);
      continue;
    }

    if (!insideCodeFence) {
      const headingMatch = line.match(/^(#{1,6})\s+(.+?)\s*$/);

      if (headingMatch) {
        flushSection();

        const level = headingMatch[1].length;
        const title = headingMatch[2].trim();

        headings.length = level - 1;
        headings[level - 1] = title;

        currentHeadingPath = headings.filter(Boolean);

        continue;
      }
    }

    if (/^Original link:\s*/i.test(trimmed)) {
      continue;
    }

    currentLines.push(line);
  }

  flushSection();

  return sections.filter((section) => {
    const lastHeading =
      section.headingPath[section.headingPath.length - 1]?.toLowerCase();

    return lastHeading !== "all links";
  });
}
