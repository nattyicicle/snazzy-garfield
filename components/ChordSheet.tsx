type ChordSheetProps = {
  content: string;
};

type SheetLine =
  | {
      kind: "section";
      label: string;
    }
  | {
      kind: "tab";
      lines: string[];
    }
  | {
      kind: "lyrics";
      parts: ChordPart[];
    };

type ChordPart = {
  chord?: string;
  text: string;
};

const chordPattern =
  /^[A-G](?:#|b|♭|♯)?(?:m|maj|min|dim|aug|sus|add)?[0-9]*(?:[#b♭♯]?[0-9]+)*(?:\/[A-G](?:#|b|♭|♯)?)?$/i;

function prettifySection(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function directiveLabel(line: string) {
  const directive = line.match(/^\{([^}:]+)(?::\s*(.*?))?\}$/);

  if (!directive) {
    return null;
  }

  const name = directive[1].toLowerCase();
  const value = directive[2]?.trim();

  if (name === "comment" || name === "c") {
    return value ? prettifySection(value) : null;
  }

  if (name.startsWith("start_of_")) {
    return value ? prettifySection(value) : prettifySection(name.slice(9));
  }

  return null;
}

function isIgnoredDirective(line: string) {
  return /^\{(?:title|key|tempo|time|artist|subtitle|end_of_[^}]+)\b/i.test(
    line
  );
}

function isChord(value: string) {
  return chordPattern.test(value.trim());
}

function isPlainSectionHeading(value: string) {
  return /^(?:intro|verse|pre-chorus|pre chorus|chorus|refrain|hook|bridge|solo|instrumental|interlude|turnaround|outro|final chorus|riff)(?:\s+\d+)?$/i.test(
    value.trim()
  );
}

function parseChordLine(line: string): ChordPart[] {
  const parts: ChordPart[] = [];
  const chordMatches = [...line.matchAll(/\[([^\]]+)\]/g)];

  if (chordMatches.length === 0) {
    return [{ text: line }];
  }

  let plainText = line.slice(0, chordMatches[0].index);

  if (plainText) {
    parts.push({ text: plainText });
  }

  for (let index = 0; index < chordMatches.length; index += 1) {
    const match = chordMatches[index];
    const chord = match[1].trim();
    const textStart = (match.index ?? 0) + match[0].length;
    const textEnd =
      index + 1 < chordMatches.length
        ? chordMatches[index + 1].index ?? line.length
        : line.length;
    const text = line.slice(textStart, textEnd);

    if (isChord(chord)) {
      parts.push({ chord, text });
    } else {
      parts.push({ text: `${match[0]}${text}` });
    }
  }

  return parts.length > 0 ? parts : [{ text: "" }];
}

function parseChordSheet(content: string): SheetLine[] {
  const rows = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const lines: SheetLine[] = [];
  let tabLines: string[] | null = null;

  for (const rawLine of rows) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (trimmed === "{sot}") {
      tabLines = [];
      continue;
    }

    if (trimmed === "{eot}") {
      lines.push({ kind: "tab", lines: tabLines ?? [] });
      tabLines = null;
      continue;
    }

    if (tabLines) {
      tabLines.push(line);
      continue;
    }

    const label = directiveLabel(trimmed);

    if (label) {
      lines.push({ kind: "section", label });
      continue;
    }

    if (isIgnoredDirective(trimmed)) {
      continue;
    }

    const bracketLabel = trimmed.match(/^\[([^\]]+)\]$/);

    if (bracketLabel && !isChord(bracketLabel[1])) {
      lines.push({ kind: "section", label: prettifySection(bracketLabel[1]) });
      continue;
    }

    if (line === trimmed && isPlainSectionHeading(trimmed)) {
      lines.push({ kind: "section", label: prettifySection(trimmed) });
      continue;
    }

    lines.push({ kind: "lyrics", parts: parseChordLine(line) });
  }

  return lines;
}

function ChordLyricLine({ parts }: { parts: ChordPart[] }) {
  const isBlank = parts.every((part) => part.text.trim() === "" && !part.chord);

  if (isBlank) {
    return <div className="h-4" aria-hidden="true" />;
  }

  return (
    <div className="whitespace-pre-wrap break-words text-[0.95rem] leading-8 text-stone-100">
      {parts.map((part, index) =>
        part.chord ? (
          <span
            key={`${part.chord}-${index}`}
            className="mr-0.5 inline-flex min-w-[1.75ch] flex-col align-bottom"
            style={{
              minWidth: `${Math.max(part.chord.length, part.text.length, 2)}ch`
            }}
          >
            <span className="font-mono text-xs font-bold leading-4 text-amberline">
              {part.chord}
            </span>
            <span className="leading-5">{part.text || "\u00a0"}</span>
          </span>
        ) : (
          <span key={`text-${index}`}>{part.text}</span>
        )
      )}
    </div>
  );
}

export function ChordSheet({ content }: ChordSheetProps) {
  const lines = parseChordSheet(content);

  return (
    <div className="max-h-[48rem] overflow-auto rounded border border-white/10 bg-black/25 p-4">
      <div className="flex min-w-0 flex-col gap-1">
        {lines.map((line, index) => {
          if (line.kind === "section") {
            return (
              <h3
                key={`${line.label}-${index}`}
                className="mt-4 first:mt-0 text-xs font-semibold uppercase tracking-wide text-amberline"
              >
                {line.label}
              </h3>
            );
          }

          if (line.kind === "tab") {
            return (
              <pre
                key={`tab-${index}`}
                className="my-2 overflow-auto rounded border border-white/10 bg-black/30 p-3 font-mono text-xs leading-5 text-stone-200"
              >
                {line.lines.join("\n")}
              </pre>
            );
          }

          return <ChordLyricLine key={`line-${index}`} parts={line.parts} />;
        })}
      </div>
    </div>
  );
}
