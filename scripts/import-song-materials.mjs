import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";

const csvPath =
  process.argv[2] ??
  "/Users/snazzygarfield/Downloads/Snazzy Garfield - Song List Master.csv";
const songbookPath =
  process.argv[3] ?? "/Users/snazzygarfield/Downloads/SongbookPro Backup.sbpbackup";
const manifestPath = "public/song-library/songs.json";

function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeTitle(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/^\s*\[explicit\]\s*/i, "")
    .replace(/\((vibes?|vibes version|vibe version)\)/gi, "(vibes)")
    .replace(/\bprincipal wartz\b/gi, "")
    .replace(/[^a-z0-9]+/g, "");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(field);
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((cell) => cell.length > 0)) {
    rows.push(row);
  }

  const headers = rows.shift() ?? [];
  return rows.map((cells) =>
    Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]))
  );
}

function titleCaseSection(value) {
  const clean = value.replace(/^\[|\]$/g, "").trim();

  if (!clean) {
    return "Lyrics";
  }

  return clean
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function parseLyrics(rawLyrics) {
  const lines = String(rawLyrics ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd());

  const sections = [];
  let current = { label: "Lyrics", lines: [] };

  for (const line of lines) {
    const trimmed = line.trim();
    const sectionMatch = trimmed.match(/^\[([^\]]+)\]$/);

    if (sectionMatch) {
      if (current.lines.some((item) => item.trim().length > 0)) {
        sections.push(current);
      }
      current = {
        label: titleCaseSection(sectionMatch[1]),
        lines: []
      };
      continue;
    }

    current.lines.push(line);
  }

  if (current.lines.some((item) => item.trim().length > 0)) {
    sections.push(current);
  }

  return sections.map((section) => {
    const lines = [...section.lines];
    while (lines[0]?.trim() === "") {
      lines.shift();
    }
    while (lines.at(-1)?.trim() === "") {
      lines.pop();
    }
    return { ...section, lines };
  });
}

function parseTempo(value) {
  const tempo = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(tempo) ? tempo : null;
}

function parseSongbookBackup(path) {
  const text = execFileSync("unzip", ["-p", path, "dataFile.txt"], {
    encoding: "utf8"
  });
  const jsonText = text.split(/\r?\n/).slice(1).join("\n");
  const data = JSON.parse(jsonText);

  return data.songs.filter((song) => !song.Deleted);
}

function indexByTitle(rows, getTitle) {
  const index = new Map();

  for (const row of rows) {
    const key = normalizeTitle(getTitle(row));
    if (key && !index.has(key)) {
      index.set(key, row);
    }
  }

  return index;
}

function findTitleMatch(title, rows, index, getTitle) {
  const key = normalizeTitle(title);
  const direct = index.get(key);

  if (direct) {
    return direct;
  }

  return rows.find((row) => {
    const rowKey = normalizeTitle(getTitle(row));
    const shortest = Math.min(key.length, rowKey.length);

    if (shortest < 12) {
      return false;
    }

    return (
      (key.startsWith(rowKey) || rowKey.startsWith(key)) &&
      shortest / Math.max(key.length, rowKey.length) > 0.72
    );
  });
}

function referenceAudioPath(row) {
  return `/song-library-references/${slugify(row.Album || "singles")}/${slugify(
    row.Title
  )}.wav`;
}

const csvRows = parseCsv(await readFile(csvPath, "utf8")).filter((row) =>
  row.Title?.trim()
);
const songbookRows = parseSongbookBackup(songbookPath);
const songs = JSON.parse(await readFile(manifestPath, "utf8"));
const csvIndex = indexByTitle(csvRows, (row) => row.Title);
const songbookIndex = indexByTitle(songbookRows, (row) => row.name);

const usedCsvRows = new Set();
const usedSongbookRows = new Set();
const usedIds = new Set(songs.map((song) => song.id));

function enrichSong(song, csvRow, songbookRow) {
  if (csvRow) {
    usedCsvRows.add(csvRow);
  }
  if (songbookRow) {
    usedSongbookRows.add(songbookRow);
  }

  const title = csvRow?.Title?.trim() || song.title;
  const album = csvRow?.Album?.trim() || song.album || null;
  const bpm = parseTempo(csvRow?.BPM) ?? song.bpm ?? null;
  const key = csvRow?.Key?.trim() || song.key || null;
  const lyrics = csvRow?.Lyrics ? parseLyrics(csvRow.Lyrics) : song.lyrics;
  const referenceAudio = csvRow ? referenceAudioPath(csvRow) : song.referenceAudio ?? song.master ?? null;

  return {
    ...song,
    title,
    artist: songbookRow?.author || song.artist || "Snazzy Garfield",
    album,
    section: song.section ?? (album ? "released" : null),
    bpm,
    key,
    time: csvRow?.Time?.trim() || song.time || null,
    master: song.master ?? referenceAudio,
    referenceAudio,
    lyrics,
    chordPro: songbookRow?.content || song.chordPro || null,
    songbookProId: songbookRow?.Id ?? song.songbookProId ?? null
  };
}

const enrichedSongs = songs.map((song) =>
  enrichSong(
    song,
    findTitleMatch(song.title, csvRows, csvIndex, (row) => row.Title),
    findTitleMatch(song.title, songbookRows, songbookIndex, (row) => row.name)
  )
);

for (const csvRow of csvRows) {
  if (usedCsvRows.has(csvRow)) {
    continue;
  }

  let id = slugify(csvRow.Title);
  let suffix = 2;
  while (usedIds.has(id)) {
    id = `${slugify(csvRow.Title)}-${suffix}`;
    suffix += 1;
  }
  usedIds.add(id);

  const songbookRow = findTitleMatch(csvRow.Title, songbookRows, songbookIndex, (row) => row.name);
  enrichedSongs.push(
    enrichSong(
      {
        id,
        title: csvRow.Title.trim(),
        artist: "Snazzy Garfield",
        album: csvRow.Album?.trim() || null,
        section: "released",
        bpm: null,
        key: null,
        time: null,
        master: null,
        referenceAudio: null,
        lyrics: [],
        chordPro: null,
        songbookProId: null,
        stems: []
      },
      csvRow,
      songbookRow
    )
  );
}

for (const songbookRow of songbookRows) {
  if (usedSongbookRows.has(songbookRow)) {
    continue;
  }

  let id = slugify(songbookRow.name);
  let suffix = 2;
  while (usedIds.has(id)) {
    id = `${slugify(songbookRow.name)}-${suffix}`;
    suffix += 1;
  }
  usedIds.add(id);

  enrichedSongs.push(
    enrichSong(
      {
        id,
        title: songbookRow.name.trim(),
        artist: songbookRow.author || "Snazzy Garfield",
        album: "SongbookPro",
        section: "other",
        bpm: parseTempo(songbookRow.TempoInt),
        key: null,
        time: null,
        master: null,
        referenceAudio: null,
        lyrics: [],
        chordPro: null,
        songbookProId: null,
        stems: []
      },
      null,
      songbookRow
    )
  );
}

enrichedSongs.sort((a, b) => {
  const albumDelta = String(a.album ?? "").localeCompare(String(b.album ?? ""));
  return albumDelta || a.title.localeCompare(b.title);
});

await writeFile(manifestPath, `${JSON.stringify(enrichedSongs, null, 2)}\n`);

const lyricCount = enrichedSongs.filter((song) => song.lyrics?.length).length;
const chordCount = enrichedSongs.filter((song) => song.chordPro).length;
const referenceCount = enrichedSongs.filter((song) => song.referenceAudio).length;

console.log(`Songs: ${enrichedSongs.length}`);
console.log(`Lyrics: ${lyricCount}`);
console.log(`SongbookPro sheets: ${chordCount}`);
console.log(`Reference audio paths: ${referenceCount}`);
