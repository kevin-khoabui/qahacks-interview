import type { ReactNode } from "react";

function renderInline(value: string): ReactNode[] {
  const parts = value.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${index}-${part}`}>{part.slice(2, -2)}</strong>;
    }
    return <span key={`${index}-${part}`}>{part}</span>;
  });
}

type Block =
  | { type: "paragraph"; text: string }
  | { type: "unordered"; items: string[] }
  | { type: "ordered"; items: string[] };

function parseBlocks(value: string): Block[] {
  const lines = value.replace(/\\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let listType: "unordered" | "ordered" | null = null;
  let listItems: string[] = [];

  const flushParagraph = () => {
    const text = paragraph.join(" ").trim();
    if (text) blocks.push({ type: "paragraph", text });
    paragraph = [];
  };

  const flushList = () => {
    if (listType && listItems.length) blocks.push({ type: listType, items: listItems });
    listType = null;
    listItems = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const unordered = line.match(/^[-*•]\s+(.+)$/);
    const ordered = line.match(/^\d+[.)]\s+(.+)$/);

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    if (unordered) {
      flushParagraph();
      if (listType !== "unordered") flushList();
      listType = "unordered";
      listItems.push(unordered[1]);
      continue;
    }

    if (ordered) {
      flushParagraph();
      if (listType !== "ordered") flushList();
      listType = "ordered";
      listItems.push(ordered[1]);
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  return blocks;
}

export function FormattedContent({ value, className = "" }: { value: string; className?: string }) {
  const blocks = parseBlocks(value);

  return (
    <div className={className}>
      {blocks.map((block, index) => {
        if (block.type === "unordered") {
          return <ul key={`ul-${index}`}>{block.items.map((item) => <li key={item}>{renderInline(item)}</li>)}</ul>;
        }
        if (block.type === "ordered") {
          return <ol key={`ol-${index}`}>{block.items.map((item) => <li key={item}>{renderInline(item)}</li>)}</ol>;
        }
        return <p key={`p-${index}`}>{renderInline(block.text)}</p>;
      })}
    </div>
  );
}
